export function selectContext(
  files: { path: string; content: string }[],
  query: string,
  budget = 12_000,
) {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9_./]+/)
    .filter((term) => term.length > 2);
  const ranked = files
    .map((file) => {
      const haystack = `${file.path}\n${file.content}`.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (haystack.includes(term)) score += term.length > 4 ? 2 : 1;
      }
      return { file, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const chosen: { path: string; content: string }[] = [];
  let used = 0;
  for (const item of ranked) {
    if (chosen.length >= 6) break;
    const slice = item.file.content.slice(0, 4000);
    if (used + slice.length > budget) continue;
    chosen.push({ path: item.file.path, content: slice });
    used += slice.length;
  }
  if (chosen.length === 0 && files[0]) {
    chosen.push({
      path: files[0].path,
      content: files[0].content.slice(0, 4000),
    });
  }
  return chosen;
}
