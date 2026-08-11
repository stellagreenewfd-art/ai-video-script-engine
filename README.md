# AI 带货短视频脚本引擎（多人版）

数据驱动的组合生成式脚本系统：痛点地图 + 维度组合生成 + 时长/渠道参数化 + 人物场景生成 + 一键导出 Seedance2 / MiniMax Hailuo。本版本升级为**多人可用的 Web 服务**——邮箱自助注册登录、数据按用户隔离、DeepSeek Key 加密存于服务端。

## 架构
- 前端：Vite + React18 + Tailwind（构建产物由后端托管）
- 后端：Express + Postgres（`pg`），同源提供 API 与静态资源
- 鉴权：邮箱 + 密码（bcrypt 哈希 + JWT）
- Key 安全：每用户 DeepSeek Key 用 AES-256-GCM 加密存库，仅调用时由后端代理解密，前端不持有明文

## 本地开发
```bash
# 1. 安装依赖（含后端）
npm install

# 2. 准备 Postgres，创建库（示例）
createdb scriptengine
# 可选：cp .env.example .env 并填写 DATABASE_URL / JWT_SECRET / API_KEY_SECRET

# 3. 一键启动前端(5173) + 后端(3001)
npm run dev
# 打开 http://localhost:5173  → 注册账号 → 设置页填你自己的 DeepSeek Key
```
> 仅跑后端：`npm run server`；仅跑前端：`npm run dev` 拆成 `vite`。

## 环境变量（后端）
| 变量 | 说明 | 默认 |
|---|---|---|
| `DATABASE_URL` | Postgres 连接串 | 无（必填，生产由 Render 注入） |
| `JWT_SECRET` | 登录 JWT 签名密钥 | 开发默认值（生产必须改） |
| `API_KEY_SECRET` | 加密用户 Key 的对称密钥 | 开发默认值（生产必须改） |
| `PORT` | 后端端口 | 3001 |
| `DEEPSEEK_BASE` | DeepSeek 接口地址 | https://api.deepseek.com |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_EMAIL` | 管理员账户（启动时自动创建，登录可用用户名或邮箱） | 留空则不创建 |

## 管理员后台
- 配置 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 后，启动时自动建管理员账户。
- 管理员登录后侧边栏出现「管理后台」，可查看注册用户总数、已配 Key 数、脚本/商品总量，并按邮箱/用户名搜索查询每个用户的邮箱、模型、是否配 Key、脚本与商品数、注册时间。
- 管理接口 `GET /api/admin/stats`、`GET /api/admin/users?q=` 仅管理员可访问（JWT 内嵌 `is_admin` 校验）。

## 部署到 Render（公网多人可用）
1. 在 Render 控制台 → **New** → **Blueprint** → 连接本仓库。
2. `render.yaml` 会自动创建 **Postgres(free)** + **Web Service(free)**，并注入 `DATABASE_URL`、`JWT_SECRET`、`API_KEY_SECRET`。
3. 构建命令 `npm install && npm run build`，启动命令 `npm start`。
4. 部署完成后拿到公网地址，任何人可注册登录使用。

> 免费实例会在无访问时休眠，首次访问稍慢属正常。

## 数据模型
- `users`：账号 + 加密 Key + 模型偏好
- `resources`（按 `user_id` 隔离）：`dimensionPool / channels / regions / products / scripts / trendSignals / records` 均以 jsonb 存储
- 新用户注册时自动写入默认维度池 / 渠道 / 地区配置

## API 概览（均带 Bearer Token）
- `POST /api/auth/register` · `POST /api/auth/login`
- `GET/PUT /api/settings`（Key 加密落库）
- `GET/PUT /api/collections/:kind`（用户数据集合）
- `POST /api/deepseek`（后端代理，使用用户自己的 Key）
- `GET /healthz`（健康检查）
