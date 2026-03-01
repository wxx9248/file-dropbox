<script setup lang="ts">
import { formatFileSize } from "~/utils/format";

const emit = defineEmits<{
  files: [files: File[]];
}>();

const runtimeConfig = useRuntimeConfig();
const maxFileSize = runtimeConfig.public.maxFileSize as number;

const fileInput = ref<HTMLInputElement | null>(null);
const isDragOver = ref(false);
let dragCounter = 0;

function onClick() {
  fileInput.value?.click();
}

function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files?.length) {
    emit("files", Array.from(input.files));
  }
  input.value = "";
}

function onDragEnter() {
  ++dragCounter;
  isDragOver.value = true;
}

function onDragLeave() {
  --dragCounter;
  if (dragCounter <= 0) {
    dragCounter = 0;
    isDragOver.value = false;
  }
}

function onDrop() {
  dragCounter = 0;
  isDragOver.value = false;
  // Actual file handling is done by the parent page's drop handler
}
</script>

<template>
  <div
    class="flex flex-1 items-center justify-center p-8"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div
      class="flex w-full max-w-md cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 transition-colors"
      :class="
        isDragOver ? 'border-primary bg-(--ui-primary)/5' : 'border-accented'
      "
      @click="onClick"
    >
      <UIcon name="i-lucide-upload" class="text-dimmed text-5xl" />
      <p class="text-muted text-center">Drop files here or click to upload</p>
      <p class="text-dimmed text-sm">
        Maximum file size: {{ formatFileSize(maxFileSize) }}
      </p>
    </div>

    <input
      ref="fileInput"
      type="file"
      multiple
      class="hidden"
      @change="onFilesSelected"
    />
  </div>
</template>
