<script setup lang="ts">
import type { UploadTask } from "~/composables/useUploadQueue";
import { useUploadQueue } from "~/composables/useUploadQueue";
import { formatFileSize } from "~/utils/format";

const props = defineProps<{
  task: UploadTask;
}>();

const { pause, resume, cancel, retry, remove } = useUploadQueue();

const statusConfig = computed(() => {
  const t = props.task;
  switch (t.status) {
    case "queued":
      return {
        color: "neutral" as const,
        label: "Waiting...",
        progressColor: "neutral" as const
      };
    case "uploading":
      return {
        color: "primary" as const,
        label: `${formatFileSize(t.bytesUploaded)} / ${formatFileSize(t.size)} (${t.progress}%)`,
        progressColor: "primary" as const
      };
    case "paused":
      return {
        color: "warning" as const,
        label: `Paused at ${t.progress}%`,
        progressColor: "warning" as const
      };
    case "completed":
      return {
        color: "success" as const,
        label: "Completed",
        progressColor: "success" as const
      };
    case "failed":
      return {
        color: "error" as const,
        label: t.error || "Failed",
        progressColor: "error" as const
      };
    case "cancelled":
      return {
        color: "neutral" as const,
        label: "Cancelled",
        progressColor: "neutral" as const
      };
    case "interrupted":
      return {
        color: "warning" as const,
        label: "File lost — re-drop to resume",
        progressColor: "warning" as const
      };
    default:
      return {
        color: "neutral" as const,
        label: "",
        progressColor: "neutral" as const
      };
  }
});

const progressValue = computed(() => {
  if (props.task.status === "queued") return undefined;
  return props.task.progress;
});

const canResume = computed(
  () =>
    (props.task.status === "paused" || props.task.status === "interrupted") &&
    props.task.file !== null
);
const canPause = computed(() => props.task.status === "uploading");
const canCancel = computed(
  () =>
    props.task.status === "queued" ||
    props.task.status === "uploading" ||
    props.task.status === "paused"
);
const canRetry = computed(
  () =>
    (props.task.status === "failed" || props.task.status === "cancelled") &&
    props.task.file !== null
);
const canRemove = computed(
  () =>
    props.task.status === "completed" ||
    props.task.status === "failed" ||
    props.task.status === "cancelled" ||
    props.task.status === "interrupted"
);
</script>

<template>
  <div
    class="border-default bg-default flex items-center gap-3 rounded-lg border p-3"
  >
    <!-- File info -->
    <div class="flex w-65 min-w-0 shrink-0 items-center gap-2">
      <UIcon name="i-lucide-file" class="text-dimmed shrink-0 text-lg" />
      <div class="min-w-0">
        <p class="truncate text-sm font-medium" :title="task.filename">
          {{ task.filename }}
        </p>
        <p class="text-dimmed text-xs">
          {{ formatFileSize(task.size) }}
        </p>
      </div>
    </div>

    <!-- Progress -->
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <UProgress
        :model-value="progressValue"
        :max="100"
        size="sm"
        :color="statusConfig.progressColor"
      />
      <div class="flex items-center gap-2">
        <UBadge :color="statusConfig.color" size="xs" variant="subtle">
          {{ task.status }}
        </UBadge>
        <span class="text-muted truncate text-xs">{{
          statusConfig.label
        }}</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex shrink-0 items-center gap-1">
      <UButton
        v-if="canPause"
        icon="i-lucide-pause"
        size="xs"
        variant="ghost"
        color="neutral"
        @click="pause(task.id)"
      />
      <UButton
        v-if="canResume"
        icon="i-lucide-play"
        size="xs"
        variant="solid"
        @click="resume(task.id)"
      />
      <UButton
        v-if="canRetry"
        icon="i-lucide-rotate-ccw"
        size="xs"
        variant="solid"
        @click="retry(task.id)"
      />
      <UButton
        v-if="canCancel"
        icon="i-lucide-x"
        size="xs"
        variant="ghost"
        color="neutral"
        @click="cancel(task.id)"
      />
      <UButton
        v-if="canRemove"
        icon="i-lucide-trash-2"
        size="xs"
        variant="ghost"
        color="neutral"
        @click="remove(task.id)"
      />
    </div>
  </div>
</template>
