import { Module } from '@nestjs/common';
import { CryptoService } from '../common/crypto.service';
import { AiService } from './ai.service';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

@Module({
  controllers: [ProvidersController],
  providers: [AiService, ProvidersService, CryptoService],
  exports: [AiService, ProvidersService],
})
export class AiModule {}
