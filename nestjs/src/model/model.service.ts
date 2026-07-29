import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ProviderPreset {
  key: string;
  name: string;
  baseUrl: string;
  apiKeyUrl: string;
  models: { key: string; name: string }[];
}

const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    key: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    models: [
      { key: 'deepseek-v4', name: 'DeepSeek-V4' },
      { key: 'deepseek-v3', name: 'DeepSeek-V3' },
      { key: 'deepseek-r2', name: 'DeepSeek-R2' },
      { key: 'deepseek-r1', name: 'DeepSeek-R1' },
    ],
  },
  {
    key: 'zhipuai',
    name: '智谱 AI (ZhipuAI)',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiKeyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    models: [
      { key: 'glm-5', name: 'GLM-5' },
      { key: 'glm-5-flash', name: 'GLM-5-Flash' },
      { key: 'glm-4-plus', name: 'GLM-4-Plus' },
      { key: 'glm-4v-plus', name: 'GLM-4V-Plus' },
      { key: 'glm-4-flash', name: 'GLM-4-Flash' },
    ],
  },
  {
    key: 'moonshot',
    name: '月之暗面 (Kimi)',
    baseUrl: 'https://api.moonshot.cn/v1',
    apiKeyUrl: 'https://platform.moonshot.cn/console/api-keys',
    models: [
      { key: 'kimi-k2', name: 'Kimi-K2' },
      { key: 'moonshot-v1-128k', name: 'Moonshot-v1-128K' },
      { key: 'moonshot-v1-32k', name: 'Moonshot-v1-32K' },
      { key: 'moonshot-v1-8k', name: 'Moonshot-v1-8K' },
    ],
  },
  {
    key: 'baidu',
    name: '百度文心 (Baidu)',
    baseUrl: 'https://qianfan.baidubce.com/v2',
    apiKeyUrl: 'https://console.bce.baidu.com/qianfan/ais/console/onlineService',
    models: [
      { key: 'ernie-5.0', name: 'ERNIE-5.0' },
      { key: 'ernie-4.5-turbo', name: 'ERNIE-4.5-Turbo' },
      { key: 'ernie-speed-128k', name: 'ERNIE-Speed-128K' },
    ],
  },
  {
    key: 'aliyun',
    name: '阿里通义 (Qwen)',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyUrl: 'https://dashscope.console.aliyun.com/apiKey',
    models: [
      { key: 'qwen3-max', name: 'Qwen3-Max' },
      { key: 'qwen3-plus', name: 'Qwen3-Plus' },
      { key: 'qwen3-turbo', name: 'Qwen3-Turbo' },
      { key: 'qwen-plus', name: 'Qwen-Plus (Qwen2.5)' },
      { key: 'qwen-turbo', name: 'Qwen-Turbo (Qwen2.5)' },
    ],
  },
  {
    key: 'volcengine',
    name: '火山引擎 (豆包)',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    apiKeyUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey',
    models: [
      { key: 'doubao-1-5-pro-256k', name: '豆包-1.5-Pro-256K' },
      { key: 'doubao-1-5-pro-32k', name: '豆包-1.5-Pro-32K' },
      { key: 'doubao-1-5-lite-32k', name: '豆包-1.5-Lite-32K' },
    ],
  },
  {
    key: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    models: [
      { key: 'gpt-5', name: 'GPT-5' },
      { key: 'gpt-5-mini', name: 'GPT-5-Mini' },
      { key: 'gpt-5-nano', name: 'GPT-5-Nano' },
      { key: 'gpt-4o', name: 'GPT-4o' },
      { key: 'gpt-4o-mini', name: 'GPT-4o-mini' },
      { key: 'o3', name: 'o3' },
      { key: 'o4-mini', name: 'o4-mini' },
    ],
  },
  {
    key: 'anthropic',
    name: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com',
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { key: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
      { key: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { key: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' },
      { key: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    ],
  },
  {
    key: 'google',
    name: 'Google (Gemini)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    models: [
      { key: 'gemini-3-pro', name: 'Gemini 3 Pro' },
      { key: 'gemini-3-flash', name: 'Gemini 3 Flash' },
      { key: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { key: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    ],
  },
  {
    key: 'siliconflow',
    name: '硅基流动 (SiliconFlow)',
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKeyUrl: 'https://cloud.siliconflow.cn/account/ak',
    models: [
      { key: 'deepseek-ai/DeepSeek-V4', name: 'DeepSeek-V4' },
      { key: 'deepseek-ai/DeepSeek-R2', name: 'DeepSeek-R2' },
      { key: 'Qwen/Qwen3-235B-A22B', name: 'Qwen3-235B' },
      { key: 'THUDM/GLM-5', name: 'GLM-5' },
      { key: 'meta-llama/Llama-4-Maverick', name: 'Llama-4-Maverick' },
      { key: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama-3.3-70B' },
    ],
  },
  {
    key: 'tencent',
    name: '腾讯混元 (Tencent)',
    baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1',
    apiKeyUrl: 'https://console.cloud.tencent.com/hunyuan/api',
    models: [
      { key: 'hunyuan-t1', name: '混元-T1' },
      { key: 'hunyuan-pro', name: '混元-Pro' },
      { key: 'hunyuan-standard', name: '混元-Standard' },
      { key: 'hunyuan-lite', name: '混元-Lite' },
    ],
  },
  {
    key: 'iflytek',
    name: '讯飞星火 (iFlytek)',
    baseUrl: 'https://spark-api-open.xf-yun.com/v1',
    apiKeyUrl: 'https://console.xfyun.cn/services/bm35',
    models: [
      { key: 'spark-5.0-ultra', name: 'Spark-5.0-Ultra' },
      { key: 'spark-5.0', name: 'Spark-5.0' },
      { key: 'spark4.0-ultra', name: 'Spark-4.0-Ultra' },
      { key: 'spark-max', name: 'Spark-Max' },
    ],
  },
  {
    key: 'minimax',
    name: 'MiniMax',
    baseUrl: 'https://api.minimax.chat/v1',
    apiKeyUrl: 'https://platform.minimaxi.com/user-center/basic-information/interface-key',
    models: [
      { key: 'MiniMax-Text-02', name: 'MiniMax-Text-02' },
      { key: 'MiniMax-Text-01', name: 'MiniMax-Text-01' },
      { key: 'MiniMax-Text-01-live', name: 'MiniMax-Text-01-Live' },
    ],
  },
  {
    key: 'baichuan',
    name: '百川智能 (Baichuan)',
    baseUrl: 'https://api.baichuan-ai.com/v1',
    apiKeyUrl: 'https://platform.baichuan-ai.com/console/apikey',
    models: [
      { key: 'Baichuan-M2', name: 'Baichuan-M2' },
      { key: 'Baichuan4-Turbo', name: 'Baichuan4-Turbo' },
      { key: 'Baichuan4-Air', name: 'Baichuan4-Air' },
    ],
  },
  {
    key: 'stepfun',
    name: '阶跃星辰 (StepFun)',
    baseUrl: 'https://api.stepfun.com/v1',
    apiKeyUrl: 'https://platform.stepfun.com/interface-key',
    models: [
      { key: 'step-3', name: 'Step-3' },
      { key: 'step-2-16k', name: 'Step-2-16K' },
      { key: 'step-1-128k', name: 'Step-1-128K' },
      { key: 'step-1-flash', name: 'Step-1-Flash' },
    ],
  },
  {
    key: 'lingyiwanwu',
    name: '零一万物 (01.AI / Yi)',
    baseUrl: 'https://api.lingyiwanwu.com/v1',
    apiKeyUrl: 'https://platform.lingyiwanwu.com/apikeys',
    models: [
      { key: 'yi-3.5', name: 'Yi-3.5' },
      { key: 'yi-large', name: 'Yi-Large' },
      { key: 'yi-large-turbo', name: 'Yi-Large-Turbo' },
      { key: 'yi-medium', name: 'Yi-Medium' },
    ],
  },
  {
    key: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKeyUrl: 'https://console.groq.com/keys',
    models: [
      { key: 'llama-4-maverick', name: 'Llama-4-Maverick' },
      { key: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
      { key: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B' },
      { key: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
    ],
  },
  {
    key: 'xai',
    name: 'xAI (Grok)',
    baseUrl: 'https://api.x.ai/v1',
    apiKeyUrl: 'https://console.x.ai/',
    models: [
      { key: 'grok-4', name: 'Grok-4' },
      { key: 'grok-3', name: 'Grok-3' },
      { key: 'grok-3-mini', name: 'Grok-3-Mini' },
    ],
  },
  {
    key: 'mistral',
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    apiKeyUrl: 'https://console.mistral.ai/api-keys/',
    models: [
      { key: 'mistral-large-2', name: 'Mistral Large 2' },
      { key: 'codestral-2501', name: 'Codestral' },
      { key: 'open-mistral-nemo', name: 'Mistral Nemo' },
      { key: 'pixtral-large', name: 'Pixtral Large' },
    ],
  },
  {
    key: 'openrouter',
    name: 'OpenRouter (聚合)',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyUrl: 'https://openrouter.ai/keys',
    models: [
      { key: 'openai/gpt-5', name: 'GPT-5 (via OpenRouter)' },
      { key: 'anthropic/claude-opus-4', name: 'Claude Opus 4 (via OpenRouter)' },
      { key: 'google/gemini-3-pro', name: 'Gemini 3 Pro (via OpenRouter)' },
      { key: 'deepseek/deepseek-v4', name: 'DeepSeek-V4 (via OpenRouter)' },
      { key: 'meta-llama/llama-4-maverick', name: 'Llama-4-Maverick (via OpenRouter)' },
    ],
  },
];

@Injectable()
export class ModelService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const models = await this.prisma.model.findMany();
    return models.map((model) => this.toSafeModel(model));
  }

  async findOne(id: number) {
    const model = await this.prisma.model.findUnique({ where: { id } });
    return model ? this.toSafeModel(model) : null;
  }

  create(data: { name: string; provider?: string; providerKey?: string; modelName: string; baseUrl?: string; apiKeyValue?: string }) {
    if (!data.name?.trim() || !data.modelName?.trim()) {
      throw new BadRequestException('Model name and model identifier are required');
    }
    return this.prisma.model.create({ data }).then((model) => this.toSafeModel(model));
  }

  update(id: number, data: { name?: string; provider?: string; providerKey?: string; modelName?: string; baseUrl?: string; apiKeyValue?: string }) {
    return this.prisma.model.update({ where: { id }, data }).then((model) => this.toSafeModel(model));
  }

  remove(id: number) {
    return this.prisma.model.delete({ where: { id } }).then((model) => this.toSafeModel(model));
  }

  getProviderPresets(): ProviderPreset[] {
    return PROVIDER_PRESETS;
  }

  private toSafeModel(model: {
    id: number;
    name: string;
    provider: string | null;
    providerKey: string | null;
    modelName: string;
    baseUrl: string | null;
    apiKeyValue: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const { apiKeyValue: _apiKeyValue, ...safeModel } = model;
    return {
      ...safeModel,
      hasApiKey: Boolean(_apiKeyValue),
    };
  }
}
