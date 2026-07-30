# AI Agent Platform 项目说明

## 1. 项目概览

AI Agent Platform 是一个基于 `Tauri 2 + Vue 3 + NestJS + Prisma + SQLite` 的桌面端 AI Agent 管理平台。目标是把 Agent、Skill、Model、登录态和桌面壳能力统一起来，让用户可以快速配置、编排和管理自己的 AI 工具箱。

当前项目的重点能力：

- Agent 管理：卡片式列表，支持绑定模型和技能
- Skill 技能库：支持 `prompt / tool / mixed` 三种类型，已针对大量技能做分页、搜索和过滤优化
- Model 管理：支持厂商预设和自定义模型配置
- 认证与个人信息：后端 JWT 登录，默认管理员会自动初始化
- 桌面能力：系统托盘、单实例、关闭隐藏到托盘、Sidecar 启动后端服务

---

## 2. 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | Vue 3 | 组合式 API + `<script setup>` |
| 构建 | Vite | 前端开发服务器和打包 |
| UI | Element Plus | 管理后台风格组件 |
| 状态管理 | Pinia | 前端全局状态 |
| 路由 | Vue Router | 页面路由与守卫 |
| HTTP | Axios | API 请求封装 |
| 后端 | NestJS | REST API 服务 |
| ORM | Prisma | 数据访问层 |
| 数据库 | SQLite | 本地轻量数据库 |
| 桌面壳 | Tauri 2 | Windows 桌面应用 |
| 桌面端语言 | Rust | Tauri 主进程和托盘逻辑 |
| 后端语言 | TypeScript | 前后端统一 TS 开发体验 |

---

## 3. 数据模型

当前 Prisma 里的核心模型如下：

- `User`：用户账号、密码哈希、昵称、角色、头像
- `Agent`：Agent 基本信息、描述、系统提示词、绑定模型
- `Skill`：技能名称、描述、类型、提示词、工具定义
- `Model`：模型名称、厂商、厂商预设 key、模型标识、Base URL、API Key
- `AgentSkill`：Agent 和 Skill 的多对多关联表

说明：

- `Skill.type` 支持 `prompt`、`tool`、`mixed`
- `Skill.tools` 以 JSON 字符串保存工具定义
- 启动时会自动补齐旧数据库所需的表和字段，`Prisma schema` 是当前权威定义

---

## 4. Skill 技能库

这是目前最适合“大量数据”的模块，也正是你提到的“后面有几千个”最该优化的地方。

### 4.1 数据结构

`Skill` 主要字段：

- `id`
- `name`
- `description`
- `type`
- `prompt`
- `tools`
- `createdAt`
- `updatedAt`

### 4.2 后端接口

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

### 4.3 分页优化点

- `pageSize` 会限制在 `10 ~ 100`
- 搜索会覆盖 `name`、`description`、`prompt`
- 类型过滤支持 `prompt / tool / mixed`
- 排序字段只允许 `name / createdAt / updatedAt`
- 后端已经为 `type`、`name`、`updatedAt` 建了索引

### 4.4 前端 `SkillManage` 优化点

- 搜索防抖
- 类型筛选
- 排序切换
- 20 / 50 / 100 分页
- 预置技能折叠展示
- 导入状态标记
- CRUD 后局部刷新，不再每次整库重拉
- 空状态和筛选状态更清晰

如果后面技能数量继续增长，`SkillManage` 这一套分页查询已经是当前最关键的支撑点。

---

## 5. 前端页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/login` | `Login.vue` | 登录页 |
| `/agents` | `AgentManage.vue` | Agent 管理 |
| `/skills` | `SkillManage.vue` | Skill 管理 |
| `/models` | `ModelManage.vue` | Model 管理 |
| `/settings` | `Settings.vue` | 系统设置 |

前端 API 封装位置：

- `frontend/src/api/index.ts`

前端状态管理位置：

- `frontend/src/stores/index.ts`

API 基础地址默认指向 `http://localhost:3000`，也可以通过 `VITE_API_BASE_URL` 覆盖。

---

## 6. 认证与账号

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

## 7. Tauri 桌面壳

### 7.1 运行方式

Tauri 启动后会通过 Sidecar 拉起 NestJS 后端：

- `src-tauri/src/sidecar.rs`
- 实际执行的是 `nestjs/dist/main.js`
- 后端会被注入 `DATABASE_URL` 和 `PORT=3000`
- 数据库文件放在 Tauri 应用数据目录下

### 7.2 桌面特性

- 系统托盘
- 单实例运行
- 窗口关闭隐藏到托盘
- 自动更新能力已预留

---

## 8. 启动与构建

### 8.1 安装依赖

```bash
npm install
cd frontend && npm install
cd nestjs && npm install && npm run prisma:generate
```

### 8.2 开发模式

```bash
cd nestjs && npm run start:dev
cd frontend && npm run dev
```

如果要启动完整桌面应用：

```bash
cd nestjs && npm run build
npm run tauri dev
```

### 8.3 生产构建

```bash
cd nestjs && npm run build
npm run tauri build
```

构建产物会输出到 `src-tauri/target/release/bundle/`。

---

## 9. 项目结构

```text
D:\AIAgentPlatform\
├─ frontend/                 前端（Vue 3 + Vite）
│  ├─ src/
│  │  ├─ api/                Axios 封装和 API 定义
│  │  ├─ router/             路由与守卫
│  │  ├─ stores/             Pinia 状态
│  │  └─ views/              页面
│  └─ vite.config.ts
├─ nestjs/                   后端（NestJS + Prisma）
│  ├─ src/
│  │  ├─ auth/               登录与账号管理
│  │  ├─ agent/              Agent 模块
│  │  ├─ skill/              Skill 模块
│  │  ├─ model/              Model 模块
│  │  └─ prisma/             PrismaService
│  └─ prisma/schema.prisma
├─ src-tauri/                Tauri 桌面壳
│  ├─ src/
│  │  ├─ lib.rs
│  │  ├─ main.rs
│  │  ├─ sidecar.rs
│  │  └─ tray.rs
│  └─ tauri.conf.json
└─ PROJECT.md
```

---

## 10. 关键实现说明

- `nestjs/src/skill/skill.controller.ts` 和 `nestjs/src/skill/skill.service.ts` 负责 Skill 的分页查询和 CRUD
- `frontend/src/views/SkillManage.vue` 是当前技能库优化后的主界面
- `nestjs/prisma/schema.prisma` 是数据结构的权威来源
- `nestjs/src/main.ts` 负责数据库启动时兼容初始化和索引创建
- `src-tauri/src/sidecar.rs` 负责桌面端拉起后端服务

几个容易踩坑的地方：

- `GET /skills` 仍然保留，用来兼容需要全量列表的地方
- 如果修改 Skill 查询逻辑，`/skills/page` 和 `/skills` 要一起考虑
- 启动桌面应用前，要先保证 `nestjs/dist/main.js` 已经生成
- Windows 编译 Tauri 需要 Visual Studio Build Tools

---

## 11. 后续可扩展方向

- Agent 绑定技能的选择器也可以做成远程搜索或虚拟列表
- Skill 继续增加时，可以在前端增加更强的虚拟滚动
- 认证可以继续扩展成更完整的多用户体系
- API Key 可以进一步做加密存储
