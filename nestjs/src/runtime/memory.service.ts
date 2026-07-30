import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RuntimeHistoryMessage, RuntimeStep } from './runtime.types';

const MAX_CONTEXT_MESSAGES = 40;

@Injectable()
export class MemoryService {
  constructor(private readonly prisma: PrismaService) {}

  async prepareTurn(params: {
    userId: number;
    agentId: number;
    conversationId?: string;
    messages?: RuntimeHistoryMessage[];
    message: string;
  }): Promise<{
    conversationId: string;
    conversationCreated: boolean;
    userMessageId: number;
    messages: RuntimeHistoryMessage[];
    step: RuntimeStep;
  }> {
    const startedAt = Date.now();
    let conversation = params.conversationId
      ? await this.prisma.conversation.findFirst({
          where: {
            id: params.conversationId,
            userId: params.userId,
            agentId: params.agentId,
          },
        })
      : null;

    let seededCount = 0;
    const conversationCreated = !conversation;
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: { userId: params.userId, agentId: params.agentId },
      });

      const seedMessages = normalizeHistory(params.messages, params.message);
      if (seedMessages.length) {
        await this.prisma.conversationMessage.createMany({
          data: seedMessages.map((item) => ({
            conversationId: conversation.id,
            role: item.role,
            content: item.content,
          })),
        });
        seededCount = seedMessages.length;
      }
    }

    const [userMessage] = await this.prisma.$transaction([
      this.prisma.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          content: params.message,
        },
      }),
      this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      }),
    ]);

    const storedMessages = await this.prisma.conversationMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: MAX_CONTEXT_MESSAGES,
      select: { role: true, content: true },
    });
    const messages = storedMessages
      .reverse()
      .filter(
        (item): item is RuntimeHistoryMessage =>
          item.role === 'user' || item.role === 'assistant',
      );

    return {
      conversationId: conversation.id,
      conversationCreated,
      userMessageId: userMessage.id,
      messages,
      step: {
        type: 'memory',
        name: 'load_conversation_memory',
        status: 'completed',
        durationMs: Date.now() - startedAt,
        input: { seededMessages: seededCount },
        output: { contextMessages: messages.length },
      },
    };
  }

  async rollbackTurn(params: {
    conversationId: string;
    conversationCreated: boolean;
    userMessageId: number;
  }) {
    if (params.conversationCreated) {
      await this.prisma.conversation.deleteMany({
        where: { id: params.conversationId },
      });
      return;
    }

    await this.prisma.conversationMessage.deleteMany({
      where: {
        id: params.userMessageId,
        conversationId: params.conversationId,
        role: 'user',
      },
    });
  }

  async saveAssistantMessage(
    conversationId: string,
    content: string,
    steps: RuntimeStep[],
  ) {
    await this.prisma.$transaction([
      this.prisma.conversationMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          content,
          steps: JSON.stringify(steps),
        },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);
  }
}

function normalizeHistory(
  messages: RuntimeHistoryMessage[] | undefined,
  currentMessage: string,
): RuntimeHistoryMessage[] {
  if (!Array.isArray(messages)) return [];
  const normalized = messages
    .filter(
      (item): item is RuntimeHistoryMessage =>
        !!item &&
        (item.role === 'user' || item.role === 'assistant') &&
        typeof item.content === 'string' &&
        item.content.trim().length > 0,
    )
    .map((item) => ({ role: item.role, content: item.content.trim() }))
    .slice(-MAX_CONTEXT_MESSAGES);

  const last = normalized.at(-1);
  if (last?.role === 'user' && last.content === currentMessage) {
    normalized.pop();
  }
  return normalized;
}
