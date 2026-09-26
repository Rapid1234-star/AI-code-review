import { UnprocessableEntityException } from '@nestjs/common';
import { z } from 'zod';

const severity = z.enum(['critical', 'high', 'medium', 'low']);

export const reviewSchema = z.object({
  summary: z.string().min(1),
  issues: z.array(
    z.object({
      title: z.string().min(1),
      severity,
      file: z.string().min(1),
      line: z.number().int().positive().nullable().optional(),
      description: z.string().min(1),
      recommendation: z.string().min(1),
      confidence: z.number(),
    }),
  ),
  recommendations: z.array(z.string()),
});

export const testsSchema = z.object({
  tests: z.array(
    z.object({
      sourcePath: z.string().min(1),
      testPath: z.string().min(1),
      content: z.string().min(1),
    }),
  ),
});

export const analysisSchema = z.object({
  analyses: z.array(
    z.object({
      testName: z.string().min(1),
      likelyCause: z.string().min(1),
      affectedFile: z.string().min(1),
      recommendation: z.string().min(1),
    }),
  ),
});

export type ReviewOutput = z.infer<typeof reviewSchema>;
export type TestsOutput = z.infer<typeof testsSchema>;
export type AnalysisOutput = z.infer<typeof analysisSchema>;

export function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1].trim() : trimmed;
  return JSON.parse(body);
}

export function parseReview(raw: string): ReviewOutput {
  const parsed = reviewSchema.parse(extractJson(raw));
  return {
    ...parsed,
    issues: parsed.issues.map((issue) => ({
      ...issue,
      confidence: normalizeConfidence(issue.confidence),
      line: issue.line ?? null,
    })),
  };
}

export function parseTests(raw: string): TestsOutput {
  const parsed = testsSchema.parse(extractJson(raw));
  return {
    tests: parsed.tests.map((test) => ({
      ...test,
      testPath: assertRelativeTestPath(test.testPath),
      sourcePath: assertRelativeSourcePath(test.sourcePath),
    })),
  };
}

export function parseAnalysis(raw: string): AnalysisOutput {
  return analysisSchema.parse(extractJson(raw));
}

function normalizeConfidence(value: number) {
  const scaled = value > 1 && value <= 100 ? value / 100 : value;
  if (scaled < 0 || scaled > 1 || Number.isNaN(scaled)) {
    throw new Error('Confidence must be between 0 and 1');
  }
  return scaled;
}

function assertRelativeSourcePath(value: string) {
  const path = value.replace(/\\/g, '/').replace(/^\/+/, '');
  if (path.split('/').some((part) => part === '..' || part === '')) {
    throw new Error('Unsafe source path');
  }
  return path;
}

function assertRelativeTestPath(value: string) {
  const path = value.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!path.startsWith('.strix-tests/') || !path.endsWith('.test.js')) {
    throw new Error('Tests must be written to .strix-tests/*.test.js');
  }
  if (path.split('/').some((part) => part === '..')) {
    throw new Error('Unsafe test path');
  }
  return path;
}

export async function withStructuredRetry<T>(
  call: (repairHint?: string) => Promise<string>,
  parse: (raw: string) => T,
): Promise<T> {
  const first = await call();
  try {
    return parse(first);
  } catch (error) {
    const hint = error instanceof Error ? error.message : 'Invalid JSON';
    const second = await call(
      `The previous response was invalid (${hint}). Return only JSON that matches the schema.`,
    );
    try {
      return parse(second);
    } catch {
      throw new UnprocessableEntityException(
        'The model returned invalid structured output',
      );
    }
  }
}
