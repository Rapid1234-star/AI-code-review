import AdmZip from 'adm-zip';

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  'vendor',
  '__pycache__',
  '.venv',
  'venv',
  'out',
]);

const SKIP_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'ico',
  'pdf',
  'zip',
  'gz',
  'wasm',
  'exe',
  'dll',
  'so',
  'dylib',
  'mp4',
  'mp3',
  'woff',
  'woff2',
  'ttf',
  'otf',
  'eot',
  'lock',
]);

const MAX_FILES = 400;
const MAX_FILE_BYTES = 500 * 1024;
const MAX_UNCOMPRESSED = 50 * 1024 * 1024;

export type ExtractedFile = {
  path: string;
  content: string;
};

export function assertSafeZipPath(entryName: string): string {
  const name = entryName.replace(/\\/g, '/');
  if (name.startsWith('/') || name.includes('\0') || /^[a-zA-Z]:/.test(name)) {
    throw new Error('Unsafe zip path');
  }
  const parts = name.split('/').filter(Boolean);
  if (
    parts.length === 0 ||
    parts.some((part) => part === '..' || part === '.')
  ) {
    throw new Error('Unsafe zip path');
  }
  return parts.join('/');
}

function ignored(filePath: string) {
  return filePath.split('/').some((part) => IGNORE_DIRS.has(part));
}

function isBinary(buf: Buffer) {
  const length = Math.min(buf.length, 8000);
  for (let i = 0; i < length; i += 1) {
    if (buf[i] === 0) return true;
  }
  return false;
}

export function stripSingleRoot(files: ExtractedFile[]): ExtractedFile[] {
  if (files.length === 0) return files;
  const roots = new Set(files.map((file) => file.path.split('/')[0]));
  if (roots.size !== 1) return files;
  const root = [...roots][0];
  const wrappedTree = files.some((file) => file.path.split('/').length > 2);
  if (!wrappedTree) return files;
  return files
    .map((file) => ({ ...file, path: file.path.slice(root.length + 1) }))
    .filter((file) => file.path.length > 0);
}

export function readZipSafely(buffer: Buffer): ExtractedFile[] {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  if (entries.length > 5000) {
    throw new Error('Archive has too many entries');
  }
  let uncompressed = 0;
  const files: ExtractedFile[] = [];

  for (const entry of entries) {
    uncompressed += entry.header.size;
    if (uncompressed > MAX_UNCOMPRESSED) {
      throw new Error('Archive is too large when extracted');
    }
    if (entry.isDirectory) continue;
    const safePath = assertSafeZipPath(entry.entryName);
    if (ignored(safePath)) continue;
    const extension = safePath.split('.').pop()?.toLowerCase() ?? '';
    if (SKIP_EXTENSIONS.has(extension)) continue;
    if (entry.header.size > MAX_FILE_BYTES) continue;
    const data = entry.getData();
    if (data.length > MAX_FILE_BYTES || isBinary(data)) continue;
    files.push({ path: safePath, content: data.toString('utf8') });
    if (files.length > MAX_FILES) {
      throw new Error('Archive contains too many source files');
    }
  }

  return stripSingleRoot(files);
}
