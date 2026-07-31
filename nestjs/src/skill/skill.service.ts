import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface SkillPreset {
  key: string;
  name: string;
  description: string;
  type: 'prompt' | 'tool' | 'mixed';
  prompt?: string;
  tools?: string; // JSON string
}

export interface SkillPageQuery {
  page?: string;
  pageSize?: string;
  keyword?: string;
  type?: string;
  sortBy?: string;
  sortOrder?: string;
}

const SKILL_PRESETS: SkillPreset[] = [
  // ========== 提示词类 ==========
  {
    key: 'code-assistant',
    name: '代码助手',
    description: '生成、审查和调试代码，支持多种编程语言',
    type: 'prompt',
    prompt: '你是一个资深全栈工程师。请根据用户的需求生成高质量代码。要求：\n1. 代码简洁、可读、有注释\n2. 遵循最佳实践和设计模式\n3. 考虑边界情况和错误处理\n4. 如果用户提供了 bug，先分析原因再给出修复方案\n5. 必要时给出使用示例',
  },
  {
    key: 'copywriting',
    name: '文案写作',
    description: '撰写营销文案、博客文章、社交媒体内容等',
    type: 'prompt',
    prompt: '你是一个专业的文案写手。请根据用户提供的主题、受众和风格要求，撰写引人入胜的文案。要求：\n1. 标题吸引眼球\n2. 语言简洁有力，避免冗余\n3. 善用修辞手法（排比、对比、类比）\n4. 结尾有明确的行动号召（CTA）\n5. 适配目标平台的风格（小红书/公众号/抖音等）',
  },
  {
    key: 'translator',
    name: '翻译专家',
    description: '高质量多语言翻译，保持原文语气和风格',
    type: 'prompt',
    prompt: '你是一个精通中英日韩法德西等多国语言的翻译专家。请遵循以下原则：\n1. 翻译准确，不遗漏不添加\n2. 保持原文的语气和风格（正式/口语/技术）\n3. 使用目标语言最自然的表达方式，避免机翻感\n4. 专业术语保留原文并在括号中给出翻译\n5. 如有歧义，给出多种翻译并说明区别',
  },
  {
    key: 'summarizer',
    name: '文档总结',
    description: '提炼长文档核心要点，生成结构化摘要',
    type: 'prompt',
    prompt: '你是一个专业的文档分析助手。请对用户提供的长文本进行总结。要求：\n1. 先给出一句话核心结论\n2. 然后列出 3-7 个关键要点，每个要点用一句话概括\n3. 如有数据或数字，保留关键数据\n4. 最后给出行动建议或下一步\n5. 使用 Markdown 格式输出',
  },
  {
    key: 'sql-generator',
    name: 'SQL 生成',
    description: '根据自然语言描述生成 SQL 查询语句',
    type: 'prompt',
    prompt: '你是一个 SQL 专家。请根据用户的自然语言描述和数据库表结构，生成正确的 SQL 查询。要求：\n1. 先确认理解的查询需求\n2. 生成 SQL 并添加注释说明每个部分\n3. 考虑性能优化（索引、避免全表扫描）\n4. 如果是复杂查询，先给出思路再给出代码\n5. 给出可能的边界情况和注意事项',
  },
  {
    key: 'email-writer',
    name: '邮件撰写',
    description: '撰写各类商务邮件、工作邮件、通知',
    type: 'prompt',
    prompt: '你是一个商务邮件撰写专家。请根据用户提供的场景和要点，撰写专业邮件。要求：\n1. 主题行简洁明了\n2. 开头有恰当的称呼\n3. 正文逻辑清晰，重点突出\n4. 语气得体（根据场景调整正式/友好）\n5. 结尾有明确的期望行动和礼貌署名',
  },
  {
    key: 'customer-service',
    name: '客服对话',
    description: '专业客服话术，处理咨询、投诉、售后',
    type: 'prompt',
    prompt: '你是一个经验丰富的客服代表。请遵循以下原则回复客户：\n1. 先表达理解和共情（"非常理解您的感受"）\n2. 准确回答客户问题，不回避\n3. 给出具体解决方案和时间承诺\n4. 语气友好专业，不卑不亢\n5. 如涉及退款/赔偿，按公司政策处理并给出替代方案',
  },
  {
    key: 'data-analysis',
    name: '数据分析',
    description: '分析数据趋势，给出可视化建议和洞察',
    type: 'prompt',
    prompt: '你是一个资深数据分析师。请对用户提供的数据进行分析。要求：\n1. 先概述数据整体情况和关键指标\n2. 发现趋势、异常值和对比差异\n3. 给出可能的原因假设\n4. 推荐合适的可视化图表类型\n5. 最后给出 2-3 条可执行的业务建议',
  },
  {
    key: 'weekly-report',
    name: '周报生成',
    description: '根据工作内容自动生成结构化周报',
    type: 'prompt',
    prompt: '你是一个工作周报撰写助手。请根据用户提供的本周工作内容，生成一份结构清晰的周报。格式：\n1. 本周完成事项（按优先级排列）\n2. 进行中事项及进度\n3. 遇到的问题与解决方案\n4. 下周工作计划\n5. 需要的支持与资源\n\n语言简洁专业，突出成果和数据。',
  },
  {
    key: 'knowledge-qa',
    name: '知识问答 (RAG)',
    description: '基于提供的知识库内容精准回答用户问题',
    type: 'prompt',
    prompt: '你是一个知识库问答助手。请严格基于用户提供的参考资料回答问题。要求：\n1. 只使用参考资料中的信息回答，不编造\n2. 如果资料中没有相关信息，明确告知"根据现有资料无法回答"\n3. 回答时引用来源段落\n4. 如果问题模糊，先澄清再回答\n5. 复杂问题分步骤回答，条理清晰',
  },
  {
    key: 'json-formatter',
    name: '结构化输出',
    description: '将自由文本转换为 JSON / 表格等结构化格式',
    type: 'prompt',
    prompt: '你是一个数据格式化专家。请将用户提供的自由文本转换为结构化格式。要求：\n1. 默认输出 JSON 格式，字段命名使用 camelCase\n2. 确保 JSON 合法可解析\n3. 对缺失字段使用 null 而非省略\n4. 如用户指定其他格式（CSV/Markdown 表格），按要求输出\n5. 嵌套数据保持合理层级，不超过 3 层',
  },
  {
    key: 'seo-optimizer',
    name: 'SEO 优化',
    description: '优化文章标题、关键词、描述以提升搜索排名',
    type: 'prompt',
    prompt: '你是一个 SEO 优化专家。请对用户提供的文章/页面内容进行优化。要求：\n1. 生成 3 个备选标题（含核心关键词，60 字符内）\n2. 撰写 Meta Description（155 字符内，含 CTA）\n3. 提取 5-8 个关键词（含长尾词）\n4. 建议 H2/H3 子标题结构\n5. 指出内容中可补充的内链/外链机会',
  },

  // ========== 工具类 ==========
  {
    key: 'web-search',
    name: '[工具] 联网搜索',
    description: '搜索互联网获取实时信息',
    type: 'tool',
    tools: JSON.stringify([{
      name: 'web_search',
      description: '搜索互联网获取实时信息，返回相关网页的标题、URL 和摘要',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词' },
        },
        required: ['query'],
      },
    }]),
  },
  {
    key: 'web-fetch',
    name: '[工具] 网页读取',
    description: '读取公开网页内容并提取文本摘要',
    type: 'tool',
    tools: JSON.stringify([{
      name: 'web_fetch',
      description: '读取公开网页内容，返回清洗后的文本摘要',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '要读取的公开 HTTP/HTTPS 网页地址' },
          maxChars: { type: 'number', description: '最多返回字符数，默认 6000，最多 20000' },
        },
        required: ['url'],
      },
    }]),
  },
  {
    key: 'http-request',
    name: '[工具] HTTP 请求',
    description: '向公开 HTTP/HTTPS 地址发送 GET 请求，读取网页原始响应或公开 API',
    type: 'tool',
    tools: JSON.stringify([{
      name: 'http_request',
      description: '向公开 HTTP/HTTPS 地址发送 GET 请求，适合读取公开 API 或网页原始响应',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '公开 HTTP/HTTPS URL' },
          query: {
            type: 'object',
            description: '追加到 URL 上的查询参数',
            additionalProperties: {
              oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
            },
          },
          headers: {
            type: 'object',
            description: '可选请求头，仅允许 Accept、Accept-Language、Cache-Control、User-Agent',
            additionalProperties: { type: 'string' },
          },
          maxChars: { type: 'number', description: '最多返回字符数，默认 20000，最多 50000' },
        },
        required: ['url'],
      },
    }]),
  },
  {
    key: 'read-file',
    name: '[工具] 读取文件',
    description: '读取本地文件内容（文本、代码、数据等）',
    type: 'tool',
    tools: JSON.stringify([{
      name: 'read_file',
      description: '读取指定路径的文件内容',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '文件的绝对路径' },
          encoding: { type: 'string', description: '文件编码，默认 utf-8' },
        },
        required: ['path'],
      },
    }]),
  },
  {
    key: 'write-file',
    name: '[工具] 写入文件',
    description: '将内容写入本地文件',
    type: 'tool',
    tools: JSON.stringify([{
      name: 'write_file',
      description: '将指定内容写入文件，不存在则创建',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '文件的绝对路径' },
          content: { type: 'string', description: '要写入的内容' },
        },
        required: ['path', 'content'],
      },
    }]),
  },
  {
    key: 'execute-code',
    name: '[工具] 执行代码',
    description: '在沙箱环境中执行代码片段并返回结果',
    type: 'tool',
    tools: JSON.stringify([{
      name: 'execute_code',
      description: '安全执行一段代码，支持 Python/JavaScript/Bash',
      parameters: {
        type: 'object',
        properties: {
          language: { type: 'string', enum: ['python', 'javascript', 'bash'], description: '代码语言' },
          code: { type: 'string', description: '要执行的代码' },
        },
        required: ['language', 'code'],
      },
    }]),
  },
  {
    key: 'current-time',
    name: '[工具] 获取时间',
    description: '获取当前日期和时间',
    type: 'tool',
    tools: JSON.stringify([{
      name: 'get_current_time',
      description: '获取当前的日期、时间和时区信息',
      parameters: {
        type: 'object',
        properties: {
          timezone: { type: 'string', description: '时区，如 Asia/Shanghai，默认本地时区' },
        },
      },
    }]),
  },
  {
    key: 'calculator',
    name: '[工具] 计算器',
    description: '执行精确的数学计算',
    type: 'tool',
    tools: JSON.stringify([{
      name: 'calculator',
      description: '执行数学表达式计算，支持四则运算、括号和幂运算',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: '数学表达式，如 "2 + 3 * 4"' },
        },
        required: ['expression'],
      },
    }]),
  },
];

@Injectable()
export class SkillService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.skill.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  async findPage(query: SkillPageQuery) {
    const page = Math.max(1, Number.parseInt(query.page || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(10, Number.parseInt(query.pageSize || '20', 10) || 20));
    const keyword = query.keyword?.trim();
    const type = ['prompt', 'tool', 'mixed'].includes(query.type || '') ? query.type : undefined;
    const sortBy = ['name', 'createdAt', 'updatedAt'].includes(query.sortBy || '')
      ? query.sortBy as 'name' | 'createdAt' | 'updatedAt'
      : 'updatedAt';
    const sortOrder: Prisma.SortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Prisma.SkillWhereInput = {
      ...(type ? { type } : {}),
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword } },
              { description: { contains: keyword } },
              { prompt: { contains: keyword } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.skill.findMany({
        where,
        orderBy: [{ [sortBy]: sortOrder }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.skill.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  findOne(id: number) {
    return this.prisma.skill.findUnique({ where: { id } });
  }

  async getPresets() {
    const existing = await this.prisma.skill.findMany({
      where: { name: { in: SKILL_PRESETS.map((preset) => preset.name) } },
      select: { name: true },
    });
    const importedNames = new Set(existing.map((skill) => skill.name));

    return SKILL_PRESETS.map((preset) => ({
      ...preset,
      imported: importedNames.has(preset.name),
    }));
  }

  create(data: { name: string; description?: string; type?: string; prompt?: string; tools?: string }) {
    return this.prisma.skill.create({ data });
  }

  update(id: number, data: { name?: string; description?: string; type?: string; prompt?: string; tools?: string }) {
    return this.prisma.skill.update({ where: { id }, data });
  }

  remove(id: number) {
    return this.prisma.skill.delete({ where: { id } });
  }
}
