/**
 * elmoorx split — تقسيم الكود تلقائياً
 */
import { splitProject } from '../splitting/index.mjs';

export async function splitCodeProject(options = {}) {
  const cwd = process.cwd();
  await splitProject(cwd, {
    outDir: options.out || 'dist',
  });
}
