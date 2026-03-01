const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  let unitIndex = 0;
  let size = bytes;
  while (size >= 1024 && unitIndex < UNITS.length - 1) {
    size /= 1024;
    ++unitIndex;
  }
  return `${size.toFixed(1)} ${UNITS[unitIndex]}`;
}

export function formatProgress(uploaded: number, total: number): string {
  if (total === 0) return "0.0%";
  return `${((uploaded / total) * 100).toFixed(1)}%`;
}
