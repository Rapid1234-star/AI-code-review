import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { ProjectsModule } from '../projects/projects.module';
import { ReportsModule } from '../reports/reports.module';
import { TestingModule } from '../testing/testing.module';
import { GithubClient } from './github.client';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';
import { ChangePipelineService } from './pipeline.service';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [ProjectsModule, FilesModule, TestingModule, ReportsModule],
  controllers: [GithubController, WebhookController],
  providers: [GithubService, GithubClient, ChangePipelineService],
})
export class GithubModule {}
