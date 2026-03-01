import { link, unlink, mkdirSync } from "node:fs";
import { promisify } from "node:util";
import path from "node:path";
import { Server } from "@tus/server";
import { FileStore } from "@tus/file-store";

const linkAsync = promisify(link);
const unlinkAsync = promisify(unlink);

const uploadDir = process.env.FILE_DROPBOX_UPLOAD_DIR || "./uploads";
const maxSize = parseInt(
  process.env.FILE_DROPBOX_MAX_FILE_SIZE || "10737418240",
  10
);
const trustProxy = process.env.FILE_DROPBOX_TRUST_PROXY === "true";

mkdirSync(uploadDir, { recursive: true });

function sanitizeFilename(name: string): string {
  // Replace path separators, null bytes, and control characters
  let sanitized = name.replace(/[/\\\0\x01-\x1f\x7f]/g, "_");

  // Reject . and ..
  if (sanitized === "." || sanitized === "..") {
    sanitized = "_";
  }

  // Strip leading/trailing whitespace and dots
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, "");

  // Truncate to 255 bytes
  const encoder = new TextEncoder();
  if (encoder.encode(sanitized).length > 255) {
    const decoder = new TextDecoder();
    sanitized = decoder.decode(encoder.encode(sanitized).slice(0, 255));
    // Remove potential partial character at the end
    sanitized = sanitized.replace(/\uFFFD$/, "");
  }

  // If empty after sanitization, use fallback
  if (!sanitized) {
    sanitized = "unnamed_upload";
  }

  return sanitized;
}

interface RenameResult {
  finalName: string;
  finalPath: string;
}

async function atomicDeduplicatedRename(
  dir: string,
  srcPath: string,
  filename: string
): Promise<RenameResult> {
  // Path traversal defense
  const resolvedDir = path.resolve(dir);
  const candidatePath = path.resolve(dir, filename);
  if (!candidatePath.startsWith(resolvedDir + path.sep)) {
    // Fall back to tus ID
    return { finalName: path.basename(srcPath), finalPath: srcPath };
  }

  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let candidate = filename;
  let counter = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const targetPath = path.join(dir, candidate);
    try {
      await linkAsync(srcPath, targetPath);
      // Success — remove original
      await unlinkAsync(srcPath).catch(() => {});
      return { finalName: candidate, finalPath: targetPath };
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "EEXIST") {
        ++counter;
        candidate = `${base} (${counter})${ext}`;
        continue;
      }
      // Other error (permissions, disk full) — keep tus-ID filename
      console.error("Failed to rename upload file:", err);
      return { finalName: path.basename(srcPath), finalPath: srcPath };
    }
  }
}

const baseURL = (process.env.FILE_DROPBOX_BASE_PATH || "/").replace(/\/$/, "");

const tusServer = new Server({
  path: `${baseURL}/api/tus`,
  datastore: new FileStore({ directory: uploadDir }),
  maxSize,
  respectForwardedHeaders: trustProxy,
  relativeLocation: true,
  async onUploadFinish(_req, upload) {
    const originalName = upload.metadata?.filename || upload.id;
    const sanitized = sanitizeFilename(originalName);
    const tusFilePath = path.join(uploadDir, upload.id);

    const { finalName, finalPath } = await atomicDeduplicatedRename(
      uploadDir,
      tusFilePath,
      sanitized
    );

    // Clean up tus .json metadata sidecar file
    await unlinkAsync(tusFilePath + ".json").catch(() => {});

    // Record in SQLite
    db.prepare(
      "INSERT INTO uploads (id, filename, size, mime_type, file_path, completed_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(
      upload.id,
      finalName,
      upload.size ?? 0,
      upload.metadata?.filetype || null,
      finalPath,
      new Date().toISOString()
    );

    return {};
  }
});

export { tusServer };
