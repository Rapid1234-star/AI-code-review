import { BadGatewayException } from '@nestjs/common';
import { redact } from '../common/redact';

export type ProviderConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function completeChat(
  config: ProviderConfig,
  messages: ChatMessage[],
  jsonMode: boolean,
): Promise<string> {
  const withFormat = await post(config, messages, jsonMode);
  if (withFormat.ok) return withFormat.content;
  if (jsonMode && withFormat.status === 400) {
    const plain = await post(config, messages, false);
    if (plain.ok) return plain.content;
    throw new BadGatewayException(plain.message);
  }
  throw new BadGatewayException(withFormat.message);
}

async function post(
  config: ProviderConfig,
  messages: ChatMessage[],
  jsonMode: boolean,
): Promise<
  { ok: true; content: string } | { ok: false; status: number; message: string }
> {
  const base = config.baseUrl.replace(/\/$/, '');
  let response: Response;
  try {
    response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.1,
        messages,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Provider request failed';
    return { ok: false, status: 502, message: redact(message).slice(0, 300) };
  }

  const text = await response.text();
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: `Provider returned ${response.status}: ${redact(text).slice(0, 300)}`,
    };
  }
  try {
    const body = JSON.parse(text) as {
      choices?: { message?: { content?: unknown } }[];
    };
    const content = body.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.trim()) {
      return { ok: true, content };
    }
    if (Array.isArray(content)) {
      const joined = content
        .map((part) =>
          typeof part === 'string'
            ? part
            : typeof part === 'object' && part && 'text' in part
              ? String((part as { text: string }).text)
              : '',
        )
        .join('');
      if (joined.trim()) return { ok: true, content: joined };
    }
    return {
      ok: false,
      status: 502,
      message: 'Provider returned an empty response',
    };
  } catch {
    return {
      ok: false,
      status: 502,
      message: 'Provider returned invalid JSON',
    };
  }
}
