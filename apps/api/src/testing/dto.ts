import { IsArray, IsOptional, IsString } from 'class-validator';

export class GenerateTestsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filePaths?: string[];
}

export class RunTestsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  testIds?: string[];
}
