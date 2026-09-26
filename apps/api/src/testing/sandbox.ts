import { spawn } from 'child_process';

export type SandboxResult = {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

export function buildSandboxArgs(input: {
  inputPath: string;
  image: string;
  containerName: string;
}) {
  return [
    'run',
    '--rm',
    '--name',
    input.containerName,
    '--network',
    'none',
    '--memory',
    '256m',
    '--cpus',
    '0.5',
    '--pids-limit',
    '128',
    '--read-only',
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges',
    '--user',
    '1000:1000',
    '--tmpfs',
    '/tmp:rw,nosuid,uid=1000,gid=1000,size=64m',
    '--tmpfs',
    '/workspace:rw,exec,uid=1000,gid=1000,size=128m',
    '-v',
    `${toDockerPath(input.inputPath)}:/input:ro`,
    '-e',
    'HOME=/tmp',
    '-e',
    'NODE_ENV=test',
    input.image,
  ];
}

export function toDockerPath(filePath: string) {
  return filePath.replace(/\\/g, '/');
}

export function runProcess(
  command: string,
  args: string[],
  timeoutMs: number,
): Promise<SandboxResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, windowsHide: true });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      if (stdout.length < 2_000_000) stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      if (stderr.length < 200_000) stderr += chunk;
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
  });
}

export type ParsedTest = {
  name: string;
  file: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number | null;
  error: string | null;
  stack: string | null;
};

export function parseReporterOutput(stdout: string): ParsedTest[] {
  const start = stdout.indexOf('{');
  const end = stdout.lastIndexOf('}');
  if (start === -1 || end === -1) return [];
  const body = JSON.parse(stdout.slice(start, end + 1)) as {
    results?: ParsedTest[];
  };
  return body.results ?? [];
}
