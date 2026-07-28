import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgentService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.agent.findMany({
      include: { model: true, skills: { include: { skill: true } } },
    });
  }

  findOne(id: number) {
    return this.prisma.agent.findUnique({
      where: { id },
      include: { model: true, skills: { include: { skill: true } } },
    });
  }

  create(data: { name: string; description?: string; systemPrompt?: string }) {
    return this.prisma.agent.create({ data });
  }

  update(id: number, data: { name?: string; description?: string; systemPrompt?: string }) {
    return this.prisma.agent.update({ where: { id }, data });
  }

  remove(id: number) {
    return this.prisma.agent.delete({ where: { id } });
  }

  async bindSkills(agentId: number, skillIds: number[]) {
    // Remove existing bindings
    await this.prisma.agentSkill.deleteMany({ where: { agentId } });
    // Create new bindings
    if (skillIds.length > 0) {
      await this.prisma.agentSkill.createMany({
        data: skillIds.map((skillId) => ({ agentId, skillId })),
      });
    }
    return this.findOne(agentId);
  }

  async bindModel(agentId: number, modelId: number) {
    return this.prisma.agent.update({
      where: { id: agentId },
      data: { modelId },
    });
  }
}
