import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ToolRegistry } from '../runtime/tool-registry';
import { MatchedSkill, SkillMatchRequest, SkillRisk } from './skill-match.types';

interface StoredTool {
  name?: string;
  description?: string;
  scriptPath?: string;
}

interface SkillCandidate {
  id: number;
  name: string;
  description: string | null;
  prompt: string | null;
  tools: string | null;
}

interface IntentRule {
  test: RegExp;
  skillNames?: RegExp;
  toolNames?: string[];
  score: number;
  reason: string;
}

const MAX_MATCHES = 3;
const MIN_SCORE = 4;

const INTENT_RULES: IntentRule[] = [
  { test: /(最新|实时|新闻|热点|热搜|搜索|联网|价格|天气|政策|赛程|今天.*(?:新闻|热点|天气|价格)|今日.*(?:新闻|热点|天气|价格))/i, toolNames: ['web_search'], score: 10, reason: '需求包含实时信息或联网检索' },
  { test: /(新闻|热点|热搜|资讯|事件追踪|来源核验)/i, toolNames: ['web_fetch'], score: 7, reason: '热点整理需要读取和核验来源' },
  { test: /(https?:\/\/|网页|页面|链接|网址|url|总结.*网站|读取.*网站)/i, toolNames: ['web_fetch'], score: 11, reason: '需求需要读取网页内容' },
  { test: /(api|接口|json|http|endpoint|响应数据)/i, toolNames: ['http_request'], score: 8, reason: '需求涉及公开接口或 HTTP 数据' },
  { test: /(几点|时间|日期|星期|时区|现在.*时候|今天几号|(?:今天|今日).*(?:新闻|热点|热搜|资讯))/i, toolNames: ['get_current_time'], score: 10, reason: '需求需要确认当前日期和时间' },
  { test: /(计算|算一下|等于多少|数学|公式|百分比|加减乘除|\d+\s*[+*/^%-]\s*\d+)/i, toolNames: ['calculator'], score: 10, reason: '需求包含精确计算' },
  { test: /(读取|打开|查看|分析|总结).*(文件|文档|代码|csv|txt|md|pdf)/i, toolNames: ['read_file'], score: 10, reason: '需求需要读取本地文件' },
  { test: /(写入|保存|创建|修改|编辑|删除).*(文件|文档|代码|配置)/i, toolNames: ['write_file'], score: 12, reason: '需求可能修改本地文件' },
  { test: /(运行|执行|调试).*(代码|脚本|python|javascript|bash|bat|命令)/i, toolNames: ['execute_code'], score: 12, reason: '需求可能执行代码或脚本' },
  { test: /(代码|编程|开发|bug|报错|调试|重构|函数|vue|react|typescript|javascript|python|java|golang|rust)/i, skillNames: /代码|编程|开发/i, score: 8, reason: '需求属于编程任务' },
  { test: /(文案|小红书|公众号|博客|营销|广告|推广|脚本|标题)/i, skillNames: /文案|写作/i, score: 8, reason: '需求属于内容写作' },
  { test: /(翻译|译成|英文|中文|日文|韩文|法文|德文)/i, skillNames: /翻译/i, score: 9, reason: '需求包含翻译任务' },
  { test: /(总结|摘要|概括|提炼|要点)/i, skillNames: /总结|摘要/i, score: 8, reason: '需求需要提炼和总结' },
  { test: /(sql|数据库查询|查询语句)/i, skillNames: /sql/i, score: 9, reason: '需求涉及 SQL' },
  { test: /(邮件|email|邮箱|回复函)/i, skillNames: /邮件/i, score: 9, reason: '需求需要撰写邮件' },
  { test: /(客服|投诉|售后|客户回复)/i, skillNames: /客服/i, score: 9, reason: '需求属于客服沟通' },
  { test: /(数据分析|趋势|异常值|可视化|图表|统计)/i, skillNames: /数据分析/i, score: 8, reason: '需求需要数据分析' },
  { test: /(周报|本周工作|下周计划)/i, skillNames: /周报/i, score: 9, reason: '需求需要整理周报' },
  { test: /(json|表格|结构化|csv|字段)/i, skillNames: /结构化/i, score: 8, reason: '需求需要结构化输出' },
  { test: /(seo|搜索排名|关键词优化|meta description)/i, skillNames: /seo/i, score: 9, reason: '需求涉及 SEO 优化' },
];

@Injectable()
export class SkillMatcherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly toolRegistry: ToolRegistry,
  ) {}

  async match(request: SkillMatchRequest): Promise<MatchedSkill[]> {
    if (!Number.isInteger(request.agentId) || request.agentId <= 0) {
      throw new BadRequestException('agentId is required');
    }
    if (typeof request.message !== 'string' || !request.message.trim()) {
      throw new BadRequestException('message is required');
    }

    const agent = await this.prisma.agent.findUnique({
      where: { id: request.agentId },
      select: { skills: { select: { skillId: true } } },
    });
    if (!agent) throw new NotFoundException('Agent not found');

    const boundIds = request.includeBoundSkills
      ? []
      : agent.skills.map(({ skillId }) => skillId);
    const skills = await this.prisma.skill.findMany({
      where: boundIds.length ? { id: { notIn: boundIds } } : undefined,
      select: {
        id: true,
        name: true,
        description: true,
        prompt: true,
        tools: true,
      },
    });

    return skills
      .map((skill) => this.scoreSkill(request.message.trim(), skill))
      .filter((item): item is { score: number; match: MatchedSkill } => Boolean(item))
      .sort((left, right) => right.score - left.score || left.match.id - right.match.id)
      .slice(0, MAX_MATCHES)
      .map(({ match }) => match);
  }

  private scoreSkill(message: string, skill: SkillCandidate) {
    const tools = parseTools(skill.tools);
    const supportedNames = new Set(this.toolRegistry.supportedToolNames(skill.tools));
    const supportedTools = tools.filter((tool) =>
      typeof tool.name === 'string' && supportedNames.has(tool.name),
    );
    if (tools.length > 0 && supportedTools.length === 0 && !skill.prompt?.trim()) return null;
    const toolNames = [...supportedNames].map((name) => name.trim().toLowerCase());
    let score = 0;
    let reason = '';

    for (const rule of INTENT_RULES) {
      if (!rule.test.test(message)) continue;
      const matchesTool = rule.toolNames?.some((name) => toolNames.includes(name));
      const matchesName = rule.skillNames?.test(skill.name);
      if (!matchesTool && !matchesName) continue;
      if (rule.score > score) reason = rule.reason;
      score += rule.score;
    }

    const directKeyword = findDirectKeyword(message, skill.name);
    if (directKeyword) {
      score += 6;
      if (!reason) reason = `需求提到了“${directKeyword}”`;
    }

    if (score < MIN_SCORE) return null;
    const risk = assessRisk(supportedTools);
    return {
      score,
      match: {
        id: skill.id,
        name: cleanSkillName(skill.name),
        description: skill.description,
        risk,
        riskLabel: riskLabel(risk),
        reason: reason || '与当前需求高度相关',
        capabilities: toolNames.map(toolLabel).filter(unique).slice(0, 4),
      },
    };
  }
}

function parseTools(serialized: string | null): StoredTool[] {
  if (!serialized) return [];
  try {
    const parsed = JSON.parse(serialized);
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === 'object') : [];
  } catch {
    return [];
  }
}

function findDirectKeyword(message: string, skillName: string): string | null {
  const normalizedName = cleanSkillName(skillName)
    .replace(/助手|专家|能力|工具/g, '')
    .trim();
  if (normalizedName.length >= 2 && message.toLowerCase().includes(normalizedName.toLowerCase())) {
    return normalizedName;
  }
  for (let length = Math.min(4, normalizedName.length); length >= 2; length -= 1) {
    for (let index = 0; index <= normalizedName.length - length; index += 1) {
      const keyword = normalizedName.slice(index, index + length).trim();
      if (keyword.length >= 2 && message.toLowerCase().includes(keyword.toLowerCase())) {
        return keyword;
      }
    }
  }
  return null;
}

function cleanSkillName(name: string): string {
  return name.replace(/^\s*\[工具\]\s*/i, '').trim();
}

function assessRisk(tools: StoredTool[]): SkillRisk {
  if (tools.some((tool) => tool.scriptPath || /(write|delete|remove|execute|shell|bash|bat|install|command)/i.test(tool.name || ''))) {
    return 'high';
  }
  if (tools.some((tool) => /(read_file|web_|http|request|fetch|search)/i.test(tool.name || ''))) {
    return 'medium';
  }
  return 'low';
}

function riskLabel(risk: SkillRisk): string {
  if (risk === 'high') return '高权限';
  if (risk === 'medium') return '需要联网或读取';
  return '低风险';
}

function toolLabel(name: string): string {
  const labels: Record<string, string> = {
    web_search: '联网搜索',
    web_fetch: '网页阅读',
    http_request: 'HTTP 请求',
    get_current_time: '时间查询',
    calculator: '数据计算',
    read_file: '读取文件',
    write_file: '写入文件',
    execute_code: '执行代码',
  };
  return labels[name] || name.replace(/[_-]+/g, ' ');
}

function unique(value: string, index: number, values: string[]): boolean {
  return values.indexOf(value) === index;
}
