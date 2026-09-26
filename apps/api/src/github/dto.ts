import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ConnectGithubDto {
  @IsString()
  @MaxLength(300)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  branch?: string;
}

export class UpdateGithubDto {
  @IsOptional()
  @IsBoolean()
  continuousTesting?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  branch?: string;
}
