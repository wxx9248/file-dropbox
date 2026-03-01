<script setup lang="ts">
import { useUploadQueue } from "~/composables/useUploadQueue";

const { hasVisibleTasks, addFiles } = useUploadQueue();

const isDragOverlay = ref(false);
let dragCounter = 0;

function onDragEnter(e: DragEvent) {
  e.preventDefault();
  ++dragCounter;
  if (hasVisibleTasks.value) {
    isDragOverlay.value = true;
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
}

function onDragLeave(e: DragEvent) {
  e.preventDefault();
  --dragCounter;
  if (dragCounter <= 0) {
    dragCounter = 0;
    isDragOverlay.value = false;
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  dragCounter = 0;
  isDragOverlay.value = false;
  const files = e.dataTransfer?.files;
  if (files?.length) {
    addFiles(Array.from(files));
  }
}

function onDropZoneFiles(files: File[]) {
  addFiles(files);
}
</script>

<template>
  <div
    class="relative flex h-screen flex-col"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <AppHeader />

    <UploadDropZone v-if="!hasVisibleTasks" @files="onDropZoneFiles" />
    <UploadTaskList v-else />

    <!-- Drag overlay when task list is visible -->
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isDragOverlay"
        class="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center bg-(--ui-bg)/80 backdrop-blur-sm"
      >
        <UIcon name="i-lucide-upload" class="text-primary mb-4 text-6xl" />
        <p class="text-default text-lg font-medium">Drop files to upload</p>
      </div>
    </Transition>
  </div>
</template>
