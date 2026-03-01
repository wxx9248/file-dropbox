<script setup lang="ts">
import { useUploadQueue } from "~/composables/useUploadQueue";

const { tasks, clearCompleted } = useUploadQueue();

const hasCompleted = computed(() =>
  tasks.value.some((t) => t.status === "completed")
);
</script>

<template>
  <div class="flex flex-1 flex-col overflow-hidden">
    <div v-if="hasCompleted" class="flex justify-end px-4 pt-3">
      <UButton
        label="Clear completed"
        variant="ghost"
        color="neutral"
        size="xs"
        @click="clearCompleted()"
      />
    </div>
    <div class="flex-1 space-y-2 overflow-y-auto p-4">
      <UploadTaskRow v-for="task in tasks" :key="task.id" :task="task" />
    </div>
  </div>
</template>
