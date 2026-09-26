import { buildSandboxArgs, parseReporterOutput } from './sandbox';

describe('sandbox policy', () => {
  it('drops network, secrets, and host privileges', () => {
    const args = buildSandboxArgs({
      inputPath: 'C:\\temp\\workspace',
      image: 'strix-sandbox:local',
      containerName: 'strix-test',
    });
    expect(args[args.indexOf('--network') + 1]).toBe('none');
    expect(args).toContain('--read-only');
    expect(args).toContain('--cap-drop');
    expect(args).toContain('ALL');
    expect(args).toContain('--user');
    const joined = args.join(' ');
    expect(joined).not.toMatch(
      /API_KEY|JWT_SECRET|DATABASE_URL|APP_ENCRYPTION/,
    );
    expect(args.filter((arg) => arg.startsWith('-e'))).toEqual(['-e', '-e']);
    expect(args).toContain('HOME=/tmp');
    expect(args).toContain('NODE_ENV=test');
  });

  it('parses reporter JSON', () => {
    const tests = parseReporterOutput(
      'noise {"results":[{"name":"rejects","file":"a.test.js","status":"failed","durationMs":2,"error":"nope","stack":"stack"}]}',
    );
    expect(tests[0].name).toBe('rejects');
    expect(tests[0].status).toBe('failed');
  });
});
