# AI Agent Platform — 项目文档

## 1. 项目概述

AI Agent Platform 是一个基于 **Tauri 2 + Vue 3 + NestJS** 的桌面端 AI 智能代理管理平台。用户可以创建和管理 AI Agent，为其绑定模型（大脑）和技能（提示词），实现 Agent 的配置与编排。

**核心理念**：将每个 Agent 拟人化为"团队成员"，通过"招募"、"配置能力"等隐喻降低使用门槛。

**产品形态**：Windows 桌面应用（.exe），NestJS 后端以 Sidecar 进程方式由 Tauri 自动管理生命周期。

---

## 2. 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Vue 3 (Composition API + `<script setup>`) | 3.5+ |
| 构建工具 | Vite | 6.x |
| UI 组件库 | Element Plus | 2.9+ |
| 状态管理 | Pinia | 2.3+ |
| 路由 | Vue Router | 4.x |
| HTTP 客户端 | Axios | 1.7+ |
| 后端框架 | NestJS | 10.x |
| ORM | Prisma | 6.x |
| 数据库 | SQLite | — |
| 桌面框架 | Tauri | 2.x |
| 语言 | TypeScript (全栈) | 5.x |
| 桌面端语言 | Rust | — |

---

## 3. 快速开始

### 3.1 环境要求

- **Node.js** >= 18
- **Rust** (stable) + `rustc` >= 1.70
- **Windows Build Tools**（Tauri 编译需要 Visual Studio Build Tools）

### 3.2 安装依赖

```bash
# 根目录（Tauri CLI）
npm install

# 前端
cd frontend && npm install

# 后端
cd nestjs && npm install && npm run prisma:generate
```

### 3.3 开发模式

```bash
# 方式一：仅启动前后端（不含 Tauri 壳）
# 终端 1 — 后端
cd nestjs && npm run start:dev        # → http://localhost:3000

# 终端 2 — 前端
cd frontend && npm run dev            # → http://localhost:1420

# 方式二：完整 Tauri 桌面应用（推荐）
# 先构建后端（Sidecar 需要 dist）
cd nestjs && npm run build
# 再启动 Tauri（自动启动前端 dev server + Sidecar）
npm run tauri dev
```

### 3.4 构建发布版

```bash
cd nestjs && npm run build            # 构建后端
npm run tauri build                   # 构建 Windows exe
# 产物位于 src-tauri/target/release/bundle/
```

---

## 4. 目录结构

```
d:\AIAgentPlatform\
├── frontend/                  # 前端 (Vue 3 + Vite)
│   ├── src/
│   │   ├── api/index.ts       # Axios 实例 & 所有 API 接口定义
│   │   ├── router/index.ts    # 路由配置 & 导航守卫
│   │   ├── stores/index.ts    # Pinia Store (Auth/Agent/Skill/Model)
│   │   ├── views/
│   │   │   ├── Login.vue      # 登录页（渐变背景+浮动动画）
│   │   │   ├── AgentManage.vue# Agent 管理（拟人化卡片布局）
│   │   │   ├── SkillManage.vue# Skill 管理（预设网格+表格列表）
│   │   │   ├── ModelManage.vue# Model 管理（厂商预设+自定义双模式）
│   │   │   └── Settings.vue   # 系统设置（卡片式设置项）
│   │   ├── App.vue            # 根组件（侧边栏布局+用户菜单+个人/密码弹窗）
│   │   ├── main.ts            # 入口（挂载 Pinia/Router/ElementPlus/Icons）
│   │   └── vite-env.d.ts      # Vue SFC 类型声明
│   ├── index.html             # HTML 入口（lang="zh-CN"）
│   ├── vite.config.ts         # Vite 配置（端口 1420，@ 别名，Tauri 构建目标）
│   ├── tsconfig.json          # TS 配置（ES2021，@ 路径别名）
│   ├── tsconfig.node.json     # Vite 配置专用 TS
│   └── package.json
│
├── nestjs/                    # 后端 (NestJS + Prisma)
│   ├── src/
│   │   ├── agent/             # Agent 模块 (controller + service + module)
│   │   ├── skill/             # Skill 模块 (含 12 个预设技能硬编码)
│   │   ├── model/             # Model 模块 (含 20 个厂商预设硬编码)
│   │   ├── prisma/            # PrismaService (extends PrismaClient)
│   │   ├── app.module.ts      # 根模块（注册子模块，管理数据库连接生命周期）
│   │   └── main.ts            # 入口（CORS、原始 SQL 建表、端口 3000）
│   ├── prisma/
│   │   ├── schema.prisma      # 数据模型定义（权威来源）
│   │   ├── data.db            # SQLite 数据库文件（运行时生成，已 gitignore）
│   │   └── migrations/        # 数据库迁移历史
│   ├── .env                   # DATABASE_URL="file:./data.db" + PORT=3000
│   ├── nest-cli.json          # NestJS CLI 配置（deleteOutDir: true）
│   ├── tsconfig.json          # TS 配置（CommonJS，ES2021，装饰器支持）
│   └── package.json
│
├── src-tauri/                 # Tauri 桌面壳 (Rust)
│   ├── src/
│   │   ├── lib.rs             # 主入口（插件注册、窗口事件、Tauri 命令）
│   │   ├── main.rs            # 程序入口（隐藏控制台窗口）
│   │   ├── sidecar.rs         # NestJS Sidecar 启动/状态跟踪
│   │   └── tray.rs            # 系统托盘（图标+菜单+点击事件）
│   ├── capabilities/
│   │   └── default.json       # 权限声明（window/shell/autostart/updater）
│   ├── tauri.conf.json        # 全局配置（窗口/构建/安全/更新）
│   ├── build.rs               # Tauri 构建脚本
│   └── Cargo.toml             # Rust 依赖配置
│
├── .gitignore                 # Git 忽略规则
└── package.json               # 根脚本（tauri CLI、dev/build 快捷命令）
```

---

## 5. 数据模型 (Prisma Schema)

```
Agent (agents)                Skill (skills)
├── id: Int (PK)              ├── id: Int (PK)
├── name: String              ├── name: String
├── description: String?      ├── description: String?
├── systemPrompt: String?     ├── prompt: String?
├── modelId: Int? (FK→Model)  ├── createdAt: DateTime
├── createdAt: DateTime       └── updatedAt: DateTime
└── updatedAt: DateTime
                              AgentSkill (agent_skills)
Model (models)                ├── agentId: Int (FK→Agent)
├── id: Int (PK)              └── skillId: Int (FK→Skill)
├── name: String              (联合主键, 级联删除)
├── provider: String?
├── providerKey: String?      ← 厂商预设 key（如 "openai"）
├── modelName: String         ← 实际模型标识符
├── baseUrl: String?
├── apiKeyValue: String?      ← API 密钥（直接存在模型记录中）
├── createdAt: DateTime
└── updatedAt: DateTime
```

**关系说明**：
- Agent ↔ Model：多对一（每个 Agent 可绑定一个模型）
- Agent ↔ Skill：多对多（通过 AgentSkill 中间表）

### 5.1 数据库迁移历史

| 迁移名 | 内容 |
|---------|------|
| `init` | 初始化四张表：agents、skills、models、agent_skills，以及独立的 api_keys 表 |
| `merge_apikey_into_model_add_provider_fields` | 将 api_key 合并到 models 表（新增 `api_key_value`、`provider_key` 字段），移除 agents 表的 `api_key_id` 外键，删除独立 api_keys 表 |

---

## 6. 后端 API 接口

**Base URL**: `http://localhost:3000`

### 6.1 Agent 模块 (`/agents`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/agents` | 获取所有 Agent（含关联的 model 和 skills） |
| GET | `/agents/:id` | 获取单个 Agent |
| POST | `/agents` | 创建 Agent `{ name, description?, systemPrompt? }` |
| PUT | `/agents/:id` | 更新 Agent |
| DELETE | `/agents/:id` | 删除 Agent |
| POST | `/agents/:id/skills` | 绑定技能 `{ skillIds: number[] }` |
| POST | `/agents/:id/model` | 绑定模型 `{ modelId: number }` |

### 6.2 Skill 模块 (`/skills`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/skills` | 获取所有 Skill |
| GET | `/skills/presets` | 获取预设技能列表（12个） |
| GET | `/skills/:id` | 获取单个 Skill |
| POST | `/skills` | 创建 Skill `{ name, description?, prompt? }` |
| PUT | `/skills/:id` | 更新 Skill |
| DELETE | `/skills/:id` | 删除 Skill |

### 6.3 Model 模块 (`/models`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/models` | 获取所有 Model |
| GET | `/models/presets/providers` | 获取厂商预设列表（20个厂商） |
| GET | `/models/:id` | 获取单个 Model |
| POST | `/models` | 创建 Model `{ name, provider?, providerKey?, modelName, baseUrl?, apiKeyValue? }` |
| PUT | `/models/:id` | 更新 Model |
| DELETE | `/models/:id` | 删除 Model |

---

## 7. 前端架构

### 7.1 路由配置

| 路径 | 页面 | 备注 |
|------|------|------|
| `/login` | Login.vue | 公开页面，不需要认证 |
| `/` | → 重定向到 `/agents` | |
| `/agents` | AgentManage.vue | 需要登录 |
| `/skills` | SkillManage.vue | 需要登录 |
| `/models` | ModelManage.vue | 需要登录 |
| `/settings` | Settings.vue | 需要登录 |

**路由守卫**：检查 `localStorage.getItem('auth_token')`，未登录跳转 `/login`。

### 7.2 状态管理 (Pinia Stores)

| Store | 职责 |
|-------|------|
| `useAuthStore` | 登录/登出/修改密码/更新个人信息（当前为客户端模拟，预留后端接口） |
| `useAgentStore` | Agent CRUD + 绑定技能/模型 |
| `useSkillStore` | Skill CRUD + 获取预设 + 导入预设 |
| `useModelStore` | Model CRUD + 获取厂商预设 |

### 7.3 API 层 (`api/index.ts`)

- Axios 实例，`baseURL: http://localhost:3000`
- 请求拦截器：自动附加 `Authorization: Bearer <token>`
- 响应拦截器：401 自动跳转登录页
- 导出 `authApi`、`agentApi`、`skillApi`、`modelApi` 四组接口

### 7.4 UI 设计特色

- **深色渐变侧边栏**（`#1a1f36` → `#242b45`），菜单项带渐变高亮
- **Agent 卡片式布局**：每个 Agent 一张拟人化名片，含头像（名字末字）、彩带、能力标签、提示词预览
- **登录页**：渐变背景 + 浮动圆球动画 + 卡片式登录框
- **Skill 预设卡片网格**：一键导入，已导入状态标记
- **Model 双模式配置**：Tab 切换「厂商预设」/「自定义配置」

---

## 8. 预设数据

### 8.1 技能预设（12个）

| Key | 名称 | 用途 |
|-----|------|------|
| code-assistant | 代码助手 | 生成、审查和调试代码 |
| copywriting | 文案写作 | 营销文案、博客文章 |
| translator | 翻译专家 | 多语言翻译 |
| summarizer | 文档总结 | 长文档核心要点提取 |
| sql-generator | SQL 生成 | 自然语言转 SQL |
| email-writer | 邮件撰写 | 商务邮件 |
| customer-service | 客服对话 | 咨询/投诉/售后 |
| data-analysis | 数据分析 | 数据趋势与可视化 |
| weekly-report | 周报生成 | 结构化周报 |
| knowledge-qa | 知识问答 (RAG) | 基于知识库回答 |
| json-formatter | 结构化输出 | 文本转 JSON/表格 |
| seo-optimizer | SEO 优化 | 标题/关键词/描述优化 |

### 8.2 模型厂商预设（20个）

**国内厂商（13个）**：DeepSeek、智谱AI、月之暗面(Kimi)、百度文心、阿里通义、火山引擎(豆包)、硅基流动、腾讯混元、讯飞星火、MiniMax、百川智能、阶跃星辰、零一万物

**国际厂商（7个）**：OpenAI、Anthropic(Claude)、Google(Gemini)、Groq、xAI(Grok)、Mistral AI、OpenRouter

每个厂商预设包含：`name`、`baseUrl`、`apiKeyUrl`（获取密钥链接）、`models[]`（可用模型列表）

---

## 9. Tauri 桌面端

### 9.1 核心功能

| 功能 | 实现 |
|------|------|
| 系统托盘 | `tray.rs` — 左键点击恢复窗口，右键菜单（显示/退出） |
| 单实例运行 | `tauri-plugin-single-instance` — 第二实例聚焦已有窗口 |
| 关闭窗口隐藏 | `WindowEvent::CloseRequested` — 隐藏而非关闭（最小化到托盘） |
| 开机自启 | `tauri-plugin-autostart` |
| 自动更新 | `tauri-plugin-updater`（已配置端点，pubkey 待填） |
| Sidecar | `sidecar.rs` — 通过 `node dist/main.js` 启动 NestJS 后端 |

### 9.2 Sidecar 机制

- Tauri 启动时自动在 `nestjs/` 目录执行 `node dist/main.js`
- 自动设置 `DATABASE_URL` 指向 Tauri 应用数据目录
- 自动设置 `PORT=3000`
- 通过 `AtomicBool` 跟踪运行状态
- 暴露 Tauri 命令：`check_sidecar_status()`、`get_data_dir()`

### 9.3 Tauri 权限 (`capabilities/default.json`)

已授权：`core:window`(show/hide/close/focus)、`shell`(spawn)、`autostart`、`updater`

### 9.4 窗口配置 (`tauri.conf.json`)

| 参数 | 值 |
|------|----|
| 标题 | AI Agent Platform |
| 默认尺寸 | 1200 × 800 |
| 最小尺寸 | 800 × 600 |
| 可调整大小 | true |
| 居中显示 | true |
| 前端产物路径 | `../frontend/dist` |
| 开发地址 | `http://localhost:1420` |
| 构建前命令 | `npm run build`（前端） |
| 标识符 | `com.aiagent.platform` |

### 9.5 Rust 模块结构

| 文件 | 职责 |
|------|------|
| `main.rs` | 程序入口，`#![windows_subsystem = "windows"]` 隐藏 Release 模式控制台 |
| `lib.rs` | 核心逻辑：注册插件、Setup 托盘+Sidecar、窗口关闭事件拦截、暴露 Tauri 命令 |
| `sidecar.rs` | 通过 `tokio::process::Command` 启动 `node nestjs/dist/main.js`，设置环境变量 |
| `tray.rs` | 系统托盘图标（32×32 RGBA 纯色）+ 菜单（显示窗口/退出） |
| `build.rs` | Tauri 构建脚本（`tauri_build::build()`） |

### 9.6 Tauri 暴露命令（前端可调用）

| 命令 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `get_data_dir` | `AppHandle` | `String` | 获取应用数据目录路径 |
| `check_sidecar_status` | 无 | `bool` | 检查 NestJS Sidecar 是否运行中 |

---

## 10. 后端架构细节

### 10.1 NestJS 模块模式

每个业务模块（Agent/Skill/Model）遵循统一结构：

```
agent/
├── agent.module.ts      # @Module — 注册 Controller + Service + PrismaService
├── agent.controller.ts  # @Controller('agents') — 路由定义
└── agent.service.ts     # @Injectable — 业务逻辑（调用 PrismaService）
```

每个模块独立注入 `PrismaService`（非全局共享），模块间无直接依赖。

### 10.2 数据库初始化策略

采用**双重保障**：
1. **Prisma 迁移**：`prisma/migrations/` 目录包含完整迁移历史
2. **启动时自动建表**：`main.ts` 中执行 `CREATE TABLE IF NOT EXISTS` 原始 SQL，确保即使未执行迁移也能正常运行

> 注意：`main.ts` 中的 SQL schema 与 Prisma schema 可能存在字段差异（如 `api_keys` 表已在 Prisma 中移除但 SQL 中仍保留），以 Prisma schema 为准。

### 10.3 预设数据管理

- **技能预设**：硬编码在 `skill.service.ts` 的 `SKILL_PRESETS` 常量中
- **厂商预设**：硬编码在 `model.service.ts` 的 `PROVIDER_PRESETS` 常量中
- 预设数据通过 API 返回给前端，前端展示后用户可一键导入到数据库

---

## 11. 认证系统（当前状态）

**当前实现**：客户端模拟模式
- 默认账号 `admin / 123456`
- Token 存储在 `localStorage`
- Store 中预留了后端接口调用代码（注释状态）

**待后端就绪后切换**：取消 `stores/index.ts` 中 `authApi` 相关注释即可对接真实 JWT 认证。

后端已安装 `@nestjs/jwt` 和 `bcryptjs` 依赖，但 Auth 模块尚未实现。

---

## 12. 开发命令参考

| 命令 | 目录 | 说明 |
|------|------|------|
| `npm run dev` | `frontend/` | 启动前端 dev server（端口 1420） |
| `npm run build` | `frontend/` | 前端生产构建（vue-tsc + vite build） |
| `npm run start:dev` | `nestjs/` | 后端热重载开发模式（端口 3000） |
| `npm run build` | `nestjs/` | 后端生产构建（输出到 `dist/`） |
| `npm run prisma:generate` | `nestjs/` | 根据 schema 生成 Prisma Client |
| `npm run prisma:migrate` | `nestjs/` | 执行数据库迁移 |
| `npm run prisma:studio` | `nestjs/` | 打开 Prisma 数据库可视化 |
| `npm run tauri dev` | 根目录 | Tauri 开发模式（前端+Sidecar） |
| `npm run tauri build` | 根目录 | 构建 Windows 发布版 exe |
| `npm run nestjs:build` | 根目录 | 快捷构建后端 |
| `npm run nestjs:dev` | 根目录 | 快捷启动后端 |

---

## 13. 注意事项与踩坑记录

1. **NestJS 路由顺序**：静态路由（如 `/skills/presets`、`/models/presets/providers`）必须定义在动态路由（如 `/skills/:id`）之前，否则会被 `@Param('id')` 匹配拦截导致 404。
2. **Tauri 命令执行目录**：`npm run tauri` 必须在项目根目录执行，否则会找不到 `tauri.conf.json`。
3. **Vite 端口冲突**：前端开发服务器固定端口 1420（`strictPort: true`），如被占用会启动失败，需先释放端口。
4. **数据库自动建表**：`nestjs/src/main.ts` 启动时执行 `CREATE TABLE IF NOT EXISTS` 确保表存在，但与 Prisma schema 可能有差异，以 Prisma schema 为权威来源。
5. **前端构建目标**：`es2021 + chrome100 + safari13`，适配 Tauri 内置 WebView。
6. **API Key 存储**：当前直接存储在 Model 表的 `apiKeyValue` 字段中（**无加密**），生产环境需加密。
7. **Sidecar 依赖**：Tauri 开发/构建前必须先 `cd nestjs && npm run build` 生成 `dist/main.js`，否则 Sidecar 启动失败。
8. **Windows 编译**：Tauri 编译需要 Visual Studio Build Tools（C++ 工作负载），缺少会报 Rust 编译错误。
9. **PowerShell 语法**：项目脚本中 PowerShell 不支持 `&&`，需用 `;` 分隔多条命令。
10. **Git 忽略**：`nestjs/prisma/*.db` 已在 `.gitignore` 中，数据库文件不会被提交；`.env` 同样被忽略。

---

## 14. 待办 / 可扩展方向

- [ ] 实现后端 Auth 模块（JWT + bcrypt 真实认证，依赖已安装）
- [ ] 前端切换为真实 API 认证（取消 `stores/index.ts` 中的注释代码）
- [ ] API Key 加密存储（当前明文存储在 `models.api_key_value`）
- [ ] Agent 对话/运行功能（核心业务逻辑）
- [ ] 填充 Tauri updater pubkey 实现自动更新
- [ ] 多用户支持（当前仅单用户 admin）
- [ ] Agent 导入/导出
- [ ] 清理 `main.ts` 中遗留的 `api_keys` 建表 SQL（已废弃）
- [ ] 系统托盘图标替换为正式设计（当前为纯色 32×32 方块）
- [ ] 前端 `Settings.vue` 对接真实 Tauri API（`invoke('get_data_dir')` 等）
