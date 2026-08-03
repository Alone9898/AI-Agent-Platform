export interface RuntimeHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentRuntimeRequest {
  userId: number;
  agentId: number;
  message: string;
  conversationId?: string;
  messages?: RuntimeHistoryMessage[];
  temporarySkillIds?: number[];
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
