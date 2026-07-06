# Air1 TempFile

Air1 TempFile 是部署在 Cloudflare 上的临时文件上传站。这个仓库把原来手动粘贴到 Worker 的脚本改造成了 GitHub 可构建项目。

当前推荐部署方式是 **Cloudflare Pages + Advanced Worker**：GitHub 推送后由 Pages 执行构建，输出 `dist/_worker.js`，运行时仍然是 Cloudflare Workers runtime。

> 本仓库故意不提交 `wrangler.toml`。这样 KV、R2、环境变量和 Secrets 都可以继续在 Cloudflare Dashboard 里管理。

## 存储策略

默认只启用 KV 小文件存储：

- `<= 24 MiB`：直接存入 `TEMP_STORE` KV。
- `> 24 MiB`：默认拒绝上传。
- 设置 `LARGE_STORAGE_BACKEND=r2/s3/webdav` 后，大文件会转存到对应后端，KV 只保存短链索引和元数据。

固定默认值：

| 项目 | 默认值 |
| --- | --- |
| KV 小文件阈值 | 24 MiB |
| 单次上传总上限 | 99 MiB |
| 短链过期时间 | 7 天 |
| 单次最多文件数 | 20 |

## 功能

- 首页前端保持旧版 Air1 TempFile 样式和交互。
- 公开上传接口：`POST /api/upload-public`。
- 小文件存入 Cloudflare KV。
- 大文件可选转存 R2、S3 或 WebDAV。
- 多文件自动打包为 ZIP。
- 上传成功后可发送企业微信机器人通知。

## 项目结构

```text
src/
  index.ts      # Worker 入口和路由
  html.ts       # 旧版上传页面
  config.ts     # 运行时配置
  storage.ts    # KV / 大存储 / 下载逻辑
  r2.ts         # Cloudflare R2 后端
  s3.ts         # S3 / S3-compatible 后端
  webdav.ts     # WebDAV 后端
  notify.ts     # 企业微信通知
  utils.ts      # 通用工具
```

## Cloudflare Pages 从 GitHub 构建

在 Cloudflare Dashboard 新建 Pages 项目并连接 `haenlau/TempFile`。

构建设置：

| 项目 | 值 |
| --- | --- |
| Framework preset | None |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | 20 或 22 |

然后进入 Pages 项目的 Settings -> Functions：

- Compatibility date 设置为 `2026-07-06` 或更新日期。
- Bindings 和环境变量都通过 Web UI 添加。

构建完成后，在 Pages 项目的 Custom domains 中绑定 `tmp.air1.cn`。如果这个域名当前还挂在旧 Worker route 上，需要先移除旧 route，或者让 DNS/路由指向新的 Pages 项目。

## 最小配置

只使用 KV 小文件模式时，只需要绑定一个资源：

| 类型 | 名称 | 必填 | 说明 |
| --- | --- | --- | --- |
| KV namespace binding | `TEMP_STORE` | 是 | 保存短链索引和小文件内容。 |

这个模式下不需要配置 `WEBDAV_ACCOUNT`、`WEBDAV_PASSWORD`、S3 或 R2。

## 可选通用变量

| 变量名 | 必填 | 说明 |
| --- | --- | --- |
| `LARGE_STORAGE_BACKEND` | 否 | 大文件后端。可选 `none`、`r2`、`s3`、`webdav`，默认 `none`。 |
| `PUBLIC_BASE_URL` | 否 | 生成下载链接时使用的公开域名，默认使用当前请求域名。可设为 `https://tmp.air1.cn/`。 |
| `WECOM_WEBHOOK_URL` | 否 | 企业微信机器人 webhook，不填则跳过通知。 |

## 大文件后端：R2

适合最省心的 Cloudflare 原生大文件存储。

需要配置：

| 类型 | 名称 | 必填 | 说明 |
| --- | --- | --- | --- |
| Environment variable | `LARGE_STORAGE_BACKEND=r2` | 是 | 启用 R2 大文件后端。 |
| R2 bucket binding | `R2_BUCKET` | 是 | 绑定到 Pages Functions 的 R2 bucket。 |

## 大文件后端：S3

适合 AWS S3、Backblaze B2、MinIO、Tigris、R2 S3 API 等 S3-compatible 存储。

需要配置：

| 变量名 | 必填 | 说明 |
| --- | --- | --- |
| `LARGE_STORAGE_BACKEND` | 是 | 设为 `s3`。 |
| `S3_ENDPOINT` | 是 | S3 服务端点，不带 bucket，例如 `https://s3.us-east-1.amazonaws.com`。 |
| `S3_BUCKET` | 是 | Bucket 名称。 |
| `S3_ACCESS_KEY_ID` | 是 | Access key。 |
| `S3_SECRET_ACCESS_KEY` | 是 | Secret key。建议作为 Secret 保存。 |
| `S3_REGION` | 否 | Region，默认 `auto`。AWS S3 建议填真实区域，例如 `us-east-1`。 |

当前使用 path-style URL：`S3_ENDPOINT/S3_BUCKET/object-key`。

## 大文件后端：WebDAV

适合继续沿用原来的 TeraCloud/WebDAV 存储。

需要配置：

| 变量名 | 必填 | 说明 |
| --- | --- | --- |
| `LARGE_STORAGE_BACKEND` | 是 | 设为 `webdav`。 |
| `WEBDAV_URL` | 否 | WebDAV 目录地址，默认 `https://higa.teracloud.jp/dav/air1/`。 |
| `WEBDAV_ACCOUNT` | 是 | WebDAV 账号。 |
| `WEBDAV_PASSWORD` | 是 | WebDAV 密码。建议作为 Secret 保存。 |

兼容旧变量名：`WEBDAV_BASE_URL` 仍然可用，但新配置建议使用 `WEBDAV_URL`。

## 本地开发

安装依赖：

```bash
npm install
```

启动本地 Pages runtime：

```bash
npm run dev
```

`wrangler pages dev` 会用本地模拟的 `TEMP_STORE` KV。

如需本地测试大文件后端，可以创建 `.dev.vars`，例如：

```ini
LARGE_STORAGE_BACKEND=webdav
WEBDAV_URL=https://higa.teracloud.jp/dav/air1/
WEBDAV_ACCOUNT=your-webdav-account
WEBDAV_PASSWORD=your-webdav-password
PUBLIC_BASE_URL=http://localhost:8788/
```

## 手动部署

如果不走 GitHub 自动构建，也可以本地构建后部署：

```bash
npm run build
npx wrangler pages deploy dist
```

手动部署时如果 Wrangler 要求选择 Pages 项目，选择你的 TempFile/air1-tempfile 项目即可。

## 注意事项

- 上传接口保持旧版公开上传行为，没有上传口令。
- KV 的 TTL 只会删除 KV 里的记录。R2/S3/WebDAV 上的大文件本体不会被 KV 自动删除，需要定期清理后端存储。
- 多文件 ZIP 会占用 Worker CPU 和内存，建议保持单次上传在 99 MiB 或更低。
