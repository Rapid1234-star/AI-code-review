import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { languageForPath, lineCount } from './language';
import { ExtractedFile, readZipSafely } from './zip-safe';

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  async list(userId: string, projectId: string, query?: string) {
    await this.projects.requireProject(userId, projectId);
    const files = await this.prisma.projectFile.findMany({
      where: { projectId },
      orderBy: { path: 'asc' },
      select: {
        id: true,
        path: true,
        language: true,
        sizeBytes: true,
        lineCount: true,
      },
    });
    const needle = query?.trim().toLowerCase();
    if (!needle) return files;
    return files.filter((file) => file.path.toLowerCase().includes(needle));
  }

  async content(userId: string, projectId: string, filePath: string) {
    await this.projects.requireProject(userId, projectId);
    const file = await this.prisma.projectFile.findUnique({
      where: { projectId_path: { projectId, path: filePath } },
    });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  async replaceAll(projectId: string, extracted: ExtractedFile[]) {
    if (extracted.length === 0) {
      throw new BadRequestException('No source files found in the archive');
    }
    await this.prisma.$transaction([
      this.prisma.projectFile.deleteMany({ where: { projectId } }),
      this.prisma.projectFile.createMany({
        data: extracted.map((file) => ({
          projectId,
          path: file.path,
          content: file.content,
          language: languageForPath(file.path),
          sizeBytes: Buffer.byteLength(file.content),
          lineCount: lineCount(file.content),
        })),
      }),
      this.prisma.project.update({
        where: { id: projectId },
        data: { updatedAt: new Date() },
      }),
    ]);
    return { stored: extracted.length };
  }

  async importZip(userId: string, projectId: string, buffer: Buffer) {
    await this.projects.requireProject(userId, projectId);
    let extracted: ExtractedFile[];
    try {
      extracted = readZipSafely(buffer);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid archive';
      throw new BadRequestException(message);
    }
    return this.replaceAll(projectId, extracted);
  }

  async upsertFiles(projectId: string, files: ExtractedFile[]) {
    for (const file of files) {
      await this.prisma.projectFile.upsert({
        where: { projectId_path: { projectId, path: file.path } },
        create: {
          projectId,
          path: file.path,
          content: file.content,
          language: languageForPath(file.path),
          sizeBytes: Buffer.byteLength(file.content),
          lineCount: lineCount(file.content),
        },
        update: {
          content: file.content,
          language: languageForPath(file.path),
          sizeBytes: Buffer.byteLength(file.content),
          lineCount: lineCount(file.content),
        },
      });
    }
  }

  async deletePaths(projectId: string, paths: string[]) {
    if (paths.length === 0) return;
    await this.prisma.projectFile.deleteMany({
      where: { projectId, path: { in: paths } },
    });
  }
}
