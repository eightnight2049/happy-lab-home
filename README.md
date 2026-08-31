# HappyLab Home · Motion Intelligence Lab

一个面向实验室的全栈主页与内容管理系统。项目同时提供公开实验室网站、内部内容工作台、反馈收集页、FastAPI 数据接口和两个可独立替换的 Demo 容器。

公开网站的视觉方向参考了 [IRoM Lab · Princeton](https://irom-lab.princeton.edu/index.html)，但本项目使用独立的 Motion Intelligence Lab 品牌、演示内容和信息架构。

## 项目亮点

- **公开实验室主页**：展示实验室介绍、研究方向、新闻、论文、成员和加入方式。
- **内容工作台**：登录后管理站点介绍、新闻、论文、成员资料和账号。
- **审核工作流**：Contributor 提交的新闻、论文和成员资料默认进入待审核状态，由 Administrator 发布。
- **独立反馈页**：访客可以提交意见、上传截图、Agree 反馈或切换问题状态；反馈页不出现在公开站点主导航和内部工作台导航中。
- **全栈容器化**：Next.js、FastAPI、PostgreSQL、Caddy 和可选 Demo 服务由 Docker Compose 统一编排。
- **媒体文件持久化**：论文 PDF、头像、图片和 MP4 文件存放在独立的 Docker volume 中。
- **API 文档**：FastAPI 自动提供 Swagger UI 和 OpenAPI JSON。
- **演示服务预留**：Demo A / Demo B 通过 Caddy 的 <code>/demos/a/*</code> 和 <code>/demos/b/*</code> 路径接入，可替换为真实实验交互页面。

## 目录

- [架构概览](#架构概览)
- [技术栈](#技术栈)
- [页面与访问路径](#页面与访问路径)
- [角色与内容审核](#角色与内容审核)
- [快速开始](#快速开始)
- [环境变量](#环境变量)
- [开发命令](#开发命令)
- [API 概览](#api-概览)
- [数据、上传文件与备份](#数据上传文件与备份)
- [部署与公网访问](#部署与公网访问)
- [项目结构](#项目结构)
- [测试与验收](#测试与验收)
- [安全注意事项](#安全注意事项)
- [协作开发](#协作开发)

## 架构概览

~~~text
浏览器
  │
  ▼
Caddy :8080（统一入口）
  ├── /api/*、/health、/media/* ──> FastAPI :8000 ──> PostgreSQL :5432
  ├── /demos/a/* ─────────────────> Demo A :80
  ├── /demos/b/* ─────────────────> Demo B :80
  └── 其他页面 ───────────────────> Next.js :3000

Next.js 服务端 ── API_URL ──> FastAPI
浏览器端交互 ── 同源 /api ──> Caddy ──> FastAPI
~~~

使用 Docker Compose 时，浏览器只需要访问 <code>8080</code> 端口。数据库和 API 容器默认不直接映射到宿主机，外部请求通过 Caddy 统一转发。

## 技术栈

| 层级 | 技术 | 用途 |
| --- | --- | --- |
| Web | Next.js <code>16.3.0</code>、React <code>19.2.4</code> | App Router、页面渲染和工作台交互 |
| 语言 | TypeScript | 前端类型检查 |
| 样式 | Tailwind CSS <code>4</code>、自定义 CSS | 公开站点和工作台视觉系统 |
| API | FastAPI、Uvicorn | 认证、内容管理、上传和公开数据接口 |
| 数据库 | PostgreSQL <code>16</code>、SQLAlchemy <code>2</code> | 账号、站点设置、内容和反馈数据 |
| 校验 | Pydantic | API 请求/响应模型和环境配置 |
| 认证 | JWT（HS256）+ Python <code>scrypt</code> | Bearer Token 会话和密码哈希 |
| 网关 | Caddy <code>2</code> | 路由、压缩和统一入口 |
| 运行环境 | Docker Compose、Node <code>22</code>、Python <code>3.12</code> | 本地、集成环境和部署 |

## 页面与访问路径

### 公开网站

| 路径 | 说明 |
| --- | --- |
| <code>/</code> | 首页、Hero 视频/图片、实验室统计和新闻摘要 |
| <code>/research</code> | 研究方向、研究路线和近期演讲 |
| <code>/publications</code> | 论文列表、搜索、外部链接和媒体资源 |
| <code>/people</code> | Faculty、学生、Research staff、Alumni 等成员目录 |
| <code>/news</code> | 新闻列表 |
| <code>/news/:id</code> | 新闻详情 |
| <code>/join</code> | 加入实验室和联系信息 |
| <code>/feedback</code> | 独立反馈页面 |
| <code>/press</code> | 兼容入口，目前跳转到首页 |
| <code>/admin</code> | 旧后台兼容入口，跳转到 <code>/studio/login</code> |

### 内容工作台

| 路径 | 说明 |
| --- | --- |
| <code>/studio/login</code> | 内部登录 |
| <code>/studio/register</code> | 注册 Contributor 账号 |
| <code>/studio</code> | 工作台首页，未登录时跳转登录页 |
| <code>/studio/news</code> | 新闻创建、编辑和列表 |
| <code>/studio/publications</code> | 论文创建、编辑和文件上传 |
| <code>/studio/people</code> | 成员目录、创建和删除成员 |
| <code>/studio/profile</code> | 当前用户或指定成员的资料编辑 |
| <code>/studio/review</code> | Administrator 的统一审核队列 |

### API、媒体与 Demo

| 路径 | 说明 |
| --- | --- |
| <code>/health</code> | API 健康检查 |
| <code>/api/docs</code> | Swagger UI |
| <code>/api/openapi.json</code> | OpenAPI 描述 |
| <code>/media/&lt;filename&gt;</code> | 上传后的媒体文件 |
| <code>/demos/a/*</code> | Demo A |
| <code>/demos/b/*</code> | Demo B |

## 角色与内容审核

当前代码只实现两种账号角色：

| 角色 | 权限 |
| --- | --- |
| <code>admin</code> | 修改站点介绍；创建、编辑、发布和删除新闻/论文/成员；上传文件；处理审核队列；创建、停用、删除账号；调整其他账号角色 |
| <code>contributor</code> | 登录；提交新闻和论文；上传允许的内容文件；维护自己的成员资料；不能发布内容、管理账号或删除成员 |

账号规则：

- 公开注册账号默认是 <code>contributor</code>。
- 系统最多允许 5 个 <code>admin</code> 账号。
- 最后一个活跃管理员不能被停用、降级或删除。
- Administrator 不能从账号管理页面移除自己的管理员权限。
- Contributor 创建或修改的新闻、论文和成员资料会被后端强制设为待审核状态。

内容生命周期如下：

~~~text
Contributor 提交
      │
      ├── 新闻：is_published = false
      ├── 论文：status = Pending review，is_published = false
      └── 个人资料：is_visible = false
      │
      ▼
Administrator 在 Review queue 检查
      │
      ▼
发布后由 /api/public/home 返回，公开页面下一次读取时可见
~~~

## 快速开始

### 前置条件

- Docker Desktop，包含 Docker Compose
- Node.js <code>22+</code>（只执行本地前端命令或质量检查时需要）
- Git

推荐使用完整 Docker Compose 启动，不需要在宿主机单独安装 PostgreSQL 或 Python 依赖。

### 1. 获取项目并准备配置

~~~bash
git clone https://github.com/eightnight2049/happylab-home.git
cd happylab-home
cp .env.example .env
~~~

编辑 <code>.env</code>，至少修改管理员密码和 JWT 密钥：

~~~dotenv
JWT_SECRET=请替换为随机长字符串
ADMIN_EMAIL=你的管理员邮箱
ADMIN_PASSWORD=一个新的强密码
~~~

### 2. 启动完整服务

~~~bash
docker compose up -d --build
curl -fsS http://127.0.0.1:8080/health
~~~

成功后访问：

- 公开主页：<http://127.0.0.1:8080>
- 登录：<http://127.0.0.1:8080/studio/login>
- 注册：<http://127.0.0.1:8080/studio/register>
- 内容工作台：<http://127.0.0.1:8080/studio>
- API 文档：<http://127.0.0.1:8080/api/docs>

首次启动空数据库时，API 会自动创建表结构、管理员账号和一组演示内容。<code>ADMIN_EMAIL</code> 与 <code>ADMIN_PASSWORD</code> 只会在数据库尚无用户时用于初始化；已有数据库不会因为重启自动覆盖管理员密码。

### 3. 启动可选 Demo

~~~bash
docker compose --profile demos up -d --build
~~~

然后打开：

- <http://127.0.0.1:8080/demos/a/>
- <http://127.0.0.1:8080/demos/b/>

### 4. 查看状态和日志

~~~bash
docker compose ps
docker compose logs -f web api caddy
~~~

停止容器但保留数据库和上传文件：

~~~bash
docker compose down
~~~

> <code>docker compose down -v</code> 会删除本地 PostgreSQL、上传文件和 Caddy 数据卷。只有确认不需要保留数据时才使用。

## 环境变量

<code>.env.example</code> 是可提交到仓库的配置模板；真实 <code>.env</code> 被 <code>.gitignore</code> 忽略。

| 变量 | 用途 | 说明 |
| --- | --- | --- |
| <code>DATABASE_URL</code> | API 连接 PostgreSQL | 独立运行 API 时使用；Compose 内部 API 使用 <code>db:5432</code> 的容器网络地址 |
| <code>JWT_SECRET</code> | 签发和验证 JWT | 生产环境必须使用长随机字符串 |
| <code>ADMIN_EMAIL</code> | 首次初始化管理员邮箱 | 仅在数据库尚无用户时使用 |
| <code>ADMIN_PASSWORD</code> | 首次初始化管理员密码 | 仅在数据库尚无用户时使用 |
| <code>API_URL</code> | Next.js 服务端请求 API | Compose 的 <code>web</code> 服务固定为 <code>http://api:8000</code> |
| <code>NEXT_PUBLIC_API_URL</code> | 浏览器端请求 API | Compose 中为空，使用 Caddy 的同源 <code>/api</code>；本地独立前端可设为 <code>http://localhost:8000</code> |

Compose 会为 API 服务注入数据库、上传目录、JWT 和管理员配置；不要把 <code>.env</code>、密码、Token、生产数据库连接串或上传文件提交到 GitHub。

## 开发命令

在仓库根目录执行：

~~~bash
npm ci
npm run dev       # 启动 Next.js 开发服务器
npm run lint      # ESLint
npm run typecheck # TypeScript 类型检查
npm run build     # Next.js production build
npm run check     # lint + typecheck + build
~~~

<code>npm run dev</code> 只启动前端。如果前端不通过 Caddy 访问，需要确保 API 已经在 <code>localhost:8000</code> 提供服务，并设置：

~~~bash
API_URL=http://localhost:8000 NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
~~~

对于常规联调，推荐使用 <code>docker compose up -d --build</code>，让 Caddy、Next.js、FastAPI 和 PostgreSQL 使用与集成环境一致的网络结构。

## API 概览

所有公开 API 由 Caddy 统一从 <code>http://127.0.0.1:8080</code> 提供。受保护接口使用：

~~~http
Authorization: Bearer &lt;TOKEN&gt;
~~~

主要接口分组：

| 分组 | 主要接口 | 认证 |
| --- | --- | --- |
| 健康与公开内容 | <code>GET /health</code>、<code>GET /api/public/home</code>、<code>POST /api/public/visit</code> | 无需登录 |
| 账号 | <code>POST /api/auth/login</code>、<code>POST /api/auth/register</code> | 无需登录 |
| 新闻 | <code>POST/GET /api/admin/news</code>、<code>PUT/DELETE /api/admin/news/{id}</code> | 已登录；删除需 admin |
| 论文 | <code>POST/GET /api/admin/publications</code>、<code>PUT/DELETE /api/admin/publications/{id}</code> | 已登录；删除需 admin |
| 站点设置 | <code>PUT /api/admin/settings</code> | admin |
| 成员与个人资料 | <code>/api/admin/people</code>、<code>/api/admin/profile</code> | 按角色限制 |
| 审核 | <code>GET /api/admin/review-queue</code>、<code>POST /api/admin/review-queue/{type}/{id}/publish</code> | admin |
| 账号管理 | <code>/api/admin/users</code> | admin |
| 上传 | <code>POST /api/admin/upload</code> | admin 或 contributor |
| 反馈 | <code>/api/feedback</code>、<code>/api/feedback/upload</code>、<code>/{id}/like</code>、<code>/{id}/resolve</code> | 当前公开 |

限制：普通上传最大 50 MB，允许 PDF、PNG、JPEG、WebP 和 MP4；反馈截图最大 10 MB，允许 PNG、JPEG 和 WebP。

完整字段、请求示例、权限和错误码见 [docs/backend-api.md](docs/backend-api.md)。

## 数据、上传文件与备份

PostgreSQL 保存：

- 账号和角色
- 实验室设置与访问计数
- 研究方向
- 新闻
- 成员资料
- 论文
- 反馈与 Agree 计数

上传文件保存在 API 容器的 <code>/data/uploads</code>，对应 Compose volume <code>lab_uploads</code>。数据库只保存文件 URL，因此备份时必须同时备份数据库和上传 volume。

默认命名卷包括：

| Volume | 内容 |
| --- | --- |
| <code>lab-website_lab_postgres</code> | PostgreSQL 数据 |
| <code>lab-website_lab_uploads</code> | 上传的 PDF、图片和视频 |
| <code>lab-website_caddy_data</code> | Caddy 数据 |
| <code>lab-website_caddy_config</code> | Caddy 配置状态 |

数据库备份示例：

~~~bash
mkdir -p backups
docker compose exec -T db pg_dump -U lab -d labdb > backups/labdb-$(date +%Y%m%d-%H%M%S).sql
~~~

备份文件、<code>.env</code> 和上传文件归档只能放在受控的私有存储中，不要提交到 GitHub。完整的数据库/上传文件交接流程见 [docs/developer-handoff.md](docs/developer-handoff.md)。

当前项目在 API 启动时执行建表、轻量字段补齐和演示数据初始化，尚未引入 Alembic。生产环境修改数据结构前请先备份，并评估是否需要补充正式迁移脚本。

## 部署与公网访问

### 集成主机

推荐使用一台持续运行的 Mac mini 或 Linux 主机作为集成/演示环境：

~~~bash
git switch main
git pull --ff-only origin main
docker compose up -d --build
curl -fsS http://127.0.0.1:8080/health
~~~

局域网其他设备可访问：

~~~text
http://<集成主机局域网 IP>:8080
~~~

需要同时确认主机防火墙允许局域网访问 <code>8080</code>，并且不要把 PostgreSQL <code>5432</code> 或 API <code>8000</code> 直接暴露给局域网以外的网络。

### cpolar 或其他隧道

如果需要临时公网预览，可将 HTTP 隧道目标配置为本机 <code>127.0.0.1:8080</code>。cpolar 控制台为 <https://dashboard.cpolar.com/>。

隧道只负责转发站点访问，不负责同步代码、数据库或环境配置。不要通过公网隧道传输 <code>.env</code>、数据库 dump、上传文件备份、Docker socket 或 SSH。

### 公网部署前检查

1. 替换 <code>JWT_SECRET</code> 和管理员密码。
2. 为公网入口配置 HTTPS；当前 Caddy 配置是容器内 HTTP 入口，不等同于公网 TLS 配置。
3. 为公开反馈接口增加限流、垃圾内容防护和更严格的运营边界。
4. 限制上传文件类型、大小和访问范围，并定期备份 PostgreSQL 与上传 volume。
5. 在集成环境先执行 <code>npm run check</code> 及 API/E2E 检查，再更新公网服务。
6. 保留上一版镜像和数据库备份，确保可以回滚。

## 项目结构

~~~text
.
├── src/
│   ├── app/                         # Next.js App Router 页面
│   ├── components/site/             # 公开站点组件
│   ├── components/admin/            # 登录、工作台、编辑器组件
│   └── lib/                         # API、回退数据、类型和日期工具
├── backend/app/
│   ├── main.py                      # FastAPI 应用、路由、启动初始化
│   ├── models.py                    # SQLAlchemy 数据模型
│   ├── schemas.py                   # Pydantic 请求/响应模型
│   ├── auth.py                      # JWT、密码哈希和权限依赖
│   └── db.py                        # 数据库引擎和环境配置
├── demos/
│   ├── demo-a/                      # Demo A 静态容器
│   └── demo-b/                      # Demo B 静态容器
├── public/                          # logo、头像、图片和参考视频
├── docs/
│   ├── project-guide.md             # 架构、部署与运维细节
│   ├── backend-api.md               # API 接口说明
│   ├── developer-handoff.md         # 开发环境、数据库和文件交接
│   └── research/                    # 参考站点审计与设计研究
├── qa/                              # API、数据库、E2E 和视觉检查脚本
├── Dockerfile.web                   # Next.js standalone 镜像
├── docker-compose.yml               # web / api / db / caddy / demos
├── Caddyfile                        # 统一反向代理规则
├── next.config.ts                   # standalone 输出与图片配置
├── package.json                     # 前端脚本与依赖
├── package-lock.json                # npm 依赖锁定文件
└── .env.example                     # 环境变量模板
~~~

<code>src/lib/api.ts</code> 在服务端读取公开站点快照；当 API 暂时不可用时，页面会回退到 <code>src/lib/data.ts</code> 的演示数据。登录、内容写入、上传和审核仍然需要 API 正常运行。

## 测试与验收

### 静态质量检查

~~~bash
npm run check
~~~

### API / 数据库回归

<code>qa/api_db_regression.py</code> 会检查登录、注册、角色权限、内容发布、审核、上传、反馈和数据库持久化。它要求服务已启动，并依赖当前环境中的 Python HTTP/PostgreSQL 访问配置；运行前请先阅读脚本顶部的环境变量。

### 浏览器 E2E 与跨浏览器检查

- <code>qa/webapp_e2e.py</code>：公开页面、工作台和基本交互。
- <code>qa/cross_browser_visual.py</code>：跨浏览器视觉检查。
- <code>qa/full_workflow.py</code>：完整内容工作流。
- <code>qa/backend_business.py</code>：后端业务流程。
- <code>qa/seed_bulk_content.py</code>：批量生成检查数据。

这些脚本默认使用 <code>http://127.0.0.1:8080</code>，可根据脚本顶部的环境变量改为其他地址。涉及登录的检查需要提供管理员账号和密码；检查结束后请清理测试数据或使用独立数据库。

## 安全注意事项

- <code>.env</code>、Token、真实管理员密码、数据库 dump 和上传文件不得进入 GitHub。
- 生产环境不能使用 Compose 中的默认 <code>JWT_SECRET</code>、<code>ADMIN_PASSWORD</code> 或示例邮箱。
- JWT 当前保存在浏览器 <code>localStorage</code> 的 <code>motion-lab-session</code> 中，公网环境必须使用 HTTPS，并应在后续迭代中评估 HttpOnly Cookie。
- 反馈读取、Agree 和公开 resolve 接口当前没有登录限制或限流，公网使用前需要增加滥用防护。
- 上传文件应与数据库一起备份；只备份数据库会造成媒体 URL 失效。
- 当前启动时存在轻量 schema migration，不要在未备份生产数据的情况下直接修改模型字段。

## 协作开发

推荐流程：

1. 从 <code>main</code> 创建功能分支。
2. 修改代码、文档和必要的 QA 检查。
3. 本地执行 <code>npm run check</code>，需要时启动 Compose 做接口和页面验收。
4. 提交 Pull Request，由维护者审核后合并到 <code>main</code>。
5. 集成主机只拉取已合并代码，不直接在运行环境修改源码。

完整的分支命名、Pull Request、Mac mini 集成环境和数据交接约定见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

项目使用 MIT License，详见仓库中的 [LICENSE](LICENSE)。
