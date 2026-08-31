# Motion Intelligence Lab 实验室主页项目文档

本文档面向实验室成员、协同开发者和负责部署的同学，记录当前初步版本的技术路线、代码结构、运行方式、数据边界和协作约定。

> 当前版本：`0.1.0`
> 项目性质：实验室公开主页 + 内容管理工作台 + FastAPI 数据接口 + PostgreSQL 数据库
> 文档原则：以仓库中的实际代码和 `docker-compose.yml` 为准；如果文档与代码冲突，应先修正文档或提出代码变更。

## 1. 项目定位

项目由两部分组成：

1. **公开实验室主页**：展示实验室介绍、研究方向、新闻、成员、论文和加入方式。
2. **内部内容工作台**：登录后管理新闻、论文、成员资料、站点介绍、上传文件和账号；普通 Contributor 提交的内容需要管理员审核后才公开。

另外，项目已经预留了两个独立 Demo 容器，可通过 Caddy 以 `/demos/a/*` 和 `/demos/b/*` 对外提供实验演示。

## 2. 技术路线

### 2.1 总体架构

```text
浏览器
  │
  ▼
Caddy :8080（统一入口）
  ├── /api/*、/health、/media/* ──> FastAPI :8000 ──> PostgreSQL :5432
  ├── /demos/a/* ─────────────────> Demo A nginx :80
  ├── /demos/b/* ─────────────────> Demo B nginx :80
  └── 其他页面 ───────────────────> Next.js :3000

Next.js 服务端 ──API_URL──> FastAPI
浏览器端交互 ──同源相对路径──> Caddy ──> FastAPI
```

通过 Docker Compose 启动时，浏览器只需要访问 Caddy 的 `8080` 端口。数据库和 API 容器不直接暴露给局域网，减少了不必要的访问面。

### 2.2 前端

- Next.js `16.3.0`，使用 App Router。
- React `19.2.4`。
- TypeScript，开启严格类型检查。
- Tailwind CSS `4` 及项目中的自定义 CSS 视觉系统。
- `lucide-react` 提供图标，`@base-ui/react` 等依赖用于界面基础能力。
- 公开页面主要由 Server Component 组成，首屏服务端从 API 获取站点快照。
- 内容工作台和反馈板需要浏览器交互，使用 Client Component 和 `fetch` 调用 API。

### 2.3 后端

- FastAPI `0.116.1`，入口为 `backend/app/main.py`。
- Uvicorn 运行 API 服务。
- SQLAlchemy `2.0.43` 访问 PostgreSQL。
- Pydantic Settings 从环境变量和 `.env` 读取配置。
- JWT（HS256）作为登录后的 Bearer Token，Token 当前有效期为 12 小时。
- 密码使用 Python `scrypt` 哈希，不保存明文密码。

### 2.4 数据与文件

- PostgreSQL 保存账号、站点设置、研究方向、新闻、成员、论文和反馈。
- 上传的 PDF、图片和 MP4 保存在 Docker volume `lab_uploads`，由 API 通过 `/media/*` 提供访问。
- 数据库和上传文件分别通过 `lab_postgres`、`lab_uploads` 持久化；重启容器不会自动清空数据。
- API 启动时会执行建表、轻量字段补齐和首批演示数据初始化。当前没有 Alembic 等独立迁移系统，生产环境进行表结构变更时必须提前备份数据库。

## 3. 功能与访问路径

### 3.1 公开页面

| 路径 | 功能 |
| --- | --- |
| `/` | 首页、Hero、新闻摘要、访问统计 |
| `/research` | 研究方向、研究路线、近期演讲 |
| `/publications` | 论文列表、搜索和外部链接 |
| `/people` | 按 Faculty、PhD、Master、本科、Research staff、Alumni 等分类展示成员 |
| `/news` | 新闻列表 |
| `/news/:id` | 新闻详情 |
| `/join` | 加入实验室和联系方式 |
| `/feedback` | 独立反馈页，支持留言、截图和 Agree 统计 |
| `/press` | 兼容入口，当前跳转到首页 |
| `/admin` | 兼容入口，当前跳转到 `/studio/login` |

### 3.2 内容工作台

| 路径 | 功能 |
| --- | --- |
| `/studio/login` | 登录 |
| `/studio/register` | 注册 Contributor 账号 |
| `/studio` | 工作台入口，未登录时跳转登录页 |
| `/studio/news` | 新闻管理 |
| `/studio/publications` | 论文管理和文件上传 |
| `/studio/people` | 成员目录和管理员操作 |
| `/studio/profile` | 当前用户或管理员选定成员的资料编辑 |
| `/studio/review` | 管理员统一审核队列 |

### 3.3 API 与运维入口

| 路径 | 用途 |
| --- | --- |
| `/health` | API 健康检查 |
| `/api/docs` | Swagger UI |
| `/api/openapi.json` | OpenAPI 描述 |
| `/media/<filename>` | 已上传文件 |
| `/demos/a/*` | Demo A |
| `/demos/b/*` | Demo B |

完整接口说明见 [`backend-api.md`](backend-api.md)。

## 4. 代码目录说明

```text
.
├── src/
│   ├── app/                         # Next.js App Router 路由
│   │   ├── page.tsx                 # 首页
│   │   ├── research/page.tsx        # 研究页
│   │   ├── publications/page.tsx    # 论文页
│   │   ├── people/page.tsx          # 成员页
│   │   ├── news/                    # 新闻列表和详情
│   │   ├── join/page.tsx            # 加入我们
│   │   ├── feedback/page.tsx        # 独立反馈页
│   │   ├── studio/                  # 内部内容工作台路由
│   │   └── admin/page.tsx           # 旧后台入口兼容跳转
│   ├── components/
│   │   ├── site/                    # 公开站点组件
│   │   └── admin/                   # 工作台、登录、编辑器组件
│   └── lib/
│       ├── api.ts                   # 服务端获取公开站点快照
│       ├── data.ts                  # API 不可用时的演示回退数据
│       ├── types.ts                 # 前端领域类型
│       └── format-date.ts            # 日期格式化
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI 应用、路由、启动初始化
│   │   ├── models.py               # SQLAlchemy 数据模型
│   │   ├── schemas.py              # Pydantic 请求/响应模型
│   │   ├── auth.py                 # JWT、密码哈希和权限依赖
│   │   └── db.py                   # 配置、数据库引擎和 Session
│   ├── requirements.txt            # Python 依赖
│   └── Dockerfile                  # API 镜像
├── demos/
│   ├── demo-a/                     # Demo A 静态容器
│   └── demo-b/                     # Demo B 静态容器
├── public/                         # 图片、视频、头像和本地参考素材
├── docs/
│   ├── project-guide.md            # 本文档
│   ├── backend-api.md              # API 使用说明
│   ├── research/                   # 参考站点审计与设计研究
│   └── design-references/          # 参考图
├── qa/                             # API、数据库、E2E、跨浏览器检查脚本
├── Dockerfile.web                  # Next.js standalone 镜像
├── docker-compose.yml              # web / api / db / caddy / demos
├── Caddyfile                       # 统一反向代理规则
├── next.config.ts                  # standalone 输出和图片配置
├── package.json                    # 前端脚本与依赖
├── package-lock.json               # npm lockfile，必须和 package.json 一起提交
└── .env.example                    # 环境变量模板
```

### 4.1 修改代码时的边界

- 修改公开页面：优先在 `src/app` 对应路由和 `src/components/site` 中完成。
- 修改工作台：优先在 `src/components/admin/admin-dashboard.tsx` 和对应 `src/app/studio/*` 路由中完成。
- 修改数据字段：必须同时检查 `backend/app/models.py`、`backend/app/schemas.py`、`backend/app/main.py`、`src/lib/types.ts` 和前端表单。
- 修改 API 路由：同步更新 `docs/backend-api.md` 和相关 `qa/` 检查。
- 增加图片或视频：放入 `public/`；论文 PDF、成员头像等运行时上传文件应走 API，不要提交到 Git。
- 修改依赖：使用 `npm install <package>` 后提交 `package.json` 和 `package-lock.json`；不要手动编辑 lockfile。

## 5. 内容模型和权限

### 5.1 当前实际角色

当前代码只实现两个后端角色：`admin` 和 `contributor`。文档或界面中不要把尚未实现的 `editor` 当作可用权限。

| 角色 | 能做什么 |
| --- | --- |
| `admin` | 修改站点介绍；管理、发布和删除新闻/论文/成员；上传文件；查看和处理审核队列；创建、停用、删除账号；调整其他账号角色 |
| `contributor` | 登录；提交新闻和论文；上传允许的内容文件；维护自己的成员资料；不能自行公开内容，不能管理账号和删除成员 |

管理员账号上限为 5 个，系统会阻止删除或停用最后一个活跃管理员。公开注册账号默认为 `contributor`。

### 5.2 内容生命周期

```text
Contributor 创建内容
        │
        ├── 新闻：强制 is_published=false
        ├── 论文：强制 Pending review / is_published=false
        └── 个人资料：强制 is_visible=false
        │
        ▼
Admin 在 Review queue 检查
        │
        ▼
发布后进入 /api/public/home，公开页面下一次读取时可见
```

管理员直接创建或编辑的新闻、论文、成员资料可以立即影响公开站点。编辑已发布内容前应先核对链接、图片和文字，避免半成品直接上线。

## 6. 环境变量

复制模板生成本地配置：

```bash
cp .env.example .env
```

| 变量 | 用途 | Compose 默认值/说明 |
| --- | --- | --- |
| `DATABASE_URL` | API 连接 PostgreSQL | Compose 的 API 服务使用容器内部地址；本地独立运行时使用 `localhost` |
| `JWT_SECRET` | 签发 JWT 的密钥 | 生产环境必须替换为长随机字符串 |
| `ADMIN_EMAIL` | 首次初始化管理员邮箱 | 仅首次无用户时写入数据库 |
| `ADMIN_PASSWORD` | 首次初始化管理员密码 | 仅首次无用户时使用；已有数据库不会因重启覆盖 |
| `API_URL` | Next.js 服务端请求 API 的地址 | Compose 中为 `http://api:8000` |
| `NEXT_PUBLIC_API_URL` | 浏览器端请求 API 的地址 | Compose 中为空，使用 Caddy 同源 `/api` |

不要把 `.env`、数据库密码、管理员密码、JWT_SECRET 或生产上传文件提交到 GitHub。`.gitignore` 已忽略 `.env`。

## 7. 本地启动

### 7.1 推荐方式：完整 Docker Compose

这是新开发者最稳定的启动方式，不要求在 macOS 上手工安装 PostgreSQL 和 Python 依赖。

```bash
cp .env.example .env
```

编辑 `.env`，至少修改：

```dotenv
JWT_SECRET=请替换为随机长字符串
ADMIN_EMAIL=你的管理员邮箱
ADMIN_PASSWORD=一个新的强密码
```

然后执行：

```bash
docker compose up -d --build
curl -fsS http://127.0.0.1:8080/health
```

打开：

- 公开主页：<http://127.0.0.1:8080>
- 登录：<http://127.0.0.1:8080/studio/login>
- 注册：<http://127.0.0.1:8080/studio/register>
- API 文档：<http://127.0.0.1:8080/api/docs>

查看服务状态和日志：

```bash
docker compose ps
docker compose logs -f web api caddy
```

启动 Demo：

```bash
docker compose --profile demos up -d --build
```

停止服务但保留数据库和上传文件：

```bash
docker compose down
```

`docker compose down -v` 会删除本地数据库和上传文件卷，只能在明确确认不需要保留本地数据时使用。

### 7.2 前端热更新

如果只修改前端，可以在另一个终端使用：

```bash
npm ci
npm run dev
```

此方式要求 API 已经以 `localhost:8000` 可访问，并且当前 shell 的配置能够被 Next.js 读取。若 API 仍只在 Compose 网络内运行，优先使用完整 Compose；项目默认的稳定验证路径是 `docker compose up -d --build`。

## 8. 部署流程

### 8.1 局域网集成环境

建议指定一台性能稳定、持续开机的 Mac mini 作为**集成/演示主机**，但不要让所有开发者直接在这台机器上修改代码。

```bash
git switch main
git pull --ff-only origin main
docker compose up -d --build
curl -fsS http://127.0.0.1:8080/health
```

Compose 的 `8080:80` 默认会监听该 Mac mini 的局域网地址。其他同网设备可访问：

```text
http://<集成 Mac mini 的局域网 IP>:8080
```

查询当前 Mac mini 的局域网 IP，可在该机器上执行：

```bash
ipconfig getifaddr en0
```

如果使用的不是 `en0`，请在系统网络设置中确认实际网卡。需要同时确认 macOS 防火墙允许 Docker/端口 `8080` 的局域网访问。

### 8.2 生产或公网部署

公网入口目前使用 cpolar 反向映射到集成 Mac mini 的本机 `127.0.0.1:8080`。cpolar 控制台入口为 <https://dashboard.cpolar.com/>，官方文档见 <https://www.cpolar.com/docs>。正式公网使用前至少完成：

1. 生成强随机 `JWT_SECRET`，修改管理员密码。
2. 为公网入口配置 HTTPS；当前 `Caddyfile` 是容器内的 HTTP 入口，不等同于公网 TLS 配置。
3. 限制公网暴露范围，不要把 PostgreSQL `5432` 或 FastAPI `8000` 直接映射到公网。
4. 设置数据库和上传文件的备份计划。
5. 先在集成环境执行 `npm run check` 和 API/E2E 检查，再更新生产服务。
6. 保留上一版镜像和数据库备份，确保出现问题时可以回滚。

### 8.3 cpolar 隧道配置

本项目只需要穿透 Caddy 的宿主机 `8080` 端口，不要把 PostgreSQL `5432`、FastAPI `8000`、Docker socket 或 SSH 端口作为 Web 隧道目标。

在 cpolar 控制台中创建或检查一条 HTTP 隧道：

| 配置项 | 本项目建议值 |
| --- | --- |
| 协议 | HTTP |
| 本地地址/端口 | `127.0.0.1:8080` 或本地地址 `8080` |
| 目标服务 | Caddy 统一入口 |
| 域名 | 临时调试可用随机域名；长期使用应使用已保留的固定域名或自定义域名 |

保存后，在 cpolar 的在线隧道列表中复制生成的公网 HTTP/HTTPS 地址，用浏览器访问主页和 `/health` 验证。免费或随机域名可能变化，不要把随机地址写入对外长期使用的文档或代码配置。

cpolar 只负责“公网请求 → 集成 Mac mini 的 8080 端口”这一段网络转发，不替代 GitHub 的代码协作，也不应成为开发者直接编辑集成主机代码的入口。开发者仍然通过 GitHub clone、分支和 Pull Request 工作。

### 8.4 数据备份

检查 volume 名称：

```bash
docker volume ls | grep lab
```

数据库备份示例：

```bash
mkdir -p backups
docker compose exec -T db pg_dump -U lab -d labdb > backups/labdb-$(date +%Y%m%d-%H%M%S).sql
```

上传文件也必须单独备份，因为数据库中只保存文件 URL。备份前先确认目标磁盘空间和备份目录，恢复操作前必须再次确认目标 volume，避免覆盖错误环境。

## 9. 验证与排障

### 9.1 提交前检查

```bash
npm run lint
npm run typecheck
npm run build
```

等价的一键检查：

```bash
npm run check
```

### 9.2 API/数据库回归检查

`qa/` 中包含 API 合约、数据库一致性、业务流程、浏览器端 E2E 和跨浏览器检查。它们依赖 Python 的 Playwright 环境，并且会使用当前运行中的服务。

管理员凭据只通过环境变量传入：

```bash
export LAB_BASE_URL=http://127.0.0.1:8080
export LAB_ADMIN_EMAIL=你的管理员邮箱
export LAB_ADMIN_PASSWORD=你的管理员密码
python qa/api_db_regression.py
python qa/backend_business.py
python qa/webapp_e2e.py
```

回归脚本会创建临时数据并尽力清理；不要把生产环境当作普通测试环境使用。遇到异常后应检查数据库和上传卷是否残留测试数据。

### 9.3 常见问题

| 现象 | 排查 |
| --- | --- |
| 首页显示回退演示数据 | 检查 `api`、`db` 状态和 `docker compose logs api`；Next.js API 请求失败时会使用 `src/lib/data.ts` |
| `/health` 失败 | 执行 `docker compose ps`，再查看 `api` 和 `caddy` 日志 |
| 修改管理员密码后登录仍使用旧密码 | `ADMIN_PASSWORD` 只在首次创建管理员时生效；已有数据库需要在工作台或数据库层面处理账号 |
| 上传成功但页面看不到 | 检查 API 返回的 `/media/...` URL、`lab_uploads` volume 和 Caddy `/media/*` 路由 |
| 局域网打不开 | 确认访问的是 `<Mac mini IP>:8080`，服务已启动，macOS 防火墙和网络隔离未阻止访问 |
| 端口被占用 | 修改宿主机端口映射，例如 `18080:80`，然后同步修改访问地址和 cpolar 隧道目标 |
| 前端类型检查失败 | 先运行 `npm ci`，确认 Node 版本兼容，再修复类型错误；不要删除 `package-lock.json` |

## 10. 当前已知限制与后续建议

以下内容不影响初步版本协作，但应纳入后续迭代：

1. **数据库迁移**：当前由启动逻辑补齐少量字段，建议在多人长期开发前引入 Alembic 或等价迁移方案。
2. **权限模型**：当前只有 `admin` / `contributor`；如果需要 Editor/Sub-admin，应先设计角色、接口权限和回归测试，再统一实现。
3. **会话安全**：前端当前把登录会话放在浏览器 `localStorage` 中，公网环境应配合 HTTPS，并评估 HttpOnly Cookie 或更短 Token 生命周期。
4. **反馈接口**：公开反馈的读取、Agree 和 resolve 接口目前按代码可直接调用；若反馈页面面向公网，需要增加限流、滥用防护和更明确的管理员权限边界。
5. **上传安全**：当前有 MIME 类型和大小限制，但生产环境还应增加内容检测、文件名策略、访问控制和清理策略。
6. **CI/CD**：当前已有本地检查脚本，但还没有仓库级自动化流水线；建议在 GitHub 上增加 PR 的 lint、typecheck、build 和 API smoke test。
7. **集成主机可用性**：Mac mini 适合作为局域网集成环境，不应被当作唯一代码存储或唯一备份位置；GitHub 才是代码协作的主仓库。

## 11. 协作结论

多人协作采用“**SSH 登录一台 Mac mini + 共享一个项目目录 + GitHub 保存版本历史**”的模式：

- 开发者通过局域网 SSH 进入共享 Mac mini，不在自己的 Mac 上重复部署 Docker、数据库和项目依赖。
- 所有人使用同一个项目目录、同一套 Docker Compose、数据库和上传文件。
- GitHub 负责提交历史、分支推送、Pull Request、代码审查和回滚。
- 同一时间只允许一个人切换分支和占用共享工作区；需要并行开发时，临时增加第二个目录。
- cpolar 只提供站点公网预览，不负责 SSH、代码同步或数据传输。

具体的新成员接入、分支命名、提交和 SSH 操作见仓库根目录的 [`CONTRIBUTING.md`](../CONTRIBUTING.md) 和 [`shared-ssh-development.md`](shared-ssh-development.md)。数据库、上传文件和 `.env` 的备份恢复见 [`developer-handoff.md`](developer-handoff.md)。
