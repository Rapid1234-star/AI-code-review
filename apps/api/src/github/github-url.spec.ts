import { BadRequestException } from '@nestjs/common';
import { parseGithubRepoUrl } from './github-url';

describe('GitHub URL validation', () => {
  it('accepts a public repository URL', () => {
    expect(
      parseGithubRepoUrl('https://github.com/example/project.git'),
    ).toEqual({
      owner: 'example',
      repo: 'project',
    });
  });

  it('rejects other hosts and credentialed URLs', () => {
    expect(() => parseGithubRepoUrl('https://gitlab.com/a/b')).toThrow(
      BadRequestException,
    );
    expect(() =>
      parseGithubRepoUrl('https://user:token@github.com/a/b'),
    ).toThrow(BadRequestException);
    expect(() => parseGithubRepoUrl('https://github.com/a/b/extra')).toThrow(
      BadRequestException,
    );
  });
});
