import { selectContext } from './retrieval';

describe('chat retrieval', () => {
  it('prefers files that match the question and stays within a budget', () => {
    const files = [
      { path: 'readme.md', content: 'overview' },
      {
        path: 'src/auth/login.ts',
        content: 'function login() { return token; }',
      },
      { path: 'src/ui/button.ts', content: 'export const Button = 1;' },
    ];
    const chosen = selectContext(
      files,
      'How does authentication login work?',
      12_000,
    );
    expect(chosen[0].path).toBe('src/auth/login.ts');
    expect(chosen.some((file) => file.path === 'src/ui/button.ts')).toBe(false);
  });
});
