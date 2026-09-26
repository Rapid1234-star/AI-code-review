import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateReviewDto {
  @IsIn(['security', 'performance', 'quality'])
  mode!: 'security' | 'performance' | 'quality';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filePaths?: string[];
}
