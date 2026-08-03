import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';

interface ConsentContext {
  userId: number;
  agentId: number;
  messageHash: string;
  skillIds: number[];
  expiresAt: number;
}

const PROPOSAL_TTL_MS = 5 * 60 * 1000;
const GRANT_TTL_MS = 2 * 60 * 1000;

@Injectable()
export class SkillConsentService {
  private readonly proposals = new Map<string, ConsentContext>();
  private readonly grants = new Map<string, ConsentContext>();

  createProposal(userId: number, agentId: number, message: string, skillIds: number[]) {
    this.clearExpired();
    const requestId = randomUUID();
    const context = this.createContext(
      userId,
      agentId,
      message,
      skillIds,
      PROPOSAL_TTL_MS,
    );
    this.proposals.set(requestId, context);
    return { requestId, expiresAt: new Date(context.expiresAt).toISOString() };
  }

  confirm(userId: number, requestId: string, skillIds: number[]) {
    this.clearExpired();
    const proposal = this.proposals.get(requestId);
    if (!proposal || proposal.userId !== userId) {
      throw new BadRequestException('能力确认已失效，请重新发送需求');
    }

    const normalizedIds = normalizeSkillIds(skillIds);
    if (
      normalizedIds.length === 0 ||
      normalizedIds.some((skillId) => !proposal.skillIds.includes(skillId))
    ) {
      throw new BadRequestException('能力确认内容与匹配结果不一致');
    }

    this.proposals.delete(requestId);
    const token = randomBytes(32).toString('base64url');
    const grant: ConsentContext = {
      ...proposal,
      skillIds: normalizedIds,
      expiresAt: Date.now() + GRANT_TTL_MS,
    };
    this.grants.set(token, grant);
    return {
      token,
      skillIds: grant.skillIds,
      expiresAt: new Date(grant.expiresAt).toISOString(),
    };
  }

  consume(
    token: string,
    userId: number,
    agentId: number,
    message: string,
    skillIds: number[],
  ) {
    this.clearExpired();
    const grant = this.grants.get(token);
    if (!grant) {
      throw new BadRequestException('能力授权无效或已使用，请重新确认');
    }

    const normalizedIds = normalizeSkillIds(skillIds);
    const isValid =
      grant.userId === userId &&
      grant.agentId === agentId &&
      grant.messageHash === hashMessage(message) &&
      arraysEqual(grant.skillIds, normalizedIds);
    if (!isValid) {
      throw new BadRequestException('能力授权与当前请求不匹配');
    }

    // An approval is deliberately valid for one chat request only.
    this.grants.delete(token);
  }

  private createContext(
    userId: number,
    agentId: number,
    message: string,
    skillIds: number[],
    ttlMs: number,
  ): ConsentContext {
    return {
      userId,
      agentId,
      messageHash: hashMessage(message),
      skillIds: normalizeSkillIds(skillIds),
      expiresAt: Date.now() + ttlMs,
    };
  }

  private clearExpired() {
    const now = Date.now();
    for (const [key, value] of this.proposals) {
      if (value.expiresAt <= now) this.proposals.delete(key);
    }
    for (const [key, value] of this.grants) {
      if (value.expiresAt <= now) this.grants.delete(key);
    }
  }
}

function hashMessage(message: string): string {
  return createHash('sha256').update(message.trim(), 'utf8').digest('hex');
}

function normalizeSkillIds(skillIds: number[]): number[] {
  if (!Array.isArray(skillIds)) return [];
  return [...new Set(skillIds.filter((id) => Number.isInteger(id) && id > 0))].sort(
    (left, right) => left - right,
  );
}

function arraysEqual(left: number[], right: number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
