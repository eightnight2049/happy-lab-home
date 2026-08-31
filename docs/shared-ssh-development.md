# 单目录 SSH 共享开发操作手册

本文档对应当前团队选择的简化方案：所有开发者通过局域网 SSH 登录同一台 Mac mini，进入同一个项目目录，共用一套 Docker Compose 服务和开发数据库。

这个方案适合人数较少、需要快速改页面或联调的团队。它省去了每个人单独部署项目的步骤，但必须接受一个限制：一个目录只有一个当前分支，不能让多人同时切换分支或同时进行互相独立的功能开发。

## 1. 当前机器和访问地址

当前检查到集成 Mac mini 的局域网地址是：

    192.168.2.130

该地址可能因路由器 DHCP 租约变化。正式使用前，建议在路由器中为这台 Mac mini 设置 DHCP 地址保留。

项目目录：

    /Volumes/mac/agent_workspace/lab-website

站点入口：

    http://192.168.2.130:8080

cpolar 只用于把站点入口转成公网预览地址，不用于 SSH、代码传输或数据库访问。

## 2. 管理员一次性准备

### 2.1 开启远程登录

在 Mac mini 打开：

    系统设置 → 通用 → 共享 → 远程登录

只允许实验室成员使用自己的 macOS 账号登录。不要多人共用管理员账号或共用 macOS 密码；这样无法追踪操作，也会把管理员权限一起暴露出去。

如果新账号无法进入项目目录，需要由管理员给项目目录配置团队共享权限。建议创建专用用户组，将开发者加入该组，再让项目目录对该组可读写。不要为了省事使用 chmod -R 777。

### 2.2 先把当前代码放入 GitHub

当前工作区检查结果是：项目根目录还没有 .git，而 GitHub 仓库 eightnight2049/happylab-home 当前只有初始 License 提交。因此需要管理员先做一次代码发布。

在项目根目录执行：

    cd /Volumes/mac/agent_workspace/lab-website
    git init -b main
    git remote add origin git@github.com:eightnight2049/happylab-home.git
    git fetch origin main
    git add .
    git commit -m "feat: import lab homepage"
    git merge origin/main --allow-unrelated-histories
    git push -u origin main

如果提示 origin 已存在，跳过 git remote add origin ...。如果提交前发现 .env、数据库 dump 或上传文件被加入暂存区，应立即移除；这些内容不能进入 GitHub。

### 2.3 配置集成环境

当前项目没有 .env 文件，Compose 会使用开发默认值。邀请其他开发者前，管理员要先配置集成环境的 .env：

    JWT_SECRET=随机长字符串
    ADMIN_EMAIL=管理员邮箱
    ADMIN_PASSWORD=管理员密码

已有数据库不会因为修改 ADMIN_PASSWORD 自动更换密码。修改后要用当前管理员账号验证登录。

## 3. 开发者如何登录

开发者在自己的 Mac 上执行：

    ssh <自己的 macOS 用户名>@192.168.2.130
    cd /Volumes/mac/agent_workspace/lab-website

如果项目目录位于挂载卷中，登录账号必须对 /Volumes/mac/agent_workspace 及项目目录具有执行和读写权限。遇到 Permission denied，交给管理员调整目录权限，不要自行放开整个磁盘权限。

也可以用 VS Code Remote - SSH：连接 ssh <用户名>@192.168.2.130，然后打开 /Volumes/mac/agent_workspace/lab-website。这样开发者本机不需要安装这套项目的 Node、Python、数据库和 Docker。

## 4. 单目录的日常协作规则

共享目录的 Git 分支状态对所有 SSH 用户是同一份。任何人执行 git switch，都会改变其他人看到的代码。因此采用“一个人占用目录、完成后交接”的约定：

    开始工作 → 在群里登记项目目录由谁使用
            → git status
            → git pull --ff-only origin main
            → 修改代码并及时提交
            → npm run check
            → push 到自己的远程分支
            → 交接目录使用权

开始任务：

    cd /Volumes/mac/agent_workspace/lab-website
    git status
    git switch main
    git pull --ff-only origin main
    git switch -c feat/<任务名>

完成任务：

    npm run check
    git add <实际修改的文件>
    git commit -m "feat: <简短说明>"
    git push -u origin feat/<任务名>

然后在 GitHub 创建 Pull Request。合并后由维护者把目录切回 main 并更新运行服务：

    git switch main
    git pull --ff-only origin main
    docker compose up -d --build

不要一个人编辑 feat/a 时，另一个人同时把目录切到 feat/b。如果必须同时开发两个功能，就需要临时增加第二个目录；这是 Git 工作区的限制。

## 5. 修改后重新构建和检查

当前 Dockerfile 会在构建时把前端和后端代码复制进镜像，不是开发热更新挂载。因此修改代码后需要重新构建：

    docker compose up -d --build web api

修改 Caddyfile 或 Compose 配置后：

    docker compose up -d --build

检查服务：

    docker compose ps
    curl -fsS http://127.0.0.1:8080/health

局域网访问：

    http://192.168.2.130:8080

## 6. 数据库、上传文件和安全边界

所有人共用当前 Docker 数据库和上传文件，修改会立即影响所有人和局域网预览站点。因此删除内容、修改账号或调整数据库前先确认影响范围；执行 docker compose down -v 前必须得到维护者确认，它可能删除数据库和上传文件。

维护者应定期备份数据库：

    mkdir -p backups
    docker compose exec -T db pg_dump -U lab -d labdb > backups/labdb-$(date +%Y%m%d-%H%M%S).sql

SSH 只在局域网使用，不要把 22 端口交给 cpolar。cpolar 只映射 127.0.0.1:8080，不要暴露 PostgreSQL 5432、FastAPI 8000、Docker socket 或 macOS 管理服务。每位开发者使用自己的 macOS 账号和 GitHub 账号，不共享私钥、密码和 .env。

## 7. 何时改成独立目录

出现以下情况时，单目录方案就不再适合：两个人需要同时开发不同功能、需要同时运行两个版本、某个任务要破坏性修改数据库，或需要清晰的个人操作审计和独立回滚。届时保留这台 Mac mini 作为集成机，再为开发者增加独立目录即可。
