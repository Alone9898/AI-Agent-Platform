import { Injectable } from '@nestjs/common';
import { AgentRuntime } from '../runtime';
import { RuntimeHistoryMessage } from '../runtime/runtime.types';

export interface ChatRequest {
  agentId: number;
  message: string;
  conversationId?: string;
  messages?: RuntimeHistoryMessage[];
}

@Injectable()
export class ChatService {
  constructor(private readonly runtime: AgentRuntime) {}

  sendMessage(userId: number, request: ChatRequest) {
    return this.runtime.run({ ...request, userId });
  }
}
