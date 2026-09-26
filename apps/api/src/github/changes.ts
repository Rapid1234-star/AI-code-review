export type FileChanges = {
  added: string[];
  modified: string[];
  deleted: string[];
};

export function classifyCompareFiles(
  files: { filename: string; status: string; previous_filename?: string }[],
): FileChanges {
  const added: string[] = [];
  const modified: string[] = [];
  const deleted: string[] = [];
  for (const file of files) {
    if (file.status === 'added') added.push(file.filename);
    else if (file.status === 'removed') deleted.push(file.filename);
    else if (file.status === 'renamed') {
      if (file.previous_filename) deleted.push(file.previous_filename);
      added.push(file.filename);
    } else modified.push(file.filename);
  }
  return { added, modified, deleted };
}

export function classifyPushCommits(
  commits: { added?: string[]; modified?: string[]; removed?: string[] }[],
): FileChanges {
  const added = new Set<string>();
  const modified = new Set<string>();
  const deleted = new Set<string>();
  for (const commit of commits) {
    for (const file of commit.added ?? []) added.add(file);
    for (const file of commit.modified ?? []) modified.add(file);
    for (const file of commit.removed ?? []) deleted.add(file);
  }
  for (const file of deleted) {
    added.delete(file);
    modified.delete(file);
  }
  for (const file of added) modified.delete(file);
  return {
    added: [...added],
    modified: [...modified],
    deleted: [...deleted],
  };
}
