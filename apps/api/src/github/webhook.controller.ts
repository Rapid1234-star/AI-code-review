import { Controller, Headers, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { GithubService } from './github.service';

@Controller('github')
export class WebhookController {
  constructor(private readonly github: GithubService) {}

  @Post('webhook')
  webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-hub-signature-256') signature?: string,
    @Headers('x-github-event') event?: string,
  ) {
    const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    return this.github.handleWebhook(raw, signature, event, req.body);
  }
}
