module.exports = async function* reporter(source) {
  const results = [];
  for await (const event of source) {
    if (
      event.type !== 'test:pass' &&
      event.type !== 'test:fail' &&
      event.type !== 'test:skip'
    ) {
      continue;
    }
    const data = event.data ?? {};
    const name = String(data.name ?? '');
    const file = data.file ? String(data.file) : '';
    if (!name || name === file || /^([A-Za-z]:)?[\\/]/.test(name)) {
      continue;
    }
    const error = data.details?.error;
    if (error?.message === 'test failed' && !error?.stack) continue;
    results.push({
      status:
        event.type === 'test:pass'
          ? 'passed'
          : event.type === 'test:fail'
            ? 'failed'
            : 'skipped',
      name,
      file,
      durationMs:
        typeof data.details?.duration_ms === 'number'
          ? data.details.duration_ms
          : null,
      error: error?.message ? String(error.message) : null,
      stack: error?.stack ? String(error.stack) : null,
    });
  }
  yield JSON.stringify({ results });
};
