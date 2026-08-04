export interface RuntimeHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface RuntimeAttachment {
  name: string;
  mimeType: string;
  size: number;
  content: string;
  characterCount: number;
  truncated: boolean;
}

export interface AgentRuntimeRequest {
  userId: number;
  agentId: number;
  message: string;
  conversationId?: string;
  messages?: RuntimeHistoryMessage[];
  temporarySkillIds?: number[];
  attachments?: RuntimeAttachment[];
}

export type RuntimeStepType = 'memory' | 'capability' | 'llm' | 'tool';
export type RuntimeStepStatus = 'completed' | 'failed';

export interface RuntimeStep {
  type: RuntimeStepType;
  name: string;
  status: RuntimeStepStatus;
  durationMs: number;
  input?: unknown;
  output?: unknown;
  error?: string;
}

export interface AgentRuntimeResult {
  conversationId: string;
  final: string;
  steps: RuntimeStep[];
}

export interface RuntimeToolDefinition {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

export interface RuntimeToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface RuntimeModelMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: RuntimeToolCall[];
}
