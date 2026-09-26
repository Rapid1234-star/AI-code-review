import { parseReview, withStructuredRetry } from './schemas';

describe('structured model output', () => {
  it('parses fenced review JSON and normalizes confidence', () => {
    const raw = [
      '```json',
      JSON.stringify({
        summary: 'One issue',
        issues: [
          {
            title: 'Secret',
            severity: 'high',
            file: 'src/a.js',
            line: 4,
            description: 'A token is hardcoded.',
            recommendation: 'Move it to the environment.',
            confidence: 91,
          },
        ],
        recommendations: ['Rotate the token'],
      }),
      '```',
    ].join('\n');
    const review = parseReview(raw);
    expect(review.issues[0].confidence).toBeCloseTo(0.91);
  });

  it('repairs invalid JSON once', async () => {
    const call = jest
      .fn()
      .mockResolvedValueOnce('not json')
      .mockResolvedValueOnce(
        JSON.stringify({
          summary: 'Clean',
          issues: [],
          recommendations: [],
        }),
      );
    const result = await withStructuredRetry(call, parseReview);
    expect(result.summary).toBe('Clean');
    expect(call).toHaveBeenCalledTimes(2);
  });
});
