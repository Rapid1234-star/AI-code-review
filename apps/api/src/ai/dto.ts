import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const PROVIDER_TYPES = [
  'openai',
  'gemini',
  'compatible',
  'lmstudio',
  'ollama',
  'openrouter',
  'mock',
] as const;

export class CreateProviderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsIn(PROVIDER_TYPES)
  providerType!: (typeof PROVIDER_TYPES)[number];

  @IsString()
  @MaxLength(300)
  baseUrl!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  apiKey!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  model!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateProviderDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  baseUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  model?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class FallbackDto {
  @IsOptional()
  @IsString()
  providerId?: string | null;
}

export function assertBaseUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Base URL must be a valid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Base URL must use http or https');
  }
  if (url.username || url.password) {
    throw new Error('Base URL must not include credentials');
  }
  return url.toString().replace(/\/$/, '');
}
