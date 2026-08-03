import { BadRequestException, Injectable } from '@nestjs/common';
import { AgentRuntime } from '../runtime';
import { RuntimeHistoryMessage } from '../runtime/runtime.types';
import { SkillConsentService } from './skill-consent.service';
import {
  SkillConsentRequest,
  SkillConsentResult,
  SkillMatchRequest,
  SkillMatchResult,
} from './skill-match.types';
import { SkillMatcherService } from './skill-matcher.service';

export interface ChatRequest {
  agentId: number;
  message: string;
  conversationId?: string;
  messages?: RuntimeHistoryMessage[];
  temporarySkillIds?: number[];
  skillConsentToken?: string;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly runtime: AgentRuntime,
    private readonly skillMatcher: SkillMatcherService,
    private readonly skillConsent: SkillConsentService,
  ) {}

  async matchSkills(userId: number, request: SkillMatchRequest): Promise<SkillMatchResult> {
    validateUser(userId);
    const matches = await this.skillMatcher.match(request);
    if (matches.length === 0) return { matches: [] };
    const proposal = this.skillConsent.createProposal(
      userId,
      request.agentId,
      request.message,
      matches.map(({ id }) => id),
    );
    return { ...proposal, matches };
  }

  confirmSkills(
    userId: number,
    request: SkillConsentRequest,
  ): SkillConsentResult {
    validateUser(userId);
    if (typeof request?.requestId !== 'string' || !request.requestId.trim()) {
      throw new BadRequestException('requestId is required');
    }
    return this.skillConsent.confirm(userId, request.requestId, request.skillIds);
  }

  sendMessage(userId: number, request: ChatRequest) {
    validateUser(userId);
    if (typeof request?.message !== 'string') {
      throw new BadRequestException('message is required');
    }
    const temporarySkillIds = normalizeSkillIds(request.temporarySkillIds);
    if (temporarySkillIds.length > 0) {
      if (!request.skillConsentToken) {
        throw new BadRequestException('启用临时能力前需要用户确认');
      }
      this.skillConsent.consume(
        request.skillConsentToken,
        userId,
        request.agentId,
        request.message,
        temporarySkillIds,
      );
    } else if (request.skillConsentToken) {
      throw new BadRequestException('能力授权中缺少对应的 Skill');
    }

    const {
      skillConsentToken: _skillConsentToken,
      temporarySkillIds: _temporarySkillIds,
      ...runtimeRequest
    } = request;
    return this.runtime.run({ ...runtimeRequest, temporarySkillIds, userId });
  }
}

function validateUser(userId: number) {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new BadRequestException('Authenticated user is required');
  }
}

function normalizeSkillIds(skillIds: number[] | undefined): number[] {
  if (!Array.isArray(skillIds)) return [];
  return [...new Set(skillIds.filter((id) => Number.isInteger(id) && id > 0))].sort(
    (left, right) => left - right,
  );
}
