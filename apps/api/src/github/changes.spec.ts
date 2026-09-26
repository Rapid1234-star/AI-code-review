import { classifyCompareFiles, classifyPushCommits } from './changes';

describe('changed file detection', () => {
  it('classifies compare payloads including renames', () => {
    expect(
      classifyCompareFiles([
        { filename: 'src/auth/login.ts', status: 'modified' },
        { filename: 'src/new.ts', status: 'added' },
        { filename: 'src/old.ts', status: 'removed' },
        {
          filename: 'src/auth/session.ts',
          status: 'renamed',
          previous_filename: 'src/session.ts',
        },
      ]),
    ).toEqual({
      added: ['src/new.ts', 'src/auth/session.ts'],
      modified: ['src/auth/login.ts'],
      deleted: ['src/old.ts', 'src/session.ts'],
    });
  });

  it('unions push commits and drops files that were deleted', () => {
    expect(
      classifyPushCommits([
        { added: ['a.ts'], modified: ['b.ts'], removed: [] },
        { added: [], modified: ['a.ts'], removed: ['b.ts'] },
      ]),
    ).toEqual({ added: ['a.ts'], modified: [], deleted: ['b.ts'] });
  });
});
