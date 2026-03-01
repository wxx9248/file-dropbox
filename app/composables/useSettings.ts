import { useLocalStorage } from "@vueuse/core";

export interface Settings {
  theme: "light" | "dark" | "system";
  maxConcurrent: number;
  autoRetryCount: number;
  connectionTimeoutMs: number;
  chunkSizeBytes: number;
}

const defaultSettings: Settings = {
  theme: "system",
  maxConcurrent: 3,
  autoRetryCount: 3,
  connectionTimeoutMs: 30000,
  chunkSizeBytes: 10485760 // 10 MB
};

export function useSettings() {
  const settings = useLocalStorage<Settings>(
    "settings",
    { ...defaultSettings },
    { mergeDefaults: true }
  );

  const colorMode = useColorMode();
  watch(
    () => settings.value.theme,
    (theme) => {
      colorMode.preference = theme;
    },
    { immediate: true }
  );

  return { settings };
}
