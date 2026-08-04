import { BadRequestException, Injectable } from '@nestjs/common';
import { AgentRuntime } from '../runtime';
import {
  RuntimeAttachment,
  RuntimeHistoryMessage,
} from '../runtime/runtime.types';
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
  attachments?: RuntimeAttachment[];
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
    const attachments = normalizeAttachments(request.attachments);
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
    return this.runtime.run({
      ...runtimeRequest,
      attachments,
      temporarySkillIds,
      userId,
    });
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

const MAX_ATTACHMENT_FILES = 5;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENT_CHARACTERS = 50_000;
const MAX_TOTAL_ATTACHMENT_CHARACTERS = 120_000;
const SUPPORTED_ATTACHMENT_EXTENSIONS = new Set([
  'docx', 'txt', 'md', 'markdown', 'csv', 'json', 'xml', 'html', 'htm',
  'log', 'yaml', 'yml', 'ini', 'conf', 'sql',
  'js', 'jsx', 'ts', 'tsx', 'vue', 'css', 'scss', 'less',
  'py', 'java', 'go', 'rs', 'c', 'h', 'cpp', 'hpp', 'cs', 'php', 'rb',
  'sh', 'bat', 'ps1',
]);

function normalizeAttachments(value: RuntimeAttachment[] | undefined): RuntimeAttachment[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new BadRequestException('attachments must be an array');
  if (value.length > MAX_ATTACHMENT_FILES) {
    throw new BadRequestException(`每次最多添加 ${MAX_ATTACHMENT_FILES} 个文件`);
  }

  let totalCharacters = 0;
  return value.map((attachment, index) => {
    if (!attachment || typeof attachment !== 'object') {
      throw new BadRequestException(`第 ${index + 1} 个附件格式无效`);
    }
    if (typeof attachment.name !== 'string') {
      throw new BadRequestException(`第 ${index + 1} 个附件缺少文件名`);
    }
    const name = attachment.name
      .trim()
      .replace(/[\u0000-\u001f<>:"/\\|?*]/g, '_');
    if (!name || name.length > 180) {
      throw new BadRequestException(`第 ${index + 1} 个附件文件名无效`);
    }
    const extension = name.includes('.') ? name.split('.').pop()?.toLowerCase() : '';
    if (!extension || !SUPPORTED_ATTACHMENT_EXTENSIONS.has(extension)) {
      throw new BadRequestException(`${name} 暂不支持解析`);
    }
    if (!Number.isInteger(attachment.size) || attachment.size < 0 || attachment.size > MAX_ATTACHMENT_BYTES) {
      throw new BadRequestException(`${name} 的文件大小无效或超过 10 MB`);
    }
    if (typeof attachment.content !== 'string' || !attachment.content.trim()) {
      throw new BadRequestException(`${name} 没有可读取的文本内容`);
    }
    if (attachment.content.includes('\u0000') || attachment.content.length > MAX_ATTACHMENT_CHARACTERS) {
      throw new BadRequestException(`${name} 的解析内容无效或超过 50000 个字符`);
    }
    totalCharacters += attachment.content.length;
    if (totalCharacters > MAX_TOTAL_ATTACHMENT_CHARACTERS) {
      throw new BadRequestException('本次附件解析内容总计不能超过 120000 个字符');
    }
    const mimeType = typeof attachment.mimeType === 'string'
      ? attachment.mimeType.trim().slice(0, 120)
      : '';
    return {
      name,
      mimeType: mimeType || 'text/plain',
      size: attachment.size,
      content: attachment.content,
      characterCount: attachment.content.length,
      truncated: attachment.truncated === true,
    };
  });
}
