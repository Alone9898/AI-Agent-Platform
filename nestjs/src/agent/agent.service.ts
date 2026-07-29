import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgentService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const agents = await this.prisma.agent.findMany({
      include: { model: true, skills: { include: { skill: true } } },
    });
    return agents.map((agent) => this.toSafeAgent(agent));
  }

  async findOne(id: number) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
      include: { model: true, skills: { include: { skill: true } } },
    });
    return agent ? this.toSafeAgent(agent) : null;
  }

  create(data: { name: string; description?: string; systemPrompt?: string }) {
    if (!data.name?.trim()) {
      throw new BadRequestException('Agent name is required');
    }
    return this.prisma.agent.create({ data });
  }

  update(id: number, data: { name?: string; description?: string; systemPrompt?: string }) {
    return this.prisma.agent.update({ where: { id }, data });
  }

  remove(id: number) {
    return this.prisma.agent.delete({ where: { id } });
  }

  async bindSkills(agentId: number, skillIds: number[]) {
    const agent = await this.prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const uniqueSkillIds = [...new Set(skillIds || [])];
    if (uniqueSkillIds.length > 0) {
      const count = await this.prisma.skill.count({
        where: { id: { in: uniqueSkillIds } },
      });
      if (count !== uniqueSkillIds.length) {
        throw new BadRequestException('One or more skills do not exist');
      }
    }

    await this.prisma.$transaction([
      this.prisma.agentSkill.deleteMany({ where: { agentId } }),
      ...(uniqueSkillIds.length > 0
        ? [
            this.prisma.agentSkill.createMany({
              data: uniqueSkillIds.map((skillId) => ({ agentId, skillId })),
            }),
          ]
        : []),
    ]);

    return this.findOne(agentId);
  }

  async bindModel(agentId: number, modelId: number | null) {
    if (modelId !== null && modelId !== undefined) {
      const model = await this.prisma.model.findUnique({ where: { id: modelId } });
      if (!model) {
        throw new BadRequestException('Model does not exist');
      }
    }

    return this.prisma.agent.update({
      where: { id: agentId },
      data: { modelId: modelId ?? null },
    });
  }

  private toSafeAgent(agent: any) {
    if (!agent.model) {
      return agent;
    }

    const { apiKeyValue: _apiKeyValue, ...safeModel } = agent.model;
    return {
      ...agent,
      model: {
        ...safeModel,
        hasApiKey: Boolean(_apiKeyValue),
      },
    };
  }
}
