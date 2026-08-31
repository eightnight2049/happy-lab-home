# 开发者环境交接与共享 Mac mini 恢复

本文档记录当前团队选择的“单目录 SSH 共享开发”方案：开发者通过局域网 SSH 登录集成 Mac mini，进入同一个项目目录，共用该主机的 Docker、数据库和上传文件。本文档中的数据库 dump、上传文件备份和环境文件，主要用于共享主机的备份、恢复和迁移，不是每位开发者的日常部署材料。

> **当前环境提醒**：本次检查发现项目工作区没有 `.env` 文件，而 `docker-compose.yml` 为 `JWT_SECRET` 和 `ADMIN_PASSWORD` 提供了开发默认值。如果当前运行中的 Compose 服务就是集成主机，请在继续使用 cpolar 对外提供访问或邀请开发者之前，先配置真实的集成环境 `.env` 并重启相关服务。已有数据库不会因为修改 `ADMIN_PASSWORD` 自动更换管理员密码，需通过账号管理或受控的密码迁移处理。

## 1. 当前决定：单目录共享

日常开发不再给每位开发者单独部署一份项目，而是：

~~~text
开发者：通过 SSH 登录共享 Mac mini
代码：共享 Mac mini 上的同一个项目目录
运行：共享同一套 Docker Compose、数据库和上传文件
协作：GitHub 保存提交历史和 Pull Request 审查记录
备份：.env、PostgreSQL dump 和上传 volume 备份由维护者私下保存
~~~

单目录的限制是同一时间只能有一个人切换分支和占用工作区；如果需要并行开发，应临时增加第二个目录。详细登录、权限和日常操作见 [`docs/shared-ssh-development.md`](shared-ssh-development.md)。

GitHub 只放代码、配置模板和文档，不放真实 `.env`、数据库 dump、上传文件和私钥。代码仍然需要 Git 提交和 Pull Request，以便保留历史和回滚能力。

备份中的管理员密码、JWT_SECRET、成员隐私和反馈数据只能通过团队认可的私有方式保存，不要上传到 GitHub 或通过 cpolar 传输。

## 2. 交接物清单

| 内容 | 放在哪里 | 是否交给每位开发者 |
| --- | --- | --- |
| 源代码、Docker 配置、文档 | GitHub 仓库 | 是 |
| npm/Python 依赖版本 | package-lock.json、requirements.txt | 是 |
| 环境变量名称和示例 | .env.example | 是 |
| 集成环境 `.env` | 维护者私下保存 | 仅恢复或迁移时使用 |
| PostgreSQL 数据 dump | 受控备份位置 | 仅恢复或迁移时使用 |
| 上传文件 volume 备份 | 受控备份位置 | 仅恢复或迁移时使用 |
| GitHub 访问权限 | GitHub 仓库成员设置 | 按职责授予 |
| cpolar 公网预览地址 | 集成维护者提供 | 测试人员可获得 |

## 3. 共享主机的标准接入流程

### 3.1 登录共享目录

管理员先确认当前项目源码已经进入 GitHub 仓库。当前项目已经连接到 `https://github.com/eightnight2049/happylab-home` 的 `main` 分支；发布或交接前仍需确认远程仓库包含完整源码，之后才能可靠地使用 Git 分支和回滚。

新开发者通过局域网 SSH 登录 Mac mini：

~~~bash
ssh <自己的 macOS 用户名>@<集成 Mac mini 局域网 IP>
cd /Volumes/mac/agent_workspace/lab-website
git status
~~~

不要在自己的 Mac 上重复 clone、启动 Docker 或复制数据库；这些服务已经在共享 Mac mini 上运行。

### 3.2 共享配置和数据

所有开发者使用共享 Mac mini 上的同一份 <code>.env</code>、数据库和上传文件。数据库和上传备份只由维护者保存，不能提交到 GitHub，也不要通过 cpolar 传输。

如果共享主机发生故障，需要恢复到另一台 Mac mini，才按本文第 5、6 节复制 <code>.env</code>、数据库 dump 和上传文件备份。

~~~dotenv
JWT_SECRET=交接环境中的密钥
ADMIN_EMAIL=交接环境中的管理员邮箱
ADMIN_PASSWORD=交接环境中的管理员密码
~~~

如果数据库 dump 中已经包含管理员账号，`ADMIN_PASSWORD` 只是容器首次初始化空数据库时的默认值；恢复已有数据库后，实际密码以 dump 中的账号记录为准。

### 3.3 启动

~~~bash
docker compose up -d --build
curl -fsS http://127.0.0.1:8080/health
~~~

如果不恢复数据库，首次启动时 API 会创建表结构并写入演示数据。要恢复完整副本，应先启动数据库并导入 dump，再启动 API：

~~~bash
docker compose up -d db
until docker compose exec -T db pg_isready -U lab -d labdb >/dev/null 2>&1; do sleep 2; done
cat backups/labdb-YYYYMMDD-HHMMSS.sql | docker compose exec -T db psql -U lab -d labdb
docker compose up -d api web caddy
~~

然后访问：

- 主页：<http://127.0.0.1:8080>
- 工作台：<http://127.0.0.1:8080/studio/login>
- API 文档：<http://127.0.0.1:8080/api/docs>

这样新的共享 Mac mini 即可恢复到交接时刻的数据库内容。

## 4. 备份和恢复的适用范围

数据库和上传文件备份适合用于：

- 需要复现一个只在集成环境出现的数据问题。
- 需要在本地检查真实发布内容的显示效果。
- 维护者要迁移集成主机或恢复灾备环境。

恢复后，新主机将拥有备份时刻的账号、成员联系方式、反馈内容和历史运营数据；恢复操作必须由维护者执行。

## 5. 集成环境数据库备份

以下操作只由集成主机维护者执行。先确认当前目录、Docker Compose 项目和备份目标，再执行。

### 5.1 备份 PostgreSQL

~~~bash
mkdir -p backups
docker compose exec -T db pg_dump -U lab -d labdb > backups/labdb-$(date +%Y%m%d-%H%M%S).sql
~~~

数据库 dump 不得提交到 GitHub。应放在有访问控制的备份磁盘、加密存储或受控传输位置。

### 5.2 备份上传文件

数据库只保存文件 URL，PDF、头像、缩略图和 MP4 在 Docker volume 中。因此还需要备份上传 volume：

~~~bash
docker volume ls
docker run --rm \
  -v <实际的 lab_uploads volume>:/from:ro \
  -v <备份目录的绝对路径>:/to \
  alpine tar czf /to/lab-uploads-$(date +%Y%m%d-%H%M%S).tgz -C /from .
~~~

<code>&lt;实际的 lab_uploads volume&gt;</code> 必须以 <code>docker volume ls</code> 的实际输出为准，不要凭记忆填写。上传备份和数据库 dump 必须来自同一时间点，恢复时才能保持 URL 对应。

### 5.3 生成完整交接目录

在已经确认 `.env` 配置正确的源 Mac mini 上执行。代码包、环境文件、数据库 dump 和上传包应该放在同一个临时交接目录，之后通过加密磁盘或团队认可的私有传输方式复制给每位开发者：

~~~bash
mkdir -p handoff
tar \
  --exclude='./node_modules' \
  --exclude='./.next' \
  --exclude='./.env' \
  --exclude='./backups' \
  --exclude='./handoff' \
  -czf handoff/lab-website-code.tgz .
cp .env handoff/.env
docker compose exec -T db pg_dump -U lab -d labdb > handoff/labdb-$(date +%Y%m%d-%H%M%S).sql
docker volume ls
shasum -a 256 handoff/* > handoff/SHA256SUMS
~~~

再按照 5.2 的命令把上传 volume 写入 `handoff/lab-uploads-YYYYMMDD-HHMMSS.tgz`，并记录三个文件的生成时间。交接目录不要放进项目目录后提交 Git；交接完成后应从源 Mac mini 的临时目录移除，或转移到受控备份位置。

如果使用压缩包复制代码而不是 GitHub clone，新开发者解压后仍应初始化自己的 Git 工作区并连接到远程仓库，后续功能合并仍然通过 GitHub 完成。

### 5.4 通过局域网复制给其他 Mac mini

推荐使用局域网 SSH 传输。每台接收文件的 Mac mini 先在“系统设置 → 通用 → 共享”中打开“远程登录”，并使用该开发者自己的 macOS 账号；不要共享集成主机的 macOS 密码。

在源 Mac mini 上，将交接目录复制到目标机器：

~~~bash
scp -r handoff <开发者账号>@<目标 Mac mini 局域网 IP>:/Users/<开发者账号>/
~~~

在目标 Mac mini 上验证文件完整性：

~~~bash
cd ~/handoff
shasum -a 256 -c SHA256SUMS
~~~

然后恢复代码、环境、数据库和上传文件：

~~~bash
mkdir -p ~/lab-website backups
tar xzf ~/handoff/lab-website-code.tgz -C ~/lab-website
cp ~/handoff/.env ~/lab-website/.env
cp ~/handoff/labdb-YYYYMMDD-HHMMSS.sql ~/lab-website/backups/
cp ~/handoff/lab-uploads-YYYYMMDD-HHMMSS.tgz ~/lab-website/backups/
cd ~/lab-website
~~~

接着按第 3.3 节先启动数据库、导入 dump，再启动 API、Web 和 Caddy；上传文件按第 6 节恢复。恢复完成后执行 `/health` 检查并打开主页、登录页、论文文件和头像。

如果不方便打开远程登录，也可以使用 AirDrop 或加密移动硬盘复制同一组文件；不要使用 cpolar 公网地址传输 `.env`、数据库 dump 或上传包。

## 6. 在新 Mac mini 恢复集成环境

恢复是维护操作，不是普通开发者的日常操作。目标 volume 可能被覆盖，执行前先确认备份文件、目标目录和当前环境。

1. 在新主机 clone 完整代码。
2. 配置只供新集成主机使用的 <code>.env</code>。
3. 先启动数据库，等待健康检查通过：

~~~bash
docker compose up -d db
until docker compose exec -T db pg_isready -U lab -d labdb >/dev/null 2>&1; do sleep 2; done
~~~

4. 将数据库 dump 导入尚未被 API 初始化的数据库：

~~~bash
cat backups/labdb-YYYYMMDD-HHMMSS.sql | docker compose exec -T db psql -U lab -d labdb
~~~

5. 恢复上传 volume 后，再启动完整服务：

~~~bash
docker compose up -d api web caddy
curl -fsS http://127.0.0.1:8080/health
~~~

6. 检查主页、工作台登录、论文 PDF/头像和 <code>/api/public/home</code>。

如果目标数据库已经被 API 启动初始化，不要直接把另一套 dump 覆盖进去；先停服务并确认是否可以清空目标数据库，必要时使用新的 Docker volume。

## 7. cpolar 在交接中的位置

cpolar 只负责让外部人员访问共享 Mac mini 的站点，不负责同步代码、数据库或开发环境：

~~~text
开发者：SSH 登录共享 Mac mini
      │
      └── 共享项目目录 + 共享 Docker Compose / 数据库
      │
      └── cpolar HTTP 隧道 → 127.0.0.1:8080
~~~

维护者可以把 cpolar 的在线公网地址发给测试人员做预览；开发者通过局域网 SSH 进入开发流程。不要使用 cpolar 隧道暴露 PostgreSQL、FastAPI <code>8000</code>、Docker socket 或 SSH。

## 8. 邀请开发者前的管理员检查表

- [ ] GitHub 仓库已经包含当前完整源码，而不是只有 README/License。
- [ ] 共享 Mac mini 可以执行 <code>docker compose up -d --build</code> 并通过 <code>/health</code>。
- [ ] <code>.env.example</code> 不包含真实密码、Token 或生产连接串。
- [ ] 当前代码和文档中的角色一致：只有 <code>admin</code> / <code>contributor</code>。
- [ ] 集成数据库和上传文件已经有可恢复的私有备份。
- [ ] <code>main</code> 已开启 Pull Request 审查，开发者不直接 push。
- [ ] 集成 Mac mini 的 cpolar 地址、用途和维护人已经明确。
- [ ] 至少有一位维护者知道如何停止、恢复和回滚集成环境。

## 9. 推荐的后续工程化

为了让“完整交接”更可靠，后续建议按优先级补充：

1. 引入 Alembic，把数据库结构变更变成可审查的迁移文件。
2. 将 <code>seed()</code> 中的演示数据拆成版本化 fixture 或独立 seed 命令。
3. 增加脱敏数据导出脚本，让开发者可以复现真实结构但看不到隐私。
4. 在 GitHub Actions 中执行 lint、typecheck、build 和 API smoke test。
5. 给集成主机建立定期数据库和上传 volume 备份，并定期演练恢复。
