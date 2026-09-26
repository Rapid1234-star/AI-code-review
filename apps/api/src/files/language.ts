const LANGUAGES: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  py: 'python',
  go: 'go',
  rs: 'rust',
  java: 'java',
  rb: 'ruby',
  php: 'php',
  cs: 'csharp',
  json: 'json',
  yml: 'yaml',
  yaml: 'yaml',
  md: 'markdown',
  css: 'css',
  html: 'xml',
  sql: 'sql',
  sh: 'bash',
};

export function languageForPath(filePath: string) {
  const extension = filePath.split('.').pop()?.toLowerCase() ?? '';
  return LANGUAGES[extension] ?? 'plaintext';
}

export function lineCount(content: string) {
  if (content.length === 0) return 0;
  return content.split(/\r?\n/).length;
}
