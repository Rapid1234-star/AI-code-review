import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import AdmZip from 'adm-zip';
import { FileChanges, classifyCompareFiles } from './changes';

const FIXTURE_BASE = '1111111111111111111111111111111111111111';
const FIXTURE_HEAD = '2222222222222222222222222222222222222222';
const FIXTURE_SOURCE = `function login(user, password) {
  if (!user || !password) throw new Error('missing');
  if (password !== 'secret') throw new Error('invalid');
  return { ok: true };
}
module.exports = { login };
`;

@Injectable()
export class GithubClient {
  constructor(private readonly config: ConfigService) {}

  private fixtures() {
    return this.config.get<string>('GITHUB_USE_FIXTURES') === 'true';
  }

  async getRepo(owner: string, repo: string) {
    if (this.fixtures()) {
      return { defaultBranch: 'main', private: false };
    }
    const body = await this.request<{
      default_branch: string;
      private: boolean;
    }>(`/repos/${owner}/${repo}`);
    return { defaultBranch: body.default_branch, private: body.private };
  }

  async initialSha(owner: string, repo: string, branch: string) {
    if (this.fixtures()) return FIXTURE_BASE;
    return this.headSha(owner, repo, branch);
  }

  async headSha(owner: string, repo: string, branch: string) {
    if (this.fixtures()) return FIXTURE_HEAD;
    const body = await this.request<{ sha: string }>(
      `/repos/${owner}/${repo}/commits/${encodeURIComponent(branch)}`,
    );
    return body.sha;
  }

  async archive(owner: string, repo: string, branch: string) {
    if (this.fixtures()) {
      const zip = new AdmZip();
      zip.addFile(
        'fixture-root/src/auth/login.ts',
        Buffer.from(FIXTURE_SOURCE),
      );
      return zip.toBuffer();
    }
    return this.requestBuffer(
      `/repos/${owner}/${repo}/zipball/${encodeURIComponent(branch)}`,
    );
  }

  async compare(
    owner: string,
    repo: string,
    base: string,
    head: string,
  ): Promise<FileChanges> {
    if (this.fixtures()) {
      return classifyCompareFiles([
        { filename: 'src/auth/login.ts', status: 'modified' },
      ]);
    }
    const body = await this.request<{
      files?: {
        filename: string;
        status: string;
        previous_filename?: string;
      }[];
    }>(`/repos/${owner}/${repo}/compare/${base}...${head}`);
    return classifyCompareFiles(body.files ?? []);
  }

  async fileContent(
    owner: string,
    repo: string,
    filePath: string,
    sha: string,
  ) {
    if (this.fixtures()) {
      return `${FIXTURE_SOURCE}\n// updated in ${sha.slice(0, 7)}\n`;
    }
    const body = await this.request<{ content?: string; encoding?: string }>(
      `/repos/${owner}/${repo}/contents/${filePath.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(sha)}`,
    );
    if (body.encoding !== 'base64' || !body.content) {
      throw new BadRequestException(`Could not read ${filePath} from GitHub`);
    }
    return Buffer.from(body.content, 'base64').toString('utf8');
  }

  fixtureBaseSha() {
    return FIXTURE_BASE;
  }

  private async request<T>(pathname: string): Promise<T> {
    const response = await this.fetch(pathname);
    return (await response.json()) as T;
  }

  private async requestBuffer(pathname: string) {
    const response = await this.fetch(pathname);
    const reader = response.body?.getReader();
    if (!reader)
      throw new BadRequestException('GitHub returned an empty archive');
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 20 * 1024 * 1024) {
        throw new BadRequestException('Repository archive exceeds 20MB');
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  }

  private async fetch(pathname: string) {
    const token = this.config.get<string>('GITHUB_TOKEN');
    const response = await fetch(`https://api.github.com${pathname}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'strix',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new BadRequestException(
        `GitHub request failed (${response.status})`,
      );
    }
    return response;
  }
}
