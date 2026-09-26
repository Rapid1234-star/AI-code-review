import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ProjectsModule } from '../projects/projects.module';
import { ReportsModule } from '../reports/reports.module';
import { TestExecutionService } from './test-execution.service';
import { TestGenerationService } from './test-generation.service';
import { TestingController } from './testing.controller';

@Module({
  imports: [AiModule, ProjectsModule, ReportsModule],
  controllers: [TestingController],
  providers: [TestGenerationService, TestExecutionService],
  exports: [TestGenerationService, TestExecutionService],
})
export class TestingModule {}
