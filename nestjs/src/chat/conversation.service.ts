import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MAX_TITLE_LENGTH = 80;

interface ConversationListQuery {
  keyword?: string;
  agentId?: number;
  limit?: number;
}

@Injectable()
export class ConversationService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: number, query: ConversationListQuery = {}) {
    validateUser(userId);
    const keyword = query.keyword?.trim();
    const agentId = normalizeAgentId(query.agentId);
    const limit = normalizeLimit(query.limit);
    const conversations = await this.prisma.conversation.findMany({
      where: {
        userId,
        ...(agentId ? { agentId } : {}),
        ...(keyword
          ? {
              OR: [
                { title: { contains: keyword } },
                { messages: { some: { content: { contains: keyword } } } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        agent: { select: { id: true, name: true, description: true } },
        messages: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 1,
          select: { content: true, role: true },
        },
        _count: { select: { messages: true } },
      },
    });

    return conversations.map(({ messages, _count, ...conversation }) => ({
      ...conversation,
      title: conversation.title || createFallbackTitle(messages[0]?.content),
      preview: messages[0]?.content || '',
      messageCount: _count.messages,
    }));
  }

  async findOne(userId: number, id: string) {
    const conversation = await this.findOwnedConversation(userId, id, true);
    return {
      ...conversation,
      title:
        conversation.title ||
        createFallbackTitle(conversation.messages.find((message) => message.role === 'user')?.content),
      messages: conversation.messages.map((message) => ({
        ...message,
        steps: parseSteps(message.steps),
        attachments: parseAttachmentMetadata(message.attachments),
      })),
    };
  }

  async rename(userId: number, id: string, rawTitle?: string) {
    const title = rawTitle?.trim().replace(/\s+/g, ' ');
    if (!title) throw new BadRequestException('会话名称不能为空');
    if (title.length > MAX_TITLE_LENGTH) {
      throw new BadRequestException(`会话名称不能超过 ${MAX_TITLE_LENGTH} 个字符`);
    }
    await this.findOwnedConversation(userId, id);
    return this.prisma.conversation.update({
      where: { id },
      data: { title },
      select: { id: true, title: true, updatedAt: true },
    });
  }

  async remove(userId: number, id: string) {
    await this.findOwnedConversation(userId, id);
    await this.prisma.conversation.delete({ where: { id } });
    return { success: true };
  }

  private async findOwnedConversation(userId: number, id: string, withMessages = false) {
    validateUser(userId);
    const conversationId = id?.trim();
    if (!conversationId) throw new BadRequestException('conversationId is required');
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        agent: { select: { id: true, name: true, description: true } },
        messages: withMessages
          ? { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }
          : false,
      },
    });
    if (!conversation) throw new NotFoundException('会话不存在或已被删除');
    return conversation;
  }
}

function validateUser(userId: number) {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new BadRequestException('Authenticated user is required');
  }
}

function normalizeAgentId(agentId?: number): number | undefined {
  if (agentId === undefined) return undefined;
  if (!Number.isInteger(agentId) || agentId <= 0) {
    throw new BadRequestException('agentId must be a positive integer');
  }
  return agentId;
}

function normalizeLimit(limit?: number): number {
  if (limit === undefined) return DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new BadRequestException('limit must be a positive integer');
  }
  return Math.min(limit, MAX_LIMIT);
}

function createFallbackTitle(content?: string): string {
  const value = content?.trim().replace(/\s+/g, ' ') || '未命名对话';
  return value.length > 48 ? `${value.slice(0, 48)}…` : value;
}

function parseSteps(value: string | null): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseAttachmentMetadata(value: string | null): Array<{
  name: string;
  mimeType: string;
  size: number;
  characterCount: number;
  truncated: boolean;
}> {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (
        !item ||
        typeof item.name !== 'string' ||
        typeof item.mimeType !== 'string' ||
        !Number.isFinite(item.size) ||
        !Number.isFinite(item.characterCount)
      ) return [];
      return [{
        name: item.name,
        mimeType: item.mimeType,
        size: item.size,
        characterCount: item.characterCount,
        truncated: item.truncated === true,
      }];
    });
  } catch {
    return [];
  }
}
