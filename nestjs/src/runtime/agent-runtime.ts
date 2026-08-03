import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MemoryService } from './memory.service';
import { ModelClient } from './model-client';
import { ToolRegistry } from './tool-registry';
import {
  AgentRuntimeRequest,
  AgentRuntimeResult,
  RuntimeModelMessage,
  RuntimeStep,
} from './runtime.types';

const MAX_TOOL_ROUNDS = 5;
const TOOL_LIMIT_FINALIZATION_PROMPT =
  'Tool execution is complete. Do not request any more tools. Produce the best final answer now using the tool results already available. Clearly state any remaining uncertainty or missing information.';
const TOOL_FAILURE_FINALIZATION_PROMPT =
  'A required tool cannot run because its local configuration is incomplete. Do not request any more tools. Explain the missing configuration once and tell the user the concrete next step.';

@Injectable()
export class AgentRuntime {
  constructor(
    private readonly prisma: PrismaService,
    private readonly memory: MemoryService,
    private readonly modelClient: ModelClient,
    private readonly toolRegistry: ToolRegistry,
  ) {}

  async run(request: AgentRuntimeRequest): Promise<AgentRuntimeResult> {
    validateRequest(request);

    const agent = await this.prisma.agent.findUnique({
      where: { id: request.agentId },
      include: {
        model: true,
        skills: { include: { skill: true } },
      },
    });
    if (!agent) throw new NotFoundException('Agent not found');
    if (!agent.model) throw new BadRequestException('Agent has no model bound');
    if (!agent.model.apiKeyValue || !agent.model.baseUrl || !agent.model.modelName) {
      throw new BadRequestException('The bound model configuration is incomplete');
    }

    const temporarySkillIds = [...new Set(request.temporarySkillIds || [])];
    const temporarySkills = temporarySkillIds.length
      ? await this.prisma.skill.findMany({ where: { id: { in: temporarySkillIds } } })
      : [];
    if (temporarySkills.length !== temporarySkillIds.length) {
      throw new BadRequestException('One or more temporary skills do not exist');
    }
    const activeSkills = [
      ...agent.skills,
      ...temporarySkills
        .filter((skill) => !agent.skills.some(({ skill: bound }) => bound.id === skill.id))
        .map((skill) => ({ agentId: agent.id, skillId: skill.id, skill })),
    ];

    const memoryResult = await this.memory.prepareTurn({
      userId: request.userId,
      agentId: request.agentId,
      conversationId: request.conversationId,
      messages: request.messages,
      message: request.message.trim(),
    });
    const steps: RuntimeStep[] = [memoryResult.step];
    if (temporarySkills.length > 0) {
      steps.push({
        type: 'capability',
        name: 'enable_temporary_skills',
        status: 'completed',
        durationMs: 0,
        input: { skillIds: temporarySkills.map(({ id }) => id) },
        output: { skills: temporarySkills.map(({ name }) => name) },
      });
    }
    const tools = this.toolRegistry.resolve(
      activeSkills.map(({ skill }) => skill.tools),
    );
    const modelMessages: RuntimeModelMessage[] = [
      {
        role: 'system',
        content: buildSystemPrompt(
          { ...agent, skills: activeSkills },
          tools.map((tool) => tool.definition.function.name),
        ),
      },
      ...memoryResult.messages.map((item) => ({
        role: item.role,
        content: item.content,
      })),
    ];

    let finalizeAfterToolFailure = false;
    const blockedTools = new Map<string, string>();
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
      const finalizationReason = finalizeAfterToolFailure
        ? 'tool_failure'
        : round === MAX_TOOL_ROUNDS
          ? 'tool_limit'
          : null;
      const isFinalizationRound = finalizationReason !== null;
      if (isFinalizationRound) {
        modelMessages.push({
          role: 'system',
          content: finalizationReason === 'tool_failure'
            ? TOOL_FAILURE_FINALIZATION_PROMPT
            : TOOL_LIMIT_FINALIZATION_PROMPT,
        });
      }

      const llmStartedAt = Date.now();
      let completion;
      try {
        completion = await this.modelClient.complete({
          baseUrl: agent.model.baseUrl,
          apiKey: agent.model.apiKeyValue,
          providerKey: agent.model.providerKey,
          modelName: agent.model.modelName,
          messages: modelMessages,
          tools: isFinalizationRound
            ? undefined
            : tools.map((tool) => tool.definition),
        });
        steps.push({
          type: 'llm',
          name: isFinalizationRound
            ? `finalize_after_${finalizationReason}`
            : round === 0
              ? 'generate_response'
              : 'continue_after_tools',
          status: 'completed',
          durationMs: Date.now() - llmStartedAt,
          input: {
            configuredModel: agent.model.modelName,
            resolvedModel: completion.resolvedModel,
            messageCount: modelMessages.length,
            availableTools: isFinalizationRound
              ? []
              : tools.map((tool) => tool.definition.function.name),
          },
          output: {
            requestedTools: completion.toolCalls.map((call) => call.function.name),
            hasContent: Boolean(completion.content),
          },
        });
      } catch (error) {
        const message = toErrorMessage(error);
        steps.push({
          type: 'llm',
          name: isFinalizationRound
            ? `finalize_after_${finalizationReason}`
            : round === 0
              ? 'generate_response'
              : 'continue_after_tools',
          status: 'failed',
          durationMs: Date.now() - llmStartedAt,
          error: message,
        });
        await this.memory.rollbackTurn(memoryResult);
        throw new BadGatewayException(message);
      }

      if (isFinalizationRound || completion.toolCalls.length === 0) {
        const final = completion.content.trim();
        if (!final) {
          await this.memory.rollbackTurn(memoryResult);
          throw new BadGatewayException(
            isFinalizationRound
              ? `Model returned no final answer after ${finalizationReason}`
              : 'Model returned no final answer',
          );
        }
        try {
          await this.memory.saveAssistantMessage(memoryResult.conversationId, final, steps);
        } catch (error) {
          await this.memory.rollbackTurn(memoryResult);
          throw error;
        }
        return { conversationId: memoryResult.conversationId, final, steps };
      }

      modelMessages.push({
        role: 'assistant',
        content: completion.content || null,
        tool_calls: completion.toolCalls,
      });

      for (const toolCall of completion.toolCalls) {
        const toolStartedAt = Date.now();
        const registeredTool = tools.find(
          (item) => item.definition.function.name === toolCall.function.name,
        );
        let input: Record<string, unknown> = {};
        let output: unknown;
        let status: 'completed' | 'failed' = 'completed';
        let errorMessage: string | undefined;
        let shouldRecordStep = true;

        const blockedReason = blockedTools.get(toolCall.function.name);
        if (blockedReason) {
          status = 'failed';
          errorMessage = blockedReason;
          output = { error: blockedReason, skipped: true };
          shouldRecordStep = false;
        } else {
          try {
            input = parseToolInput(toolCall.function.arguments);
            if (!registeredTool) {
              throw new Error(`Tool ${toolCall.function.name} is not available`);
            }
            output = await this.toolRegistry.execute(registeredTool, input);
          } catch (error) {
            status = 'failed';
            errorMessage = toErrorMessage(error);
            output = { error: errorMessage };
            if (isNonRetryableToolError(errorMessage)) {
              blockedTools.set(toolCall.function.name, errorMessage);
              finalizeAfterToolFailure = true;
            }
          }
        }

        if (shouldRecordStep) {
          steps.push({
            type: 'tool',
            name: toolCall.function.name,
            status,
            durationMs: Date.now() - toolStartedAt,
            input,
            output: compactOutput(output),
            ...(errorMessage ? { error: errorMessage } : {}),
          });
        }
        modelMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(output),
        });
      }
    }

    await this.memory.rollbackTurn(memoryResult);
    throw new BadGatewayException('Agent could not produce a final answer');
  }
}

function validateRequest(request: AgentRuntimeRequest) {
  if (!Number.isInteger(request.userId) || request.userId <= 0) {
    throw new BadRequestException('Authenticated user is required');
  }
  if (!Number.isInteger(request.agentId) || request.agentId <= 0) {
    throw new BadRequestException('agentId is required');
  }
  if (typeof request.message !== 'string' || !request.message.trim()) {
    throw new BadRequestException('message is required');
  }
}

function buildSystemPrompt(
  agent: {
    name: string;
    description: string | null;
    systemPrompt: string | null;
    skills: Array<{
      skill: {
        name: string;
        description: string | null;
        prompt: string | null;
      };
    }>;
  },
  availableToolNames: string[],
): string {
  const skillPrompts = agent.skills
    .map(({ skill }) => {
      const prompt = skill.prompt?.trim();
      if (!prompt) return '';
      return `Skill: ${skill.name}\n${prompt}`;
    })
    .filter(Boolean)
    .join('\n\n');
  const availableTools = new Set(availableToolNames);
  const toolAvailabilityRules = [
    'Tool availability rules:',
    `- Enabled tools for this agent: ${availableToolNames.length ? availableToolNames.join(', ') : 'none'}.`,
    '- If the user asks for current time, current date, timezone, or other real-time clock information, use get_current_time. If get_current_time is not enabled, say in Chinese that the current Agent has not enabled the time tool and cannot query real-time clock information.',
    '- If the user asks to search the web, browse the internet, check latest/current news, prices, schedules, policies, or other live web information, use web_search. If web_search is not enabled, say in Chinese that the current Agent has not enabled the web search tool and cannot query live web information.',
    '- If the user asks to open, fetch, read, or summarize a URL or webpage, use web_fetch. If web_fetch is not enabled, say in Chinese that the current Agent has not enabled the webpage reading tool and cannot read external pages.',
    '- If the user asks to request a public API endpoint, inspect an HTTP response, or fetch raw JSON/text from a URL, use http_request. If http_request is not enabled, say in Chinese that the current Agent has not enabled the HTTP request tool and cannot request external APIs.',
    '- Do not guess, estimate, or fabricate external real-time information when the required tool is unavailable. You may still answer stable general knowledge normally.',
  ];

  if (!availableTools.has('get_current_time')) {
    toolAvailabilityRules.push('- get_current_time is unavailable for this Agent.');
  }
  if (!availableTools.has('web_search')) {
    toolAvailabilityRules.push('- web_search is unavailable for this Agent.');
  }
  if (!availableTools.has('web_fetch')) {
    toolAvailabilityRules.push('- web_fetch is unavailable for this Agent.');
  }
  if (!availableTools.has('http_request')) {
    toolAvailabilityRules.push('- http_request is unavailable for this Agent.');
  }

  return [
    agent.systemPrompt?.trim(),
    `You are agent "${agent.name}".`,
    agent.description?.trim()
      ? `Agent description: ${agent.description.trim()}`
      : '',
    skillPrompts ? `Active skill instructions:\n\n${skillPrompts}` : '',
    toolAvailabilityRules.join('\n'),
    'Use available tools when they are needed. Answer naturally and do not expose internal runtime details.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function parseToolInput(value: string): Record<string, unknown> {
  if (!value.trim()) return {};
  const parsed = JSON.parse(value);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('Tool arguments must be a JSON object');
  }
  return parsed;
}

function compactOutput(value: unknown): unknown {
  const serialized = JSON.stringify(value);
  if (!serialized || serialized.length <= 2000) return value;
  return `${serialized.slice(0, 2000)}…`;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof BadGatewayException) {
    const response = error.getResponse();
    if (typeof response === 'string') return response;
    if (response && typeof (response as any).message === 'string') {
      return (response as any).message;
    }
  }
  return error instanceof Error ? error.message : String(error);
}

function isNonRetryableToolError(message: string): boolean {
  return /(尚未配置|需要 API Key|需要填写服务地址|configuration is incomplete)/i.test(message);
}
