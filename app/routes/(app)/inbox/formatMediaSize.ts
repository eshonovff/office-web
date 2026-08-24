export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

/** "3.1 / 12.4 MB" when the server sent Content-Length, "3.1 MB" otherwise — never a bare "of unknown". */
export function formatDownloadProgress(loaded: number, total: number | null): string {
  const loadedLabel = formatBytes(loaded) || '0 KB';
  if (!total) return loadedLabel;
  return `${loadedLabel} / ${formatBytes(total)}`;
}
