# 星曜 Agent Platform 项目说明

## 1. 项目概览

星曜 Agent Platform 是一个基于 `Tauri 2 + Vue 3 + NestJS + Prisma + SQLite` 的桌面端 AI Agent 管理平台。项目目标是把 Agent、Skill、Model、聊天运行时、登录态和桌面壳能力统一到一个本地桌面应用里，让用户可以配置、管理并直接使用自己的 AI Agent。

当前项目的重点能力：

- Agent 管理：支持 Agent 基本信息、系统提示词、模型绑定和技能绑定
- Chat 对话系统：支持选择 Agent 后直接发起对话，并保存会话上下文
- Skill 技能库：支持 `prompt / tool / mixed` 三种类型，已针对大量技能做分页、搜索和过滤优化
- Model 管理：支持厂商预设和自定义模型配置
- Agent Runtime：负责组装 Agent、Model、Skill、会话记忆和工具调用
- 真实工具层：支持时间、计算器、联网搜索、公开网页读取和通用 HTTP GET 请求
- 认证与个人信息：后端 JWT 登录，默认管理员会自动初始化
- 桌面能力：系统托盘、单实例、关闭隐藏到托盘、Sidecar 启动后端服务
- 视觉风格：前端已从模板化后台风格调整为更克制、实用、偏桌面产品的界面

---

## 2. 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | Vue 3 | 组合式 API + `<script setup>` |
| 构建 | Vite | 前端开发服务器和打包 |
| UI | Element Plus | 基础组件与表单能力 |
| 图标 | Lucide Vue | 页面导航、操作按钮和状态图标 |
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

---

## 3. 数据模型

当前 Prisma 里的核心模型如下：

- `User`：用户账号、密码哈希、昵称、角色、头像
- `Agent`：Agent 基本信息、描述、系统提示词、绑定模型
- `Skill`：技能名称、描述、类型、提示词、工具定义
- `Model`：模型名称、厂商、厂商预设 key、模型标识、Base URL、API Key
- `AgentSkill`：Agent 和 Skill 的多对多关联表
- `Conversation`：用户与指定 Agent 的一次对话会话
- `ConversationMessage`：会话内的单条消息，支持保存助手步骤信息

说明：

- `Skill.type` 支持 `prompt`、`tool`、`mixed`
- `Skill.tools` 以 JSON 字符串保存工具定义
- `Conversation` 关联 `User` 和 `Agent`
- `ConversationMessage.role` 用于区分 `user`、`assistant` 等消息角色
- `ConversationMessage.steps` 用于保存运行时步骤记录
- 启动时会自动补齐旧数据库所需的表和字段，`Prisma schema` 是当前权威定义

---

## 4. 对话系统与 Agent Runtime

### 4.1 Chat 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/chat` | 向指定 Agent 发送消息 |

请求核心字段：

- `agentId`：本次对话使用的 Agent ID
- `message`：用户当前输入
- `conversationId`：可选，继续已有会话时传入
- `messages`：可选，前端当前上下文消息

返回核心字段：

- `conversationId`：本轮对话所属会话 ID
- `final`：模型最终回复
- `steps`：运行过程，包括记忆、模型调用和工具调用步骤

### 4.2 Runtime 流程

`nestjs/src/runtime/agent-runtime.ts` 是对话运行时核心，主要负责：

- 校验当前用户、Agent 和消息内容
- 加载 Agent 绑定的 Model 和 Skill
- 组合 Agent 系统提示词与 Skill 提示词
- 准备会话记忆，并把当前用户消息写入会话
- 调用 OpenAI 兼容模型接口
- 根据模型返回的 tool calls 执行本地工具
- 最多允许 5 轮工具调用
- 生成最终回复后保存助手消息
- 模型失败或超过工具轮次时回滚当前对话轮次

### 4.3 工具调用

Runtime 下的关键文件：

- `tool-registry.ts`：解析 Skill 中定义的工具
- `tool-executor.ts`：执行具体工具
- `model-client.ts`：封装模型请求
- `memory.service.ts`：处理会话创建、消息保存和失败回滚
- `runtime.types.ts`：运行时请求、消息、步骤等类型定义

真实工具层位于 `nestjs/src/tools/`，当前内置工具：

- `get_current_time`：获取当前日期、时间和时区信息
- `calculator`：执行四则运算、括号和幂运算
- `web_search`：通过 Tavily 搜索互联网，返回标题、URL 和摘要
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
- `write_file`、`execute_code` 这类高权限能力暂不默认开放，后续需要确认、白名单和审计后再接入

`web_search` 依赖环境变量：

```bash
TAVILY_API_KEY=你的 Tavily Key
```

---

## 5. Skill 技能库

Skill 是目前最适合大量数据管理的模块，也是后续扩展 Agent 能力的核心入口。

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

如果后面技能数量继续增长，`SkillManage` 的分页查询仍然是最关键的支撑点。

---

## 6. 前端页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/login` | `Login.vue` | 登录页 |
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
- `frontend/src/components/chat/ChatSidebar.vue`：Agent 列表、会话入口和本地状态
- `frontend/src/components/chat/ChatWindow.vue`：消息列表、空状态、滚动容器和运行步骤展示
- `frontend/src/components/chat/ChatInput.vue`：聊天输入区

聊天页当前前端行为：

- 按 Agent 保存消息、草稿和 `conversationId`
- 切换 Agent 时恢复对应本地聊天状态
- 短对话保持贴近底部，长对话支持正常滚动查看上下文
- 发送中、失败、空状态都有独立界面反馈

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
- 自动更新能力已预留

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
│  │  ├─ router/                     路由与守卫
│  │  ├─ stores/                     Pinia 状态
│  │  ├─ views/                      页面
│  │  └─ App.vue                     应用主框架
│  └─ vite.config.ts
├─ nestjs/                           后端（NestJS + Prisma）
│  ├─ src/
│  │  ├─ agent/                      Agent 模块
│  │  ├─ auth/                       登录与账号管理
│  │  ├─ chat/                       对话接口
│  │  ├─ model/                      Model 模块
│  │  ├─ prisma/                     PrismaService
│  │  ├─ runtime/                    Agent Runtime
│  │  ├─ skill/                      Skill 模块
│  │  └─ tools/                      真实工具 handler
│  └─ prisma/schema.prisma
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
- `nestjs/src/runtime/agent-runtime.ts` 是 Agent 执行主流程
- `nestjs/src/runtime/memory.service.ts` 负责会话记忆、消息保存和失败回滚
- `nestjs/src/runtime/model-client.ts` 负责 OpenAI 兼容模型请求
- `nestjs/src/runtime/tool-registry.ts` 负责把 Skill 工具声明解析成运行时工具
- `nestjs/src/runtime/tool-executor.ts` 负责兼容执行 `scriptPath` Python 工具
- `nestjs/src/tools/tool-handler.registry.ts` 负责注册真实工具 handler
- `nestjs/src/tools/web-search/` 负责联网搜索工具，当前 provider 为 Tavily
- `nestjs/src/tools/web-fetch/` 负责公开网页读取和文本清洗
- `nestjs/src/tools/http-request/` 负责公开 HTTP GET 请求、JSON 自动解析和响应截断
- `nestjs/src/skill/skill.controller.ts` 和 `nestjs/src/skill/skill.service.ts` 负责 Skill 的分页查询和 CRUD
- `frontend/src/views/Chat.vue` 和 `frontend/src/components/chat/` 是对话页主要实现
- `frontend/src/views/SkillManage.vue` 是当前技能库优化后的主界面
- `nestjs/prisma/schema.prisma` 是数据结构的权威来源
- `nestjs/src/main.ts` 负责数据库启动时兼容初始化和索引创建
- `src-tauri/src/sidecar.rs` 负责桌面端拉起后端服务

几个容易踩坑的地方：

- `GET /skills` 仍然保留，用来兼容需要全量列表的地方
- 如果修改 Skill 查询逻辑，`/skills/page` 和 `/skills` 要一起考虑
- Chat 请求需要已登录用户，后端会从 JWT 中读取当前用户
- Agent 发起对话前必须绑定完整可用的 Model 配置
- 使用 `web_search` 前要配置 `TAVILY_API_KEY`
- 工具 Skill 需要先导入并绑定到 Agent，模型才会收到对应 function tool
- 取消 Agent 的工具 Skill 后，模型不会再收到对应 function tool；实时信息类问题应提示未启用工具，而不是猜测
- `http_request` 适合读取公开 JSON API；需要登录、Cookie、私有 Header 或写操作的接口不在当前开放范围内
- 启动桌面应用前，要先保证 `nestjs/dist/main.js` 已经生成
- Windows 编译 Tauri 需要 Visual Studio Build Tools

---

## 12. 后续可扩展方向

- Chat 可以继续增加会话列表、重命名、删除和搜索
- 对话回复可以升级为流式输出
- Agent 绑定技能的选择器可以做成远程搜索或虚拟列表
- Skill 继续增加时，可以在前端增加更强的虚拟滚动
- 认证可以继续扩展成更完整的多用户体系
- API Key 可以进一步做加密存储
