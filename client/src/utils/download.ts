// Programmatic blob download for export buttons (TICKET-80).

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function slugify(title: string): string {
  return (
    String(title || 'story')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'story'
  );
}

export function exportFilename(title: string, kind: 'pdf' | 'epub'): string {
  return `${slugify(title)}.${kind}`;
}

export default { downloadBlob, slugify, exportFilename };
