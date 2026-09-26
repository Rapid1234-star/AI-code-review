const SAMPLE_TEST = `const { test } = require('node:test');
const assert = require('node:assert/strict');

test('accepts valid input', () => {
  assert.equal(1 + 1, 2);
});

test('should reject invalid credentials', () => {
  assert.equal(1, 2);
});
`;

export function mockReview(files: { path: string }[]) {
  const file = files[0]?.path ?? 'src/app.js';
  return JSON.stringify({
    summary: 'The sample review found one high-severity issue.',
    issues: [
      {
        title: 'Hardcoded credential in sample',
        severity: 'high',
        file,
        line: 1,
        description: 'A credential is stored directly in source.',
        recommendation: 'Read the secret from the environment and rotate it.',
        confidence: 0.86,
      },
    ],
    recommendations: [
      'Add an authorization check before returning project data.',
    ],
  });
}

export function mockTests(files: { path: string }[]) {
  const sourcePath = files[0]?.path ?? 'src/app.js';
  return JSON.stringify({
    tests: [
      {
        sourcePath,
        testPath: '.strix-tests/sample.test.js',
        content: SAMPLE_TEST,
      },
    ],
  });
}

export function mockAnalysis(testName: string) {
  return JSON.stringify({
    analyses: [
      {
        testName,
        likelyCause:
          'The comparison expects equal values, so this failure is from the sample assertion.',
        affectedFile: 'src/app.js',
        recommendation: 'Compare the actual result with the expected value.',
      },
    ],
  });
}

export function mockChat(question: string) {
  return `Based on the retrieved project files, here is a concise answer to: ${question}`;
}
