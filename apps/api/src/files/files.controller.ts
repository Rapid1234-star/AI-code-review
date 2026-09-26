import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { FilesService } from './files.service';

const MAX_ZIP = 20 * 1024 * 1024;

@Controller('projects/:projectId/files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Query('q') q?: string,
  ) {
    return this.files.list(user.id, projectId, q);
  }

  @Get('content')
  content(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Query('path') filePath?: string,
  ) {
    if (!filePath) throw new BadRequestException('File path is required');
    return this.files.content(user.id, projectId, filePath);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_ZIP },
    }),
  )
  upload(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @UploadedFile()
    file?: { originalname: string; mimetype: string; buffer: Buffer },
  ) {
    if (!file) throw new BadRequestException('Choose a ZIP file to upload');
    const name = file.originalname.toLowerCase();
    const type = file.mimetype;
    const zipType =
      !type ||
      type === 'application/zip' ||
      type === 'application/x-zip-compressed' ||
      type === 'application/octet-stream';
    if (!name.endsWith('.zip') || !zipType) {
      throw new BadRequestException('Only ZIP archives are accepted');
    }
    return this.files.importZip(user.id, projectId, file.buffer);
  }
}
