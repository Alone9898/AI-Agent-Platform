# 星曜 Cloud API

星曜 Agent Platform 的远程业务服务，负责账号、积分、订单、Skill 市场、设备和版本分发。桌面端原有 NestJS 继续负责本地 Agent Runtime 与工具执行，云端 Gin 服务不执行用户上传的 Skill 代码。

## 架构原则

- 模块化单体：按业务领域隔离，先保持一次部署，模块成熟后可独立拆分。
- 依赖向内：`delivery -> application -> domain`，数据库实现放在 `infrastructure`。
- PostgreSQL 是业务事实来源；Redis 只用于缓存、限流、短期状态和分布式协调。
- 积分使用账户余额与不可变流水，余额更新必须在数据库事务中完成。
- 订单、支付回调和积分变更必须带幂等键。
- Skill 包存对象存储，PostgreSQL 只保存元数据、版本、授权、哈希和权限声明。
- 跨模块异步动作写入 `outbox_events`，由后台任务可靠投递。

## 目录

```text
gin-server/
├─ cmd/
│  ├─ api/                    HTTP 服务入口
│  └─ migrate/                数据库迁移入口
├─ internal/
│  ├─ app/                    依赖装配与优雅停机
│  ├─ config/                 环境配置
│  ├─ modules/
│  │  ├─ health/              存活与就绪检查
│  │  └─ identity/
│  │     ├─ domain/           领域对象
│  │     ├─ application/      用例与端口接口
│  │     ├─ infrastructure/   PostgreSQL 实现
│  │     └─ delivery/http/    Gin Handler 与认证中间件
│  ├─ platform/               PostgreSQL、Redis、密码、JWT
│  ├─ shared/                 错误与统一响应
│  └─ transport/http/         路由和全局中间件
├─ migrations/                PostgreSQL 版本化迁移
├─ compose.yaml
└─ Dockerfile
```

后续模块沿用 `identity` 的纵向结构新增：

```text
modules/wallet
modules/order
modules/payment
modules/skill
modules/device
modules/release
modules/audit
```

模块间不要直接读取对方的数据表。同步调用依赖 application 层接口，异步副作用通过 outbox 事件完成。

## 本地启动

要求 Go 1.23+，以及 PostgreSQL 17 和 Redis 7。使用 Docker 时可直接启动完整环境：

```bash
docker compose up -d --build
```

API 默认地址为 `http://localhost:8080`。查看状态：

```bash
curl http://localhost:8080/health/live
curl http://localhost:8080/health/ready
```

不使用 Docker 运行 Go 服务：

```powershell
Copy-Item .env.example .env
docker compose up -d postgres redis
go run ./cmd/migrate -direction up
go run ./cmd/api
```

生产环境必须替换 `JWT_SECRET`，并将数据库、Redis 密码放入部署平台的 Secret 管理中，不要提交 `.env`。

## 当前 API

| 方法 | 路径 | 认证 | 说明 |
|---|---|---|---|
| GET | `/health/live` | 否 | 进程存活检查 |
| GET | `/health/ready` | 否 | PostgreSQL、Redis 就绪检查 |
| POST | `/api/v1/auth/register` | 否 | 邮箱注册，同时创建积分账户 |
| POST | `/api/v1/auth/login` | 否 | 邮箱密码登录 |
| GET | `/api/v1/users/me` | Bearer | 当前用户信息 |

注册示例：

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"change-me-123","displayName":"星曜用户"}'
```

所有响应都使用统一格式：

```json
{
  "data": {},
  "requestId": "b6cedbf4-72a2-4634-91e9-8bd3d29df521"
}
```

错误响应包含稳定的 `error.code`，客户端不要依赖中文错误文案做逻辑判断。

## 数据迁移

```bash
go run ./cmd/migrate -direction up
go run ./cmd/migrate -direction down -steps 1
```

上线时先运行迁移任务，再滚动发布 API。已有迁移文件一经上线不得修改，只能新增更高版本的迁移。

## 扩展一个模块

1. 在 `modules/<name>/domain` 定义领域对象和规则。
2. 在 `application` 定义用例及所需 Repository 接口。
3. 在 `infrastructure` 实现 PostgreSQL、Redis 或对象存储适配器。
4. 在 `delivery/http` 添加请求 DTO、Handler 和路由。
5. 在 `internal/app/app.go` 完成依赖装配，在总路由注册公开接口。
6. 新增 migration、单元测试和 API 契约，不在 Handler 内直接写 SQL 或业务规则。

## 上线前必须补齐

- Access Token + Refresh Token 轮换和主动注销
- 注册、登录、验证码和下载接口限流
- 邮件验证、找回密码及账号风控
- 积分账户行锁、账务对账任务与管理员调账审核
- 支付渠道签名校验、回调幂等与退款状态机
- Skill 包对象存储、恶意文件扫描、签名和人工审核
- OpenTelemetry、指标告警、集中日志与定期备份恢复演练
