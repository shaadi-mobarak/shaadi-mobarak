// Upload storage adapter.
// Only the "local" driver is implemented: files live in server/src/uploads/private/
// (Render Free ephemeral disk — lost on redeploy). The driver is selected by
// STORAGE_DRIVER (default "local"). S3-compatible env vars are documented in
// .env.example, but no S3 driver is implemented yet: if STORAGE_DRIVER is set to
// anything else, the server logs a clear warning and falls back to local instead
// of pretending remote storage works.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const privateDir = path.join(__dirname, '..', 'uploads', 'private');
fs.mkdirSync(privateDir, { recursive: true });

export function getStorageDriver() {
  const d = (process.env.STORAGE_DRIVER || 'local').trim().toLowerCase();
  if (d !== 'local') {
    console.warn(`WARNING: STORAGE_DRIVER="${d}" is not implemented yet — falling back to local disk storage.`);
    return 'local';
  }
  return 'local';
}

export function storageWarning() {
  return 'Uploads are stored on ephemeral disk and may be lost on redeploy. Configure object storage (STORAGE_DRIVER=s3) for permanent photo storage.';
}

export const storage = {
  driver: () => getStorageDriver(),
  async save(buffer, filename) {
    const full = path.join(privateDir, path.basename(filename));
    await fs.promises.writeFile(full, buffer);
    return path.basename(filename);
  },
  async read(filename) {
    return fs.promises.readFile(path.join(privateDir, path.basename(filename)));
  },
  async exists(filename) {
    try { await fs.promises.access(path.join(privateDir, path.basename(filename))); return true; } catch { return false; }
  },
  async delete(filename) {
    try { await fs.promises.unlink(path.join(privateDir, path.basename(filename))); } catch { /* already gone */ }
  },
  filePath(filename) { return path.join(privateDir, path.basename(filename)); },
};
