# 协同开发与新成员接入手册

本文档是新开发者加入 Motion Intelligence Lab 主页项目后的第一份操作指南。关于代码、环境、数据库和上传文件的完整交接，请同时阅读 [`docs/developer-handoff.md`](docs/developer-handoff.md)。

## 1. 当前协作模式：单目录 SSH 共享开发

采用以下分工：

```text
开发者
  └── 通过局域网 SSH 登录集成 Mac mini
      └── 进入同一个项目目录，共用 Docker Compose、数据库和上传文件
          │
          ▼
GitHub 分支 / Pull Request（保存代码历史和审查记录）
```

这种方式省去每位开发者单独部署项目的步骤，代码修改和局域网预览都发生在同一台 Mac mini 上。完整的 SSH 操作、权限和交接约定见 [`docs/shared-ssh-development.md`](docs/shared-ssh-development.md)。

单目录的硬限制是：同一时间只能有一个人切换分支和占用工作区。不能让一个人编辑 `feat/a`，另一个人同时把目录切换到 `feat/b`。如果必须并行开发，应临时增加第二个目录或恢复独立副本方案。

这样做的原因：

- Docker、Node、Python 和数据库只维护在 Mac mini 上，开发者本机无需重复部署。
- 代码修改后可直接在同一套服务上验证，其他同网设备可以马上预览。
- GitHub 仍保存提交历史，便于审查、回滚和定位问题。
- 所有人看到同一份数据库和上传文件，适合小团队快速联调。
- 代价是所有数据修改会立即影响其他人，且多人不能并行切换分支。

## 2. 管理员一次性准备

### 2.1 先确认 GitHub 仓库包含当前项目

当前项目已经连接到 GitHub 仓库 `https://github.com/eightnight2049/happylab-home`，默认分支为 `main`。邀请更多开发者前，管理员仍应确认远程仓库包含完整源码，而不是只包含 README 或 License 的空壳仓库。

管理员需要确认：

1. GitHub 仓库已经创建，并且仓库地址明确。
2. 当前项目源码、`package.json`、`package-lock.json`、`backend/`、`docker-compose.yml`、`Caddyfile`、`public/`、`docs/` 和 `qa/` 都已进入仓库。
3. `.env`、密码、JWT_SECRET、数据库导出文件、Docker volume 内容没有进入仓库。
4. 默认分支命名为 `main`，并为 `main` 开启 Pull Request 审查和必要检查。

如果远程仓库已经有独立的初始提交，先在临时目录 clone 并合并确认，再推送当前项目；不要为了覆盖远程仓库而直接强制推送。

项目发布后，把下面的地址替换为真实仓库地址，再提供给新成员：

```text
git@github.com:<组织或账号>/<仓库名>.git
```

### 2.2 GitHub 权限

建议把开发者加入 GitHub 仓库，而不是共享一个 GitHub 账号或共享一把私钥：

- 日常开发者：仓库 `Write` 权限，提交分支并创建 Pull Request。
- 负责合并和集成的成员：根据需要使用 `Maintain` 或更高权限。
- 只有明确负责仓库设置、Secrets、分支保护的成员使用 `Admin`。

每位开发者使用自己的 GitHub 账号和自己的 SSH key。不要把管理员的私钥复制到其他 Mac mini。

## 3. 新开发者首次接入

### 3.1 准备本机和远程登录

开发者本机只需要准备：

- Git
- GitHub 账号和个人 SSH key
- SSH 客户端；macOS 自带

Docker、Node、Python、PostgreSQL 和项目依赖统一维护在集成 Mac mini 上，开发者不需要在本机重复部署。

先由管理员在 Mac mini 的“系统设置 → 通用 → 共享”中打开“远程登录”，并允许该开发者的 macOS 账号登录。项目目录的权限按 [`docs/shared-ssh-development.md`](docs/shared-ssh-development.md) 配置。

### 3.2 配置 GitHub SSH

如果本机还没有 GitHub 专用 key：

```bash
ssh-keygen -t ed25519 -C "<你的 GitHub 邮箱>" -f ~/.ssh/id_ed25519_github
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519_github
cat ~/.ssh/id_ed25519_github.pub
```

把最后一行输出的**公钥**添加到个人 GitHub：`Settings → SSH and GPG keys → New SSH key`。私钥 `~/.ssh/id_ed25519_github` 不能发给任何人，也不能提交到仓库。

验证：

```bash
ssh -T git@github.com
```

看到 `You've successfully authenticated` 即表示 SSH 认证成功；GitHub 返回非零退出码是正常的，因为 GitHub 不提供 Shell 登录。

### 3.3 进入共享项目目录

项目代码已经在集成 Mac mini 的共享目录中，新开发者不要在自己的 Mac 上再部署一份。登录后执行：

```bash
ssh <自己的 macOS 用户名>@<集成 Mac mini 局域网 IP>
cd /Volumes/mac/agent_workspace/lab-website
git status
```

如果管理员要求从 GitHub 恢复共享目录，才在 Mac mini 上执行：

```bash
git clone git@github.com:<组织或账号>/<仓库名>.git /Volumes/mac/agent_workspace/lab-website
```

### 3.4 使用共享环境

所有开发者共用 Mac mini 上的 `.env`、数据库和上传文件，不需要复制到自己的 Mac。管理员负责保护 `.env` 和备份文件，不得把它们提交到 GitHub、公开网盘或 cpolar。

因为数据库是共享的，删除内容、修改账号或批量导入数据前，必须先在群里说明。

### 3.5 启动和检查

Docker 命令在 SSH 终端中执行，作用于 Mac mini 上的共享服务：

```bash
docker compose ps
curl -fsS http://127.0.0.1:8080/health
```

访问：

- 主页：<http://127.0.0.1:8080>
- 工作台登录：<http://127.0.0.1:8080/studio/login>
- Swagger：<http://127.0.0.1:8080/api/docs>

需要 Demo 时：

```bash
docker compose --profile demos up -d --build
```

停止服务但保留本机数据：

```bash
docker compose down
```

`docker compose down -v` 会删除本机数据库和上传文件，只有在确认不需要保留本机数据时才能使用。

## 4. 分支、提交和合并流程

### 4.1 分支命名

共享目录的分支状态对所有人可见。开始任务前先登记目录使用权，并确认没有其他人正在编辑。然后从最新 `main` 创建任务分支：

```bash
git switch main
git pull --ff-only origin main
git switch -c feat/news-editor
```

推荐前缀：

| 前缀 | 用途 |
| --- | --- |
| `feat/` | 新功能 |
| `fix/` | Bug 修复 |
| `docs/` | 文档 |
| `refactor/` | 不改变功能的重构 |
| `chore/` | 依赖、构建或运维调整 |

### 4.2 开发和提交

开发期间确认当前分支：

```bash
git status
git branch --show-current
```

提交前至少运行：

```bash
npm run check
```

如果修改了 API、数据库模型、权限或上传逻辑，还应启动 Compose 并运行相关 `qa/` 脚本。提交时保持一次提交只表达一个完整意图，例如：

```bash
git add src backend docs
git commit -m "feat: add publication review fields"
```

不要提交：

- `.env` 或包含真实密码的文件
- `.next/`、`node_modules/`、Python 缓存
- Docker volume、数据库 dump、临时上传文件
- 与当前任务无关的格式化或大范围重命名

### 4.3 Pull Request

```bash
git push -u origin feat/news-editor
```

Pull Request 描述至少包含：

1. 解决了什么问题。
2. 改了哪些页面、API、数据字段或部署配置。
3. 如何验证，包含实际运行的命令。
4. 是否需要数据库迁移、环境变量、上传文件或部署步骤。
5. 是否有已知限制或需要产品确认的行为。

合并前检查：

- `npm run check` 通过。
- 页面和接口的权限行为符合当前角色模型。
- 新增字段已同步前后端类型、Schema 和文档。
- 没有把本机配置或敏感文件提交到 PR。
- 需要时已在集成 Mac mini 上完成局域网验证。

## 5. 共享 Mac mini 的使用约定

### 5.1 共享主机由当班开发者操作

每次任务完成并合并后，由当班开发者或维护者在共享项目目录执行：

```bash
git switch main
git pull --ff-only origin main
docker compose up -d --build
curl -fsS http://127.0.0.1:8080/health
```

其他同网设备访问：

```text
http://<集成 Mac mini 的局域网 IP>:8080
```

需要公网预览时，由维护者在 [cpolar 控制台](https://dashboard.cpolar.com/) 使用 HTTP 隧道映射集成主机的 `127.0.0.1:8080`，再把当前在线隧道地址发给测试人员。随机公网地址可能变化；cpolar 只用于访问集成站点，不用于代码 clone、SSH 开发或暴露数据库/API 端口。

共享主机上的工作目录必须实行“一个人使用、完成后交接”。若需要同时验证未合并分支，应临时增加独立目录；不要在共享目录中反复切换分支。

### 5.2 集成环境与开发环境的边界

| 环境 | 责任 | 数据 |
| --- | --- | --- |
| 开发者本机 | SSH 客户端、GitHub 操作和沟通 | 不运行项目服务 |
| 共享 Mac mini | 日常编码、合并后预览、局域网演示、跨设备验证 | 共用并定期备份 |
| 公网/生产入口 | 对外提供正式服务 | 只接受经过审查和验证的版本 |

不要在集成或生产环境中运行会批量插入演示数据的脚本，除非已经确认备份和清理方案。

## 6. API、内容和权限协作注意事项

- 当前实际角色只有 `admin` 和 `contributor`；不要在新代码中假定存在 `editor` 或 `sub-admin`。
- Contributor 的新闻、论文和成员资料默认进入待审核状态。
- 公开页面通过 `/api/public/home` 读取发布内容。
- 论文 PDF、头像、缩略图和 MP4 应通过上传接口保存，不要把运行时上传文件放入 Git。
- 修改 `backend/app/models.py` 时，必须同步检查 `schemas.py`、`main.py`、`src/lib/types.ts` 和对应表单。
- 修改 API 路由或返回字段时，必须同步更新 `docs/backend-api.md` 和 `qa/` 中的接口期望。
- 修改 `docker-compose.yml`、`Caddyfile` 或 `.env.example` 时，要在 PR 中说明对已有部署的影响。

## 7. 常用排障命令

```bash
docker compose ps
docker compose logs -f web api caddy
curl -i http://127.0.0.1:8080/health
curl -i http://127.0.0.1:8080/api/public/home
git diff --stat
git status --short
```

如果网页显示回退数据，优先检查 API 容器和数据库容器；如果只有局域网访问失败，检查访问地址是否使用了集成 Mac mini 的局域网 IP、端口 `8080` 和 macOS 防火墙。

## 8. 必须记住的安全规则

1. 不共享 GitHub 私钥、管理员密码和 `.env`。
2. 不把 PostgreSQL `5432` 或 API `8000` 直接暴露到局域网/公网，统一通过 Caddy 访问。
3. 不在公开 Issue、PR、截图或日志中粘贴 JWT、密码或真实数据库连接串。
4. 不在没有备份的情况下执行 `docker compose down -v`、数据库清空或上传 volume 删除。
5. 任何生产数据修改都先确认目标环境、备份状态和回滚方式。
