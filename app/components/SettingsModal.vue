<script setup lang="ts">
import { useSettings } from "~/composables/useSettings";

const open = defineModel<boolean>("open", { default: false });
const { settings } = useSettings();

const themeItems = [
  { label: "Light", value: "light" as const },
  { label: "Dark", value: "dark" as const },
  { label: "System", value: "system" as const }
];

const chunkSizeItems = [
  { label: "1 MB", value: 1048576 },
  { label: "5 MB", value: 5242880 },
  { label: "10 MB", value: 10485760 },
  { label: "20 MB", value: 20971520 },
  { label: "50 MB", value: 52428800 },
  { label: "100 MB", value: 104857600 }
];

const timeoutSeconds = computed({
  get: () => settings.value.connectionTimeoutMs / 1000,
  set: (val: number) => {
    settings.value.connectionTimeoutMs = val * 1000;
  }
});
</script>

<template>
  <UModal v-model:open="open" title="Settings" :close="true">
    <template #body>
      <div class="flex flex-col gap-5">
        <UFormField label="Theme">
          <USelect
            v-model="settings.theme"
            :items="themeItems"
            value-key="value"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Concurrent uploads">
          <UInputNumber v-model="settings.maxConcurrent" :min="1" :max="10" />
        </UFormField>

        <UFormField label="Auto-retry count">
          <UInputNumber v-model="settings.autoRetryCount" :min="0" :max="10" />
        </UFormField>

        <UFormField label="Connection timeout (seconds)">
          <UInputNumber v-model="timeoutSeconds" :min="5" :max="300" />
        </UFormField>

        <UFormField label="Chunk size">
          <USelect
            v-model="settings.chunkSizeBytes"
            :items="chunkSizeItems"
            value-key="value"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>
  </UModal>
</template>
