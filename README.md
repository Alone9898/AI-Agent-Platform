# AI Agent Platform

<div align="center">

一个基于 **Tauri 2 + Vue 3 + NestJS** 的桌面端 AI 智能代理管理平台

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-FFC131?logo=tauri)](https://tauri.app)
[![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js)](https://vuejs.org)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-E0234E?logo=nestjs)](https://nestjs.com)

</div>

---

## 项目简介

AI Agent Platform 是一个桌面端 AI 智能代理管理工具。你可以创建和管理多个 AI Agent，为每个 Agent 配置不同的 AI 模型（大脑）和技能提示词（能力），实现 Agent 的灵活编排。

**核心理念**：将每个 Agent 拟人化为"团队成员"，通过"招募"、"配置能力"等隐喻降低使用门槛。

### 功能特性

- **Agent 管理** — 卡片式拟人化布局，每个 Agent 一张名片，支持绑定模型和技能
- **Skill 管理** — 12 个开箱即用的预设技能（代码助手、翻译、文案等），一键导入
- **Model 管理** — 内置 20 家 AI 厂商预设（DeepSeek、OpenAI、Anthropic 等），选择厂商自动填充接口地址与模型列表
- **系统设置** — 开机自启、后端服务状态监控、自动更新
- **桌面体验** — 系统托盘、关闭窗口隐藏到托盘、单实例运行

---

## 界面预览

### 登录页

[![登录页](screenshots/login.png)](screenshots/login.png)

渐变背景 + 浮动动画，默认账号 `admin / 123456`

### Agent 管理 — 我的团队

[![Agent 管理](screenshots/agents.png)](screenshots/agents.png)

每个 Agent 以拟人化名片展示，含头像、能力标签、操作按钮

### Skill 管理 — 技能库

[![Skill 管理](screenshots/skills.png)](screenshots/skills.png)

常用技能库一键导入 + 自定义技能管理

### Model 管理 — 模型配置

[![Model 管理](screenshots/models.png)](screenshots/models.png)

支持厂商预设快速配置和自定义接口地址

### 系统设置

[![系统设置](screenshots/settings.png)](screenshots/settings.png)

开机自启、后端服务状态、检查更新

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite 6 + Element Plus + Pinia + TypeScript |
| 后端 | NestJS 10 + Prisma 6 + SQLite |
| 桌面 | Tauri 2 (Rust) |

---

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org) >= 18
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)（Windows 编译 Tauri 需要）

### 安装依赖

```bash
# 根目录 — Tauri CLI
npm install

# 前端
cd frontend && npm install

# 后端
cd nestjs && npm install && npm run prisma:generate
```

### 开发模式

**方式一：前后端分离启动**

```bash
# 终端 1 — 后端 (http://localhost:3000)
cd nestjs && npm run start:dev

# 终端 2 — 前端 (http://localhost:1420)
cd frontend && npm run dev
```

**方式二：Tauri 完整桌面应用（推荐）**

```bash
# 先构建后端（Sidecar 需要 dist/main.js）
cd nestjs && npm run build

# 启动 Tauri（自动启动前端 dev server + NestJS Sidecar）
npm run tauri dev
```

### 构建发布版

```bash
cd nestjs && npm run build
npm run tauri build
# 产物位于 src-tauri/target/release/bundle/
```

---

## 项目结构

```
d:\AIAgentPlatform\
├── frontend/                  # 前端 (Vue 3 + Vite)
│   ├── src/
│   │   ├── api/               # Axios 实例 & API 接口定义
│   │   ├── router/            # 路由配置 & 导航守卫
│   │   ├── stores/            # Pinia Store (Auth/Agent/Skill/Model)
│   │   └── views/             # 页面组件
│   └── vite.config.ts
│
├── nestjs/                    # 后端 (NestJS + Prisma)
│   ├── src/
│   │   ├── agent/             # Agent 模块 (CRUD + 绑定)
│   │   ├── skill/             # Skill 模块 (CRUD + 预设)
│   │   ├── model/             # Model 模块 (CRUD + 厂商预设)
│   │   └── prisma/            # PrismaService
│   └── prisma/schema.prisma   # 数据模型定义
│
├── src-tauri/                 # Tauri 桌面壳 (Rust)
│   ├── src/
│   │   ├── lib.rs             # 主入口
│   │   ├── sidecar.rs         # NestJS Sidecar 启动逻辑
│   │   └── tray.rs            # 系统托盘
│   └── tauri.conf.json        # Tauri 全局配置
│
└── PROJECT.md                 # 详细项目文档（含 API 接口、数据模型等）
```

---

## 支持的 AI 厂商（20家）

| 国内 | 国际 |
|------|------|
| DeepSeek | OpenAI |
| 智谱 AI (GLM) | Anthropic (Claude) |
| 月之暗面 (Kimi) | Google (Gemini) |
| 百度文心 (ERNIE) | Groq |
| 阿里通义 (Qwen) | xAI (Grok) |
| 火山引擎 (豆包) | Mistral AI |
| 硅基流动 | OpenRouter |
| 腾讯混元 | |
| 讯飞星火 | |
| MiniMax | |
| 百川智能 | |
| 阶跃星辰 | |
| 零一万物 (Yi) | |

---

## 预设技能（12个）

代码助手、文案写作、翻译专家、文档总结、SQL 生成、邮件撰写、客服对话、数据分析、周报生成、知识问答 (RAG)、结构化输出、SEO 优化

---

## 详细文档

更多技术细节（API 接口、数据模型、Tauri 配置、开发注意事项等）请查看 [PROJECT.md](./PROJECT.md)。

---

## License

[MIT](LICENSE)
