<script setup lang="ts">
import { useUploadQueue } from "~/composables/useUploadQueue";
import { useSettings } from "~/composables/useSettings";

const { addFiles } = useUploadQueue();
const { settings } = useSettings();

const settingsOpen = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

function onAddFilesClick() {
  fileInput.value?.click();
}

function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files?.length) {
    addFiles(Array.from(input.files));
  }
  input.value = "";
}

const themeIcons = {
  light: "i-lucide-sun",
  dark: "i-lucide-moon",
  system: "i-lucide-monitor"
} as const;

const themeOrder: Array<"light" | "dark" | "system"> = [
  "light",
  "dark",
  "system"
];

function cycleTheme() {
  const currentIndex = themeOrder.indexOf(settings.value.theme);
  settings.value.theme = themeOrder[(currentIndex + 1) % themeOrder.length];
}
</script>

<template>
  <header class="border-default flex items-center gap-4 border-b p-4">
    <h1 class="mr-auto text-lg font-semibold">File Dropbox</h1>

    <UButton
      icon="i-lucide-upload"
      label="Add files"
      @click="onAddFilesClick"
    />
    <input
      ref="fileInput"
      type="file"
      multiple
      class="hidden"
      @change="onFilesSelected"
    />

    <UButton
      :icon="themeIcons[settings.theme]"
      variant="ghost"
      color="neutral"
      @click="cycleTheme"
    />

    <UButton
      icon="i-lucide-settings"
      variant="ghost"
      color="neutral"
      @click="settingsOpen = true"
    />

    <SettingsModal v-model:open="settingsOpen" />
  </header>
</template>
