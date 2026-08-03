export type SkillRisk = 'low' | 'medium' | 'high';

export interface SkillMatchRequest {
  agentId: number;
  message: string;
  includeBoundSkills?: boolean;
}

export interface MatchedSkill {
  id: number;
  name: string;
  description: string | null;
  risk: SkillRisk;
  riskLabel: string;
  reason: string;
  capabilities: string[];
}

export interface SkillMatchResult {
  requestId?: string;
  expiresAt?: string;
  matches: MatchedSkill[];
}

export interface SkillConsentRequest {
  requestId: string;
  skillIds: number[];
}

export interface SkillConsentResult {
  token: string;
  skillIds: number[];
  expiresAt: string;
}
