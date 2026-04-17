const MAX_ZIP_INPUT_BYTES = 24 * 1024 * 1024; // 24 MB compressed
const MAX_ZIP_UNCOMPRESSED_BYTES = 120 * 1024 * 1024; // 120 MB extracted
const MAX_ZIP_ENTRIES = 300;

/**
 * Flatten a FileList: unzip .zip entries in-browser (JSON/XML/PDF only), no recursion.
 * Adds safety guards so malformed archives cannot freeze the tab.
 *
 * @param {FileList|File[]} list
 * @returns {Promise<{ files: File[], warnings: string[] }>}
 */
export async function flattenFilesWithZip(list) {
  const { unzipSync } = await import('https://cdn.jsdelivr.net/npm/fflate@0.8.2/+esm');
  const out = [];
  const warnings = [];
  const seenNames = new Map();
  const uniqueName = (base) => {
    const used = seenNames.get(base) ?? 0;
    const next = used + 1;
    seenNames.set(base, next);
    return used > 0
      ? `${base.replace(/(\.[^.]+)?$/, `__${next}$1`)}`
      : base;
  };

  for (const file of Array.from(list ?? [])) {
    const n = file.name?.toLowerCase() ?? '';
    if (n.endsWith('.zip')) {
      if ((file.size ?? 0) > MAX_ZIP_INPUT_BYTES) {
        warnings.push(`${file.name}: ZIP is too large (>${Math.round(MAX_ZIP_INPUT_BYTES / (1024 * 1024))} MB compressed).`);
        continue;
      }
      try {
        const u8 = new Uint8Array(await file.arrayBuffer());
        const entries = unzipSync(u8);
        const keys = Object.keys(entries);
        if (keys.length > MAX_ZIP_ENTRIES) {
          warnings.push(`${file.name}: ZIP has too many files (${keys.length}).`);
          continue;
        }

        let totalUncompressed = 0;
        const extracted = [];
        let blocked = false;
        for (const relPath of keys) {
          if (relPath.endsWith('/')) continue;
          const base = relPath.split('/').pop() ?? relPath;
          if (!/\.(json|xml|pdf)$/i.test(base)) continue;
          const data = entries[relPath];
          if (!data || !(data instanceof Uint8Array)) continue;
          totalUncompressed += data.byteLength;
          if (totalUncompressed > MAX_ZIP_UNCOMPRESSED_BYTES) {
            warnings.push(
              `${file.name}: ZIP expands beyond ${Math.round(MAX_ZIP_UNCOMPRESSED_BYTES / (1024 * 1024))} MB.`
            );
            blocked = true;
            break;
          }
          const finalName = uniqueName(base);
          extracted.push(new File([data], finalName, { type: 'application/octet-stream' }));
        }
        if (!blocked) {
          out.push(...extracted);
        }
      } catch {
        warnings.push(`${file.name}: Could not read ZIP archive.`);
      }
    } else {
      const safeName = uniqueName(file.name || 'upload-file');
      out.push(safeName === file.name ? file : new File([file], safeName, { type: file.type || 'application/octet-stream' }));
    }
  }
  return { files: out, warnings };
}
