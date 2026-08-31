# Motion Intelligence Lab API 说明

本文档对应当前 <code>backend/app/main.py</code> 的实际接口。通过 Docker Compose 运行时，外部统一从 Caddy 访问，不需要直接访问 API 容器或数据库容器。

## 1. 地址和认证

默认本机地址：

| 用途 | 地址 |
| --- | --- |
| 健康检查 | <code>http://127.0.0.1:8080/health</code> |
| Swagger UI | <code>http://127.0.0.1:8080/api/docs</code> |
| OpenAPI JSON | <code>http://127.0.0.1:8080/api/openapi.json</code> |
| API 根地址 | <code>http://127.0.0.1:8080</code> |
| 上传文件 | <code>http://127.0.0.1:8080/media/&lt;文件名&gt;</code> |

除公开接口外，受保护接口都使用：

~~~http
Authorization: Bearer <TOKEN>
~~~

登录或注册成功后返回 JWT Token，有效期为 12 小时。前端目前把会话保存在浏览器 <code>localStorage</code> 的 <code>motion-lab-session</code> 中；公网环境必须使用 HTTPS，并应在后续迭代中评估 HttpOnly Cookie。

当前代码只实现两个角色：

| 角色 | 说明 |
| --- | --- |
| <code>admin</code> | 管理站点、内容、审核、上传、账号和成员资料 |
| <code>contributor</code> | 提交新闻/论文和自己的成员资料，不能自行发布或管理账号 |

文档或客户端不要假定存在 <code>editor</code>、<code>sub-admin</code> 或其他未实现角色。

## 2. 公开接口

### <code>GET /health</code>

无需登录，用于容器和反向代理健康检查。

~~~json
{
  "status": "ok",
  "service": "motion-lab-api"
}
~~~

### <code>GET /api/public/home</code>

无需登录，返回公开站点快照：<code>settings</code>、已发布 <code>news</code>、可见 <code>research</code>、可见 <code>people</code> 和已发布 <code>publications</code>。

### <code>POST /api/public/visit</code>

无需登录，给站点访问计数加 1。前端使用 <code>sessionStorage</code> 尽量保证同一浏览器会话只计数一次。

### <code>POST /api/auth/register</code>

无需登录。请求：

~~~json
{
  "full_name": "Zhang San",
  "email": "zhangsan@example.com",
  "password": "at-least-8-characters"
}
~~~

成功返回 <code>201</code> 和登录响应；新账号固定为 <code>contributor</code>。邮箱重复返回 <code>409</code>，密码少于 8 个字符返回 <code>422</code>。

### <code>POST /api/auth/login</code>

无需登录。请求：

~~~json
{
  "email": "owner@example.com",
  "password": "your-password"
}
~~~

账号不存在、密码错误或账号已停用返回 <code>401</code>。

## 3. 反馈接口

当前反馈接口按代码均可公开调用：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| <code>POST</code> | <code>/api/feedback/upload</code> | 上传反馈截图，仅 PNG/JPEG/WebP，最大 10 MB |
| <code>GET</code> | <code>/api/feedback</code> | 获取反馈列表 |
| <code>POST</code> | <code>/api/feedback</code> | 创建反馈，留言最大 4000 字符 |
| <code>POST</code> | <code>/api/feedback/{feedback_id}/like</code> | 增加 Agree 计数 |
| <code>POST</code> | <code>/api/feedback/{feedback_id}/resolve</code> | 切换问题处理状态 |
| <code>PATCH</code> | <code>/api/admin/feedback/{feedback_id}</code> | 管理员直接设置处理状态 |

上传后只能在反馈 payload 中使用以 <code>/media/</code> 开头的 <code>screenshot_url</code>。由于读取、点赞和 resolve 目前没有认证或限流，公网使用前应增加滥用防护和管理员边界。

## 4. 站点设置

### <code>PUT /api/admin/settings</code>

权限：<code>admin</code>。

这是完整更新接口，需要提交完整站点设置：

~~~json
{
  "name": "Motion Intelligence Lab",
  "short_name": "MI Lab",
  "tagline": "We build intelligent machines.",
  "description": "Lab introduction...",
  "location": "School of Engineering · Shanghai",
  "email": "hello@example.com",
  "hero_kicker": "Robotics · Learning · Trust",
  "hero_image_url": "/reference/lab-dinner.jpg",
  "google_scholar_url": "https://scholar.google.com/",
  "github_url": "https://github.com/"
}
~~~

## 5. 新闻接口

| 方法 | 路径 | 权限 |
| --- | --- | --- |
| <code>POST</code> | <code>/api/admin/news</code> | 已登录 |
| <code>GET</code> | <code>/api/admin/news</code> | 已登录 |
| <code>PUT</code> | <code>/api/admin/news/{news_id}</code> | <code>admin</code>，或作者修改自己的未发布草稿 |
| <code>DELETE</code> | <code>/api/admin/news/{news_id}</code> | <code>admin</code> |

请求字段：<code>date</code>、<code>title</code>、<code>body</code>、可选的 <code>href</code>、<code>tag</code>、<code>is_published</code>。Contributor 创建或修改时，后端始终强制 <code>is_published=false</code>；管理员可以直接发布。

## 6. 论文接口

| 方法 | 路径 | 权限 |
| --- | --- | --- |
| <code>POST</code> | <code>/api/admin/publications</code> | 已登录 |
| <code>GET</code> | <code>/api/admin/publications</code> | 已登录 |
| <code>PUT</code> | <code>/api/admin/publications/{publication_id}</code> | <code>admin</code>，或作者修改自己的未发布草稿 |
| <code>DELETE</code> | <code>/api/admin/publications/{publication_id}</code> | <code>admin</code> |

论文字段包括：<code>title</code>、<code>authors</code>、<code>venue</code>、<code>venue_short</code>、<code>year</code>、<code>type</code>、<code>status</code>、<code>abstract</code>、<code>paper_url</code>、<code>pdf_url</code>、<code>code_url</code>、<code>video_url</code>、<code>thumbnail_url</code>、<code>featured</code> 和 <code>is_published</code>。

约束：标题不能为空，venue 最多 240 个字符，venue_short 最多 80 个字符，年份为 1900–2200。Contributor 提交时会被强制设为 <code>Pending review</code>、未发布且不置顶。

## 7. 上传接口

### <code>POST /api/admin/upload</code>

权限：<code>admin</code> 或 <code>contributor</code>。使用 <code>multipart/form-data</code>：

~~~bash
curl -X POST http://127.0.0.1:8080/api/admin/upload \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@/path/to/paper.pdf"
~~~

允许的 MIME 类型：

- <code>application/pdf</code>
- <code>image/png</code>
- <code>image/jpeg</code>
- <code>image/webp</code>
- <code>video/mp4</code>

单个文件最大 50 MB。成功返回：

~~~json
{
  "url": "/media/uuid-original-name.pdf"
}
~~~

文件写入 API 容器的 <code>/data/uploads</code>，对应 Docker volume <code>lab_uploads</code>。数据库只保存文件 URL，备份时必须同时备份数据库和上传 volume。

## 8. People 和个人资料

| 方法 | 路径 | 权限 |
| --- | --- | --- |
| <code>GET</code> | <code>/api/admin/people</code> | 已登录；Contributor 只能看到公开成员和自己的资料 |
| <code>GET</code> | <code>/api/admin/profile</code> | 已登录 |
| <code>PUT</code> | <code>/api/admin/profile</code> | 已登录，维护自己的资料 |
| <code>POST</code> | <code>/api/admin/people</code> | <code>admin</code> |
| <code>PUT</code> | <code>/api/admin/people/{person_id}</code> | <code>admin</code>，或 Contributor 修改与自己账号关联的资料 |
| <code>DELETE</code> | <code>/api/admin/people/{person_id}</code> | <code>admin</code> |
| <code>PATCH</code> | <code>/api/admin/people/{person_id}/account-role</code> | <code>admin</code> |

Contributor 的个人资料保存时会被强制隐藏，进入审核队列，并且邮箱固定为当前登录账号邮箱。管理员创建或修改成员资料可以直接公开。

<code>account-role</code> 请求体为：

~~~json
{
  "role": "admin"
}
~~~

或：

~~~json
{
  "role": "contributor"
}
~~~

该接口只能调整已经存在且邮箱匹配的账号；不会仅凭 People 资料创建账号。系统最多允许 5 个管理员，且不能通过账号管理删除或停用最后一个活跃管理员。

## 9. 审核队列

### <code>GET /api/admin/review-queue</code>

权限：<code>admin</code>。聚合以下未公开内容：

- <code>news</code>：<code>is_published=false</code>
- <code>publication</code>：未发布或状态为 <code>Draft</code>
- <code>person</code>：<code>is_visible=false</code>

### <code>POST /api/admin/review-queue/{content_type}/{content_id}/publish</code>

权限：<code>admin</code>。<code>content_type</code> 只能是 <code>news</code>、<code>publication</code> 或 <code>person</code>。发布后分别设置新闻已发布、论文状态为 <code>Published</code> 且已发布、成员可见。

## 10. 账号管理

| 方法 | 路径 | 权限 |
| --- | --- | --- |
| <code>GET</code> | <code>/api/admin/users</code> | <code>admin</code> |
| <code>POST</code> | <code>/api/admin/users</code> | <code>admin</code> |
| <code>PATCH</code> | <code>/api/admin/users/{user_id}</code> | <code>admin</code> |
| <code>DELETE</code> | <code>/api/admin/users/{user_id}</code> | <code>admin</code> |

创建账号请求：

~~~json
{
  "email": "new-member@example.com",
  "full_name": "New Member",
  "password": "at-least-8-characters",
  "role": "contributor"
}
~~~

管理员最多 5 个。管理员不能移除自己的管理员权限，也不能删除自己；系统会保护最后一个活跃管理员。

## 11. 本地调用和排障

启动服务：

~~~bash
docker compose up -d --build
~~~

验证公开接口：

~~~bash
curl -fsS http://127.0.0.1:8080/health
curl -fsS http://127.0.0.1:8080/api/public/home
~~~

查看 API 日志：

~~~bash
docker compose logs -f api
~~~

数据模型位于 <code>backend/app/models.py</code>，请求/响应模型位于 <code>backend/app/schemas.py</code>，路由和权限依赖位于 <code>backend/app/main.py</code>。修改其中任意一个文件时，必须同步检查前端类型、表单、项目文档和 <code>qa/</code> 检查脚本。
