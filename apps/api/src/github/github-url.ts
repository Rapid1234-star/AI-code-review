import { BadRequestException } from '@nestjs/common';

export function parseGithubRepoUrl(input: string) {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new BadRequestException('Enter a valid GitHub repository URL');
  }
  if (url.protocol !== 'https:' || url.hostname !== 'github.com') {
    throw new BadRequestException(
      'Only https://github.com repositories are supported',
    );
  }
  if (url.username || url.password) {
    throw new BadRequestException(
      'Repository URL must not include credentials',
    );
  }
  const parts = url.pathname
    .replace(/\.git$/, '')
    .split('/')
    .filter(Boolean);
  if (parts.length !== 2) {
    throw new BadRequestException(
      'Use a repository URL like https://github.com/owner/repo',
    );
  }
  const [owner, repo] = parts;
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) {
    throw new BadRequestException('Repository owner or name is invalid');
  }
  return { owner, repo };
}

export function assertBranch(branch: string) {
  if (
    !/^[A-Za-z0-9._/-]{1,100}$/.test(branch) ||
    branch.includes('..') ||
    branch.startsWith('-')
  ) {
    throw new BadRequestException('Branch name is invalid');
  }
  return branch;
}
