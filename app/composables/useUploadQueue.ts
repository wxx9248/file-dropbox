import type { HttpRequest, HttpResponse, HttpStack } from "tus-js-client";
import * as tus from "tus-js-client";
import { useSettings } from "./useSettings";
import { formatFileSize } from "~/utils/format";

export type TaskStatus =
  | "queued"
  | "uploading"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled"
  | "interrupted";

export interface UploadTask {
  id: string;
  file: File | null;
  filename: string;
  size: number;
  status: TaskStatus;
  progress: number;
  bytesUploaded: number;
  error: string | null;
  retryCount: number;
  tusUpload: tus.Upload | null;
}

interface PersistedTask {
  id: string;
  filename: string;
  size: number;
  status: TaskStatus;
  progress: number;
  bytesUploaded: number;
  error: string | null;
  retryCount: number;
}

// Custom XHR-based HttpStack with timeout support
class XhrRequest implements HttpRequest {
  private readonly _xhr: XMLHttpRequest;
  private readonly _method: string;
  private readonly _url: string;
  private _headers: Record<string, string> = {};

  constructor(method: string, url: string, timeoutMs: number) {
    this._xhr = new XMLHttpRequest();
    this._xhr.open(method, url, true);
    this._xhr.timeout = timeoutMs;
    this._method = method;
    this._url = url;
  }

  getMethod() {
    return this._method;
  }
  getURL() {
    return this._url;
  }

  setHeader(header: string, value: string) {
    this._xhr.setRequestHeader(header, value);
    this._headers[header] = value;
  }

  getHeader(header: string) {
    return this._headers[header];
  }

  setProgressHandler(handler: (bytesSent: number) => void) {
    if ("upload" in this._xhr) {
      this._xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) handler(e.loaded);
      };
    }
  }

  send(body: any = null): Promise<HttpResponse> {
    return new Promise((resolve, reject) => {
      this._xhr.onload = () => {
        resolve(new XhrResponse(this._xhr));
      };
      this._xhr.onerror = (err) => {
        reject(err);
      };
      this._xhr.ontimeout = () => {
        reject(new Error("Request timed out"));
      };
      this._xhr.send(body);
    });
  }

  abort(): Promise<void> {
    this._xhr.abort();
    return Promise.resolve();
  }

  getUnderlyingObject() {
    return this._xhr;
  }
}

class XhrResponse implements HttpResponse {
  constructor(private _xhr: XMLHttpRequest) {}
  getStatus() {
    return this._xhr.status;
  }
  getHeader(header: string) {
    return this._xhr.getResponseHeader(header) ?? undefined;
  }
  getBody() {
    return this._xhr.responseText;
  }
  getUnderlyingObject() {
    return this._xhr;
  }
}

class HttpStackWithTimeout implements HttpStack {
  constructor(private _timeoutMs: number) {}
  createRequest(method: string, url: string): HttpRequest {
    return new XhrRequest(method, url, this._timeoutMs);
  }

  getName() {
    return "HttpStackWithTimeout";
  }
}

const STORAGE_KEY = "uploadQueue";

let _instance: ReturnType<typeof createUploadQueue> | null = null;

function createUploadQueue() {
  const tasks = ref<UploadTask[]>([]) as Ref<UploadTask[]>;
  const { settings } = useSettings();
  const toast = useToast();
  const runtimeConfig = useRuntimeConfig();
  const maxFileSize = runtimeConfig.public.maxFileSize as number;
  const baseURL = runtimeConfig.app.baseURL.replace(/\/$/, "");

  const hasVisibleTasks = computed(() => tasks.value.length > 0);

  // Debounced localStorage persistence
  let persistTimer: ReturnType<typeof setTimeout> | null = null;

  function persistTasks() {
    const persisted: PersistedTask[] = tasks.value.map((t) => ({
      id: t.id,
      filename: t.filename,
      size: t.size,
      status: t.status,
      progress: t.progress,
      bytesUploaded: t.bytesUploaded,
      error: t.error,
      retryCount: t.retryCount
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  }

  function persistNow() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = null;
    persistTasks();
  }

  function persistDebounced() {
    if (persistTimer) return;
    persistTimer = setTimeout(persistNow, 1000);
  }

  function onStatusChange() {
    persistNow();
    scheduleNext();
  }

  // Restore from localStorage
  function restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const persisted: PersistedTask[] = JSON.parse(raw);
      tasks.value = persisted
        .filter((p) => p.status !== "cancelled")
        .map((p) => ({
          ...p,
          status:
            p.status === "completed"
              ? "completed"
              : ("interrupted" as TaskStatus),
          file: null,
          tusUpload: null
        }));
    } catch {
      // Corrupted data — start fresh
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  restore();

  function createTusUpload(task: UploadTask): tus.Upload {
    return new tus.Upload(task.file!, {
      endpoint: `${baseURL}/api/tus`,
      chunkSize: settings.value.chunkSizeBytes,
      retryDelays: Array.from(
        { length: settings.value.autoRetryCount },
        (_, i) => Math.min(i * 2000, 10000)
      ),
      metadata: {
        filename: task.file!.name,
        filetype: task.file!.type || "application/octet-stream"
      },
      httpStack: new HttpStackWithTimeout(settings.value.connectionTimeoutMs),
      onProgress(bytesUploaded, bytesTotal) {
        task.bytesUploaded = bytesUploaded;
        task.progress = Math.round((bytesUploaded / bytesTotal) * 100);
        persistDebounced();
      },
      onSuccess() {
        task.status = "completed";
        task.progress = 100;
        task.tusUpload = null;
        onStatusChange();
      },
      onError(error) {
        task.status = "failed";
        task.error = error.message;
        task.tusUpload = null;
        toast.add({
          title: "Upload failed",
          description: `"${task.filename}" upload failed: ${error.message}`,
          color: "error"
        });
        onStatusChange();
      },
      onShouldRetry(_err, retryAttempt, _options) {
        task.retryCount = retryAttempt;
        return retryAttempt < settings.value.autoRetryCount;
      }
    });
  }

  function startUpload(task: UploadTask) {
    task.status = "uploading";
    task.error = null;
    if (!task.tusUpload) {
      task.tusUpload = createTusUpload(task);
    }
    task.tusUpload.start();
  }

  function scheduleNext() {
    const activeCount = tasks.value.filter(
      (t) => t.status === "uploading"
    ).length;
    let slots = settings.value.maxConcurrent - activeCount;
    if (slots <= 0) return;

    let startedAny = false;
    for (const task of tasks.value) {
      if (slots <= 0) break;
      if (task.status === "queued") {
        startUpload(task);
        --slots;
        startedAny = true;
      }
    }

    if (startedAny) {
      persistNow();
    }
  }

  // Watch maxConcurrent to schedule more when raised
  watch(
    () => settings.value.maxConcurrent,
    () => {
      scheduleNext();
    }
  );

  function addFiles(files: File[]) {
    const reattachedIds = new Set<string>();

    for (const file of files) {
      // Try to re-attach to an interrupted task
      const match = tasks.value.find(
        (t) =>
          t.status === "interrupted" &&
          t.filename === file.name &&
          t.size === file.size &&
          !reattachedIds.has(t.id)
      );

      if (match) {
        match.file = file;
        match.status = "paused";
        match.error = null;
        reattachedIds.add(match.id);
        toast.add({
          title: "File re-attached",
          description: `"${file.name}" re-attached — click Resume to continue`,
          color: "info"
        });
        continue;
      }

      // Pre-validate file size
      if (file.size > maxFileSize) {
        toast.add({
          title: "File too large",
          description: `"${file.name}" exceeds max size (${formatFileSize(maxFileSize)})`,
          color: "error"
        });
        continue;
      }

      // Create new task
      tasks.value.push({
        id: crypto.randomUUID(),
        file,
        filename: file.name,
        size: file.size,
        status: "queued",
        progress: 0,
        bytesUploaded: 0,
        error: null,
        retryCount: 0,
        tusUpload: null
      });
    }

    onStatusChange();
  }

  function pause(taskId: string) {
    const task = tasks.value.find((t) => t.id === taskId);
    if (!task || task.status !== "uploading") return;
    task.tusUpload?.abort();
    task.status = "paused";
    onStatusChange();
  }

  function resume(taskId: string) {
    const task = tasks.value.find((t) => t.id === taskId);
    if (!task || !task.file) return;
    if (task.status !== "paused" && task.status !== "interrupted") return;

    task.status = "queued";
    onStatusChange();
  }

  function cancel(taskId: string) {
    const task = tasks.value.find((t) => t.id === taskId);
    if (!task) return;
    if (task.tusUpload) {
      task.tusUpload.abort(true);
      task.tusUpload = null;
    }
    task.status = "cancelled";
    onStatusChange();
  }

  function retry(taskId: string) {
    const task = tasks.value.find((t) => t.id === taskId);
    if (!task || !task.file) return;
    task.retryCount = 0;
    task.error = null;
    task.tusUpload = createTusUpload(task);
    task.status = "queued";
    onStatusChange();
  }

  function remove(taskId: string) {
    const task = tasks.value.find((t) => t.id === taskId);
    if (!task) return;
    if (
      task.tusUpload &&
      (task.status === "uploading" || task.status === "paused")
    ) {
      task.tusUpload.abort(true);
    }
    tasks.value = tasks.value.filter((t) => t.id !== taskId);
    onStatusChange();
  }

  function clearCompleted() {
    // Abort any that might still have tusUpload references
    tasks.value = tasks.value.filter((t) => t.status !== "completed");
    onStatusChange();
  }

  return {
    tasks,
    hasVisibleTasks,
    addFiles,
    pause,
    resume,
    cancel,
    retry,
    remove,
    clearCompleted
  };
}

export function useUploadQueue() {
  if (!_instance) {
    _instance = createUploadQueue();
  }
  return _instance;
}
