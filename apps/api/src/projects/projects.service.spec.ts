import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';

describe('ProjectsService authorization', () => {
  it('rejects access when the project is not owned by the user', async () => {
    const prisma = {
      project: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new ProjectsService(prisma as never);
    await expect(service.get('user-a', 'project-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: { id: 'project-b', userId: 'user-a' },
    });
  });
});
