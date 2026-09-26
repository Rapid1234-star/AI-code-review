import AdmZip from 'adm-zip';
import { assertSafeZipPath, readZipSafely } from './zip-safe';

describe('zip safety', () => {
  it('rejects zip slip paths', () => {
    expect(() => assertSafeZipPath('../evil.txt')).toThrow('Unsafe zip path');
    expect(() => assertSafeZipPath('/etc/passwd')).toThrow('Unsafe zip path');
    const zip = new AdmZip();
    zip.addFile('evil.txt', Buffer.from('nope'));
    const entry = zip.getEntry('evil.txt');
    if (!entry) throw new Error('missing entry');
    entry.entryName = '../evil.txt';
    expect(() => readZipSafely(zip.toBuffer())).toThrow('Unsafe zip path');
  });

  it('skips ignored directories and keeps source files', () => {
    const zip = new AdmZip();
    zip.addFile('pkg/src/app.js', Buffer.from('export const n = 1;\n'));
    zip.addFile('pkg/node_modules/left-pad/index.js', Buffer.from('x'));
    zip.addFile('pkg/.git/config', Buffer.from('secret'));
    const files = readZipSafely(zip.toBuffer());
    expect(files.map((file) => file.path)).toEqual(['src/app.js']);
  });

  it('keeps a source folder that is the archive root', () => {
    const zip = new AdmZip();
    zip.addFile('src/app.js', Buffer.from('export const n = 1;\n'));
    const files = readZipSafely(zip.toBuffer());
    expect(files.map((file) => file.path)).toEqual(['src/app.js']);
  });
});
