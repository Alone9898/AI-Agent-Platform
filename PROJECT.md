# 星曜 Agent Platform 项目说明

> 当前代码状态说明，更新于 2026-08-04。本文只记录仓库中已经实现的能力、接口和运行边界。

## 1. 项目概览

星曜 Agent Platform 由 `Tauri 2 + Vue 3 + NestJS + Prisma + SQLite` 桌面端和 `Go + Gin + PostgreSQL + Redis` 云端服务骨架组成。桌面端负责 Agent、Skill、Model、聊天运行时和本地工具执行；Gin 服务当前提供注册、登录、当前用户、健康检查、PostgreSQL 迁移和 Redis 连接能力。

当前项目的重点能力：

- Agent 管理：支持 Agent 基本信息、系统提示词、模型绑定和技能绑定
- Home 用户入口：支持直接输入目标、打开现有助手、查看推荐能力和继续最近会话
- 本地 Agent 模板：内置热点、行业、内容、文档、购物和出行六个任务助手，可确认模型和所需工具后开始对话
- Chat 对话系统：支持需求匹配、用户确认能力、文件拖入解析、专用任务助手、会话搜索、重命名、删除和上下文保存
- 对话呈现：支持工具调用时间线和经过清洗的 GFM Markdown，长表格可横向滚动
- Skill 技能库：支持 `prompt / tool / mixed` 三种类型，已针对大量技能做分页、搜索和过滤优化
- Model 管理：支持厂商预设和自定义模型配置
- Agent Runtime：负责组装 Agent、Model、Skill、会话记忆和工具调用
- 真实工具层：支持时间、计算器、七种 Provider 的联网搜索、公开网页读取和通用 HTTP GET 请求
- 认证与个人信息：后端 JWT 登录，默认管理员会自动初始化
- 桌面能力：系统托盘、单实例、关闭隐藏到托盘、Sidecar 启动后端服务
- 云端服务：已建立 Gin 模块化单体骨架，提供注册、登录、当前用户、健康检查和 PostgreSQL 初始迁移
- 视觉风格：前端已从模板化后台风格调整为更克制、实用、偏桌面产品的界面

---

## 2. 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | Vue 3 | 组合式 API + `<script setup>` |
| 构建 | Vite | 前端开发服务器和打包 |
| UI | Element Plus | 基础组件与表单能力 |
| 图标 | Element Plus Icons Vue | 页面导航、操作按钮和状态图标 |
| Markdown | marked + DOMPurify | 解析并清洗助手回复中的 GFM Markdown |
| Word 解析 | Mammoth | 在前端本地提取 DOCX 文本结构 |
| 状态管理 | Pinia | 前端全局状态 |
| 路由 | Vue Router | 页面路由与登录守卫 |
| HTTP | Axios | API 请求封装 |
| 后端 | NestJS | REST API 服务 |
| 运行时 | NestJS Provider | Agent Runtime、模型请求、工具注册、会话记忆 |
| 工具层 | Tool Handler | 时间、计算器、联网搜索、网页读取、HTTP 请求 |
| ORM | Prisma | 数据访问层 |
| 数据库 | SQLite | 本地轻量数据库 |
| 桌面壳 | Tauri 2 | Windows 桌面应用 |
| 桌面端语言 | Rust | Tauri 主进程、Sidecar 和托盘逻辑 |
| 后端语言 | TypeScript | 前后端统一 TS 开发体验 |
| 云端 API | Go + Gin | 注册登录、当前用户、健康检查和模块化服务骨架 |
| 云端数据库 | PostgreSQL | 当前迁移包含用户、账务、订单、Skill、设备和审计相关表 |
| 云端缓存 | Redis | 当前用于云端服务连接和就绪检查 |

---

## 3. 数据模型

当前 Prisma 里的核心模型如下：

- `User`：用户账号、密码哈希、昵称、角色、头像
- `Agent`：Agent 基本信息、描述、系统提示词、绑定模型
- `Skill`：技能名称、描述、类型、提示词、工具定义
- `Model`：模型名称、厂商、厂商预设 key、模型标识、Base URL、API Key
- `AgentSkill`：Agent 和 Skill 的多对多关联表
- `ToolSetting`：本机工具 Provider、服务地址和加密凭据
- `Conversation`：用户与指定 Agent 的一次对话会话，包含可自动生成和手动修改的标题
- `ConversationMessage`：会话内的单条消息，支持保存助手步骤和附件解析结果

说明：

- `Skill.type` 支持 `prompt`、`tool`、`mixed`
- `Skill.tools` 以 JSON 字符串保存工具定义
- `Conversation` 关联 `User` 和 `Agent`
- `ConversationMessage.role` 用于区分 `user`、`assistant` 等消息角色
- `ConversationMessage.steps` 用于保存运行时步骤记录
- `ConversationMessage.attachments` 独立保存用户附件的解析文本和元数据
- 启动时会自动补齐旧数据库所需的表和字段，`Prisma schema` 是当前权威定义

---

## 4. 对话系统与 Agent Runtime

### 4.1 Chat 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/chat/conversations` | 获取当前用户的会话列表，支持按 Agent、关键词和数量筛选 |
| GET | `/chat/conversations/:id` | 获取当前用户的单个会话及完整消息 |
| PUT | `/chat/conversations/:id` | 重命名当前用户的会话 |
| DELETE | `/chat/conversations/:id` | 删除当前用户的会话及其消息 |
| POST | `/chat/match-skills` | 根据本次需求匹配当前 Agent 尚未绑定的本地 Skill |
| POST | `/chat/skill-consent` | 用户确认后签发一次性临时能力授权 |
| POST | `/chat` | 向指定 Agent 发送消息 |

请求核心字段：

- `agentId`：本次对话使用的 Agent ID
- `message`：用户当前输入
- `conversationId`：可选，继续已有会话时传入
- `messages`：可选，前端当前上下文消息
- `temporarySkillIds`：可选，本次请求临时启用的 Skill ID 列表
- `skillConsentToken`：可选，必须与临时 Skill、用户、Agent 和原始消息一致的一次性授权
- `attachments`：可选，前端本地解析后的附件文本与元数据；不包含原始文件字节

返回核心字段：

- `conversationId`：本轮对话所属会话 ID
- `final`：模型最终回复
- `steps`：运行过程，包括记忆、临时能力启用、模型调用和工具调用步骤

### 4.2 需求匹配与用户确认

Chat 在真正调用模型前会先执行确定性能力匹配：

1. 根据用户输入识别联网、网页读取、时间、计算、写作、编程等意图
2. 只在本机已安装且当前 Agent 尚未绑定的 Skill 中选择，最多返回 3 项
3. 已有真实 Handler 或 `scriptPath` 的工具 Skill 才会被推荐；仅声明但无法执行的工具不会进入结果
4. 前端展示能力名称、匹配原因和风险等级，由用户选择“同意并启用”或“不用，继续对话”
5. 用户同意后，后端签发一次性授权；授权绑定当前用户、Agent、原始消息和 Skill 列表
6. `/chat` 验证授权后只在本次请求中合并 Skill，不写入 `AgentSkill`，也不创建临时 Agent
7. 用户拒绝、没有匹配或匹配服务暂不可用时，继续使用当前 Agent 的原有能力

匹配提案 5 分钟失效，确认后的授权 2 分钟失效且成功使用一次后立即删除。当前匹配基于确定性规则、本地 Skill 元数据和已注册工具能力。

Home 页提交需求时会写入草稿，并携带一次性发送和自动配置标记进入 Chat。Chat 会对所有已安装 Skill 做匹配，在用户确认后按能力组合创建或复用专用任务助手，继承当前 Agent 的 Model 并长期绑定匹配能力，然后再发送消息。相同能力组合不会重复创建 Agent；最近任务入口负责打开对应会话，快速开始入口则会打开已启用的本地助手，或在用户确认模型和联网能力后创建对应助手。

如果任务需要 `web_search` 但搜索 Provider 尚未配置，Chat 不会继续调用模型，而是保留草稿并引导用户进入系统设置。Runtime 遇到同一类不可重试的工具配置错误时，会跳过同批次的重复调用并要求模型直接说明配置步骤。

### 4.3 Runtime 流程

`nestjs/src/runtime/agent-runtime.ts` 是对话运行时核心，主要负责：

- 校验当前用户、Agent 和消息内容
- 加载 Agent 绑定的 Model 和 Skill，并合并本次已授权的临时 Skill
- 组合 Agent 系统提示词与 Skill 提示词
- 准备会话记忆，并把当前用户消息写入会话
- 把附件正文作为不受信任的用户资料加入模型上下文，不允许其覆盖系统、Agent 或 Skill 指令
- 调用 OpenAI 兼容模型接口
- 根据模型返回的 tool calls 执行本地工具
- 最多允许 5 轮工具调用；达到上限后会关闭工具并要求模型基于已有结果完成回答
- 生成最终回复后保存助手消息
- 模型请求失败或最终仍无法生成回答时回滚当前对话轮次

### 4.4 工具调用

Runtime 下的关键文件：

- `tool-registry.ts`：解析 Skill 中定义的工具
- `tool-executor.ts`：执行具体工具
- `model-client.ts`：封装模型请求
- `memory.service.ts`：处理会话创建、消息保存和失败回滚
- `runtime.types.ts`：运行时请求、消息、步骤等类型定义

真实工具层位于 `nestjs/src/tools/`，当前内置工具：

- `get_current_time`：获取当前日期、时间和时区信息
- `calculator`：执行四则运算、括号和幂运算
- `web_search`：通过用户本机选择的 Exa MCP、Bing、DuckDuckGo、博查、Tavily、SerpAPI 或 SearXNG 搜索互联网，返回标题、URL 和摘要
- `web_fetch`：读取公开 HTTP/HTTPS 网页内容，返回清洗后的文本
- `http_request`：向公开 HTTP/HTTPS 地址发送 GET 请求，读取公开 API 或网页原始响应

工具设计边界：

- Skill 负责声明 Agent 可以使用哪些工具，以及工具暴露给模型的描述和参数
- Tool Handler 负责真正执行工具逻辑
- `ToolHandlerRegistry` 负责注册内置工具 handler
- `ToolRegistry` 负责把数据库中的 Skill 工具声明解析成模型可调用的 function tools
- `scriptPath` 类型的 Python 工具仍然保留，默认执行超时时间为 30 秒
- `web_fetch` 会拒绝 localhost、内网地址、非 HTTP/HTTPS 协议和不支持的内容类型
- `http_request` 只允许 GET 请求，会限制响应体大小、重定向次数、请求头白名单，并拒绝 localhost、内网地址和非 HTTP/HTTPS 协议
- Agent 未绑定对应工具时，系统提示词会要求模型不要猜测当前时间、联网结果或网页内容，并用中文说明当前 Agent 未启用对应工具
- `write_file`、`execute_code` 这类高权限内置 Handler 当前未开放；自定义 `scriptPath` 工具会标记为高权限并要求本次确认

联网搜索在“系统设置 → 联网搜索”中配置，当前支持：

- `exa_mcp`：Exa 提供的免密钥公共 MCP 搜索通道，可开箱使用，但匿名额度和服务策略可能变化
- `bing`：免密钥读取 Bing 公开搜索结果，中国大陆可用性通常较好，但可能受到限流或页面结构变化影响
- `duckduckgo`：免密钥读取 DuckDuckGo 公开搜索结果，部分网络环境可能无法访问
- `bocha`：博查 Web Search，适合中文内容和中国境内网络环境，需要用户自己的 API Key
- `tavily`：Tavily，适合国际网络环境，需要用户自己的 API Key
- `serpapi`：通过 SerpAPI 获取 Google 等搜索引擎结果，需要用户自己的 API Key
- `searxng`：连接用户自建或企业部署的 SearXNG 服务，必须填写服务地址，API Key 非必需

免密钥 Provider 不等于永久、无限额度：搜索词会发送给对应公共服务，且可能受到匿名额度、IP 限流、网络环境或公开页面结构变化影响。星曜会明确标注此类通道，不将其描述为具备稳定性承诺的官方付费 API；需要稳定性的用户可以切换到博查、Tavily、SerpAPI 或自建 SearXNG。

API Key 不写入前端 `localStorage`、Agent 或 Skill。NestJS 会使用每次安装独立生成的 AES-256-GCM 主密钥加密后写入本机 SQLite；主密钥文件由 Tauri 放在应用数据目录。查询配置的接口只返回 `hasApiKey`，不会返回密钥明文，也不会同步到 Gin 云端。

开发环境仍兼容 `TAVILY_API_KEY`，也可以使用通用环境变量 `WEB_SEARCH_PROVIDER`、`WEB_SEARCH_API_KEY`、`WEB_SEARCH_BASE_URL`，但普通桌面用户无需配置系统环境变量。

### 4.5 本地 Agent 模板

项目随前端发布六个本地 Agent 模板，不新增后端接口，也不引入新的数据库字段：

- 今日热点雷达：面向所有用户，追踪全网重要事件、核验来源并总结趋势
- AI 行业情报：追踪模型发布、产品更新、融资事件和开源项目，并提炼对从业者的实际影响
- 内容选题雷达：从已核验热点中生成适合小红书、公众号和短视频的可执行选题
- 文档整理助手：读取用户粘贴或拖入的文档内容、检查格式并给出可在 Word 中执行的排版方案
- 购买对比助手：核对商品价格与参数，比较优缺点、适合人群和购买风险
- 出行计划助手：根据日期、预算和同行人员规划路线、估算费用并整理出发前提醒

模板定义位于 `frontend/src/presets/agent-presets.ts`，每个模板都有独立的系统提示词、任务边界、能力标签、快捷提问和所需 Skill 清单。创建流程封装在 `frontend/src/services/agent-preset.ts`，Home 页和 Agent 管理页共用同一套逻辑。

用户在 Home 快速开始或 Agent 管理页点击尚未启用的模板后，前端会：

1. 让用户选择一个现有 Model
2. 按工具函数名检查时间、联网搜索、网页读取和 HTTP 请求 Skill
3. 通过现有 `/skills/presets` 和 Skill CRUD 接口导入缺失的预置 Skill
4. 通过现有 Agent CRUD 接口创建对应助手，绑定所选 Model 和上述 Skill
5. 使用本地存储记录该模板对应的 Agent ID，并跳转到聊天页

如果模型或 Skill 绑定失败，前端会删除本次未完成的 Agent，避免留下半配置数据。聊天页识别到任一本地模板且当前会话为空时，会展示该助手自己的三条快捷提问；点击后只填入输入框，不会自动发送。

运行边界：

- 购买对比、出行计划和三个资讯类助手依赖用户在本机设置中保存一个搜索 Provider；免密钥、用户自带 Key 和自建服务使用同一 `web_search` 工具入口
- 网页读取和 HTTP 请求继续遵循现有公网地址、响应大小和内容类型限制
- 需要实时信息的五个助手都会要求模型先确认时间、核验来源，并明确标注单一来源或待核实信息
- 文档整理助手可读取拖入的 DOCX 和常见文本文件并提供排版方案；仓库尚未实现 Word 文件写入和 PDF 导出工具，助手会明确提示该边界
- 模板只保存在前端代码和浏览器本地映射中，不从远程服务动态下载

---

## 5. Skill 技能库

Skill 是当前本地能力定义、工具声明和 Agent 能力绑定的核心入口。

### 5.1 数据结构

`Skill` 主要字段：

- `id`
- `name`
- `description`
- `type`
- `prompt`
- `tools`
- `createdAt`
- `updatedAt`

### 5.2 后端接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/skills` | 获取全部 Skill，保留给兼容场景使用 |
| GET | `/skills/page` | 分页查询 Skill，适合大量数据 |
| GET | `/skills/presets` | 获取预置技能列表 |
| GET | `/skills/:id` | 获取单个 Skill |
| POST | `/skills` | 新建 Skill |
| PUT | `/skills/:id` | 更新 Skill |
| DELETE | `/skills/:id` | 删除 Skill |

`/skills/page` 支持这些参数：

- `page`
- `pageSize`
- `keyword`
- `type`
- `sortBy`
- `sortOrder`

### 5.3 分页优化点

- `pageSize` 会限制在 `10 ~ 100`
- 搜索会覆盖 `name`、`description`、`prompt`
- 类型过滤支持 `prompt / tool / mixed`
- 排序字段只允许 `name / createdAt / updatedAt`
- 后端已经为 `type`、`name`、`updatedAt` 建了索引

### 5.4 前端 `SkillManage` 优化点

- 搜索防抖
- 类型筛选
- 排序切换
- 20 / 50 / 100 分页
- 预置技能折叠展示
- 导入状态标记
- CRUD 后局部刷新，不再每次整库重拉
- 空状态和筛选状态更清晰
- 已接入可执行预置工具 Skill 包含联网搜索、网页读取、HTTP 请求、获取时间和计算器

---

## 6. 前端页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/login` | `Login.vue` | 登录页 |
| `/home` | `Home.vue` | 用户目标输入、快捷入口和最近任务 |
| `/agents` | `AgentManage.vue` | Agent 管理 |
| `/chat` | `Chat.vue` | Agent 对话页 |
| `/skills` | `SkillManage.vue` | Skill 管理 |
| `/models` | `ModelManage.vue` | Model 管理 |
| `/settings` | `Settings.vue` | 系统设置 |

前端关键位置：

- `frontend/src/App.vue`：应用主框架、侧边导航和用户区域
- `frontend/src/router/index.ts`：页面路由与登录守卫
- `frontend/src/api/index.ts`：Axios 封装和 API 定义
- `frontend/src/stores/index.ts`：Pinia 状态管理
- `frontend/src/views/Chat.vue`：对话页容器
- `frontend/src/presets/agent-presets.ts`：本地 Agent 模板定义
- `frontend/src/components/chat/ChatSidebar.vue`：助手切换、会话搜索、历史记录和会话操作
- `frontend/src/components/chat/ChatWindow.vue`：消息列表、空状态、滚动容器和运行步骤展示
- `frontend/src/components/chat/ChatInput.vue`：聊天输入区

聊天页当前前端行为：

- 消息正文、步骤和会话标题以本机 SQLite 为准，前端只在 `localStorage` 保存未发送草稿和当前助手
- 对话区和输入区都支持拖入文件；DOCX 与常见文本、代码、配置文件在前端本地解析，原始文件不会上传或写入数据库
- 单次最多添加 5 个文件，每个源文件最大 10 MB，每个文件最多保留 50000 个解析字符，单次消息总计最多 120000 个解析字符
- 用户消息显示附件名称、大小、字符数和截断状态；历史接口只返回这些元数据，附件正文只供 Runtime 组装模型上下文
- Chat 左栏支持切换助手、新建对话、搜索历史、重命名和删除
- 切换助手时恢复该助手最近更新的会话，也可以通过 `conversationId` 直接打开指定历史记录
- Home 的“继续上次任务”读取真实会话列表，不再依赖浏览器消息缓存
- 第一次发送消息时自动创建会话，并以用户需求生成可修改的默认标题
- 助手回复使用经过清洗的 GFM Markdown 渲染，支持标题、列表、引用、代码块、链接和可横向滚动的数据表格
- 短对话保持贴近底部，长对话支持正常滚动查看上下文
- 发送中、失败、空状态都有独立界面反馈

设置页的联网搜索配置通过本地接口保存：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/tool-settings/web-search/providers` | 获取支持的搜索 Provider 与地区说明 |
| GET | `/tool-settings/web-search` | 获取配置状态，不返回 API Key 明文 |
| PUT | `/tool-settings/web-search` | 保存本机 Provider，并按需加密保存 API Key 或 SearXNG 地址 |
| DELETE | `/tool-settings/web-search` | 清除本机联网搜索配置 |

---

## 7. 认证与账号

当前认证是可用的后端 JWT 模式：

- 第一次启动会自动创建默认管理员
- 默认账号：`admin`
- 默认密码：`123456`
- 前端会把 token 存在 `localStorage`

相关接口：

- `POST /auth/login`
- `GET /auth/me`
- `PUT /auth/profile`
- `PUT /auth/password`
- `POST /auth/logout`

---

## 8. Tauri 桌面壳

### 8.1 运行方式

Tauri 启动后会通过 Sidecar 拉起 NestJS 后端：

- `src-tauri/src/sidecar.rs`
- 实际执行的是 `nestjs/dist/main.js`
- 后端会被注入 `DATABASE_URL` 和 `PORT=3000`
- 数据库文件放在 Tauri 应用数据目录下

### 8.2 桌面特性

- 系统托盘
- 单实例运行
- 窗口关闭隐藏到托盘

---

## 9. 启动与构建

### 9.1 Windows 一键启动

根目录 `start.bat` 是当前 Windows 开发启动入口，主要流程：

- 请求管理员权限
- 检查 Node.js、npm、Rust/Cargo
- 补充 Cargo 路径
- 清理旧客户端进程
- 释放 `1420` 和 `3000` 端口
- 构建 NestJS 后端
- 检查 `nestjs/dist/main.js`
- 启动 `npx tauri dev -v`
- 写入 `start.log`

检查模式：

```bat
start.bat --check
```

检查模式只走环境检查、端口清理和后端构建，不启动 Tauri 窗口。

### 9.2 安装依赖

```bash
npm install
cd frontend && npm install
cd nestjs && npm install && npm run prisma:generate
```

### 9.3 开发模式

```bash
cd nestjs && npm run start:dev
cd frontend && npm run dev
```

如果要启动完整桌面应用：

```bash
cd nestjs && npm run build
npm run tauri dev
```

### 9.4 生产构建

```bash
cd nestjs && npm run build
npm run tauri build
```

构建产物会输出到 `src-tauri/target/release/bundle/`。

---

## 10. 项目结构

```text
D:\AIAgentPlatform\
├─ frontend/                         前端（Vue 3 + Vite）
│  ├─ src/
│  │  ├─ api/                        Axios 封装和 API 定义
│  │  ├─ components/
│  │  │  └─ chat/                    聊天页拆分组件
│  │  ├─ presets/                    本地 Agent 模板
│  │  ├─ router/                     路由与守卫
│  │  ├─ stores/                     Pinia 状态
│  │  ├─ views/                      页面
│  │  └─ App.vue                     应用主框架
│  └─ vite.config.ts
├─ nestjs/                           后端（NestJS + Prisma）
│  ├─ src/
│  │  ├─ agent/                      Agent 模块
│  │  ├─ auth/                       登录与账号管理
│  │  ├─ chat/                       对话、会话管理、能力匹配与一次性授权
│  │  ├─ model/                      Model 模块
│  │  ├─ prisma/                     PrismaService
│  │  ├─ runtime/                    Agent Runtime
│  │  ├─ skill/                      Skill 模块
│  │  ├─ tool-settings/              本地工具 Provider 与加密凭据配置
│  │  └─ tools/                      真实工具 handler 与搜索 Provider
│  └─ prisma/schema.prisma
├─ gin-server/                       云端 API（Go + Gin）
│  ├─ cmd/                           API 与数据库迁移入口
│  ├─ internal/
│  │  ├─ app/                        依赖装配与优雅停机
│  │  ├─ modules/                    identity、health 等业务模块
│  │  ├─ platform/                   PostgreSQL、Redis、JWT、密码能力
│  │  └─ transport/http/             总路由与全局中间件
│  ├─ migrations/                    PostgreSQL 版本化迁移
│  ├─ compose.yaml                   本地完整云端环境
│  └─ README.md                      云端架构和扩展规范
├─ src-tauri/                        Tauri 桌面壳
│  ├─ src/
│  │  ├─ lib.rs
│  │  ├─ main.rs
│  │  ├─ sidecar.rs
│  │  └─ tray.rs
│  └─ tauri.conf.json
├─ start.bat                         Windows 开发启动脚本
└─ PROJECT.md
```

---

## 11. 关键实现说明

- `nestjs/src/chat/chat.controller.ts` 和 `nestjs/src/chat/chat.service.ts` 负责对话接口
- `nestjs/src/chat/conversation.service.ts` 负责当前用户的会话列表、详情、重命名和删除
- `nestjs/src/chat/skill-matcher.service.ts` 和 `skill-consent.service.ts` 负责能力匹配与一次性授权
- `nestjs/src/runtime/agent-runtime.ts` 是 Agent 执行主流程
- `nestjs/src/runtime/memory.service.ts` 负责会话记忆、消息保存和失败回滚
- `nestjs/src/runtime/model-client.ts` 负责 OpenAI 兼容模型请求
- `nestjs/src/runtime/tool-registry.ts` 负责把 Skill 工具声明解析成运行时工具
- `nestjs/src/runtime/tool-executor.ts` 负责兼容执行 `scriptPath` Python 工具
- `nestjs/src/tools/tool-handler.registry.ts` 负责注册真实工具 handler
- `nestjs/src/tool-settings/` 负责搜索 Provider 配置、配置状态接口和本地 API Key 加密
- `nestjs/src/tools/web-search/` 负责 Exa MCP、Bing、DuckDuckGo、博查、Tavily、SerpAPI、SearXNG Provider 与统一搜索入口
- `nestjs/src/tools/web-fetch/` 负责公开网页读取和文本清洗
- `nestjs/src/tools/http-request/` 负责公开 HTTP GET 请求、JSON 自动解析和响应截断
- `nestjs/src/skill/skill.controller.ts` 和 `nestjs/src/skill/skill.service.ts` 负责 Skill 的分页查询和 CRUD
- `frontend/src/views/Chat.vue` 和 `frontend/src/components/chat/` 是对话页主要实现
- `frontend/src/components/chat/ChatWindow.vue` 使用 marked 和 DOMPurify 安全呈现 Markdown、数据表格和工具步骤
- `frontend/src/views/Settings.vue` 提供免密钥、用户自带 Key 和自建搜索服务的配置入口
- `frontend/src/presets/agent-presets.ts` 定义随客户端发布的 Agent 模板与所需 Skill
- `frontend/src/services/agent-preset.ts` 负责查找、创建、绑定和清理本地模板 Agent
- `frontend/src/views/SkillManage.vue` 是当前技能库优化后的主界面
- `nestjs/prisma/schema.prisma` 是数据结构的权威来源
- `nestjs/src/main.ts` 负责数据库启动时兼容初始化和索引创建
- `src-tauri/src/sidecar.rs` 负责桌面端拉起后端服务

几个容易踩坑的地方：

- `GET /skills` 仍然保留，用来兼容需要全量列表的地方
- 如果修改 Skill 查询逻辑，`/skills/page` 和 `/skills` 要一起考虑
- Chat 请求需要已登录用户，后端会从 JWT 中读取当前用户
- Agent 发起对话前必须绑定完整可用的 Model 配置
- 使用 `web_search` 前要在系统设置中选择并保存一个搜索 Provider
- Exa MCP、Bing 和 DuckDuckGo 不要求 API Key，但会受到公共服务匿名额度、网络和限流影响
- 博查、Tavily 和 SerpAPI 使用用户自己的 API Key；SearXNG 使用用户填写的服务地址
- 搜索余额、额度、API Key 和公共通道限流错误会被视为不可重试错误，同批次不会重复调用
- 六个本地助手都不会绕过工具权限；需要工具的助手只会在用户确认后导入并绑定现有工具 Skill
- 工具 Skill 需要先导入；长期绑定到 Agent，或经用户确认后临时启用，模型才会收到对应 function tool
- 取消 Agent 的工具 Skill 后，模型不会再收到对应 function tool；实时信息类问题应提示未启用工具，而不是猜测
- `http_request` 适合读取公开 JSON API；需要登录、Cookie、私有 Header 或写操作的接口不在当前开放范围内
- 启动桌面应用前，要先保证 `nestjs/dist/main.js` 已经生成
- Windows 编译 Tauri 需要 Visual Studio Build Tools

---

## 12. 云端 Gin 服务

`gin-server/` 是独立部署的远程业务服务，不替代桌面端 NestJS。两者职责如下：

| 服务 | 职责 | 数据 |
|------|------|------|
| 本地 NestJS | Agent Runtime、模型调用、本地 Skill 与工具执行 | SQLite、本地文件 |
| 云端 Gin | 注册登录、当前用户、健康检查、数据库迁移与 Redis 就绪检查 | PostgreSQL、Redis |

云端采用模块化单体结构。当前已实现的 `identity` 模块按 `domain / application / infrastructure / delivery` 分层；服务同时提供 health 检查、PostgreSQL 迁移、Redis 连接和 HTTP 中间件。

### 12.1 当前接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health/live` | 进程存活检查 |
| GET | `/health/ready` | PostgreSQL、Redis 就绪检查 |
| POST | `/api/v1/auth/register` | 邮箱注册并自动创建积分账户 |
| POST | `/api/v1/auth/login` | 邮箱密码登录并签发 Access Token |
| GET | `/api/v1/users/me` | 获取当前云端用户 |

### 12.2 初始数据模型

- 用户与认证：`users`、`user_auth_identities`、`refresh_tokens`
- 积分账务：`wallet_accounts`、`wallet_transactions`
- 订单支付：`orders`、`payment_transactions`
- Skill 市场：`skills`、`skill_versions`、`skill_entitlements`、`skill_permissions`、`skill_downloads`、`skill_installs`
- 客户端分发：`devices`、`app_releases`
- 平台基础：`idempotency_records`、`audit_logs`、`outbox_events`

积分字段使用整数保存，不使用浮点数。迁移中包含余额流水、幂等记录、Skill 版本、权限声明、下载与安装记录；云端代码不执行用户上传的脚本。

### 12.3 启动方式

完整 Docker 环境：

```bash
cd gin-server
docker compose up -d --build
```

本机 Go 开发：

```bash
cd gin-server
go run ./cmd/migrate -direction up
go run ./cmd/api
```

环境变量模板位于 `gin-server/.env.example`。生产环境必须替换 JWT、数据库与 Redis 凭据，并通过部署平台的 Secret 管理注入。详细边界和模块扩展步骤见 `gin-server/README.md`。
