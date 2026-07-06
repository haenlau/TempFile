# Air1 TempFile

Air1 TempFile 是部署在 Cloudflare Pages Functions 上的临时文件上传站。仓库用于 GitHub 自动构建，输出 `dist/_worker.js`，运行时仍然是 Cloudflare Workers runtime。

本项目故意不提交 `wrangler.toml`，这样 KV、R2、环境变量和 Secrets 都可以继续在 Cloudflare Dashboard 里管理。

## 存储策略

| 文件大小 / 场景 | 处理方式 |
| --- | --- |
| `<= 24 MiB` | 直接存入 `TEMP_STORE` KV |
| `24 MiB - 99 MiB` | 需要配置 `LARGE_STORAGE_BACKEND`，直接转存 R2 / S3 / WebDAV |
| 单文件 `> 99 MiB` 且 `<= 2 GiB` | 仅支持 WebDAV 分片上传，分片大小为 `48 MiB`，上传完成时合并为单个 WebDAV 文件 |
| `> 2 GiB` | 拒绝上传 |
| 多文件上传 | 自动打包 ZIP，但仅支持总大小 `<= 99 MiB` |

WebDAV 分片上传时，前端先把文件切成多个 `.part0000`、`.part0001` 临时分片传到 WebDAV；所有分片上传完成后，Worker 会把这些分片合并成一个完整 WebDAV 文件，KV 只保存最终短链索引和元数据。下载时仍然使用同一个短链接，但实际下载的是合并后的单个完整文件。

固定默认值：

| 项目 | 默认值 |
| --- | --- |
| KV 小文件阈值 | `24 MiB` |
| 普通表单上传上限 | `99 MiB` |
| WebDAV 分片上传上限 | `2 GiB` |
| WebDAV 分片大小 | `48 MiB` |
| 短链有效期 | 7 天 |
| 上传会话有效期 | 24 小时 |
| 新短链格式 | 6 位数字 + 小写字母 |
| 单次最多文件数 | 20 |

## 功能

- 首页前端保持旧版 Air1 TempFile 样式和交互。
- 公开上传接口，无上传口令。
- 小文件存入 Cloudflare KV。
- 可选 R2、S3、WebDAV 作为大文件后端。
- 单文件超过 99MB 时可自动走 WebDAV 分片上传。
- 多文件自动打包为 ZIP。
- 下载链接不存在或过期时显示中文提示页。
- 可发送企业微信 Webhook、Telegram Bot 通知，也可以同时启用两种通知。
- 通知在后台无感发送，成功或失败都不会显示在上传页面，也不会影响上传结果。

## 项目结构

```text
src/
  index.ts          # Worker 入口、路由和上传流程
  html.ts           # 旧版上传页面
  config.ts         # 运行时配置
  storage.ts        # KV / 大存储 / 分片合并 / 下载逻辑
  r2.ts             # Cloudflare R2 后端
  s3.ts             # S3 / S3-compatible 后端
  webdav.ts         # WebDAV 后端
  notify.ts         # 企业微信 / Telegram 通知
  download-page.ts  # 链接不可用提示页
  utils.ts          # 通用工具
```

## Cloudflare Pages 从 GitHub 构建

在 Cloudflare Dashboard 新建 Pages 项目并连接 `haenlau/TempFile`。

| 项目 | 值 |
| --- | --- |
| Framework preset | None |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | 20 或 22 |

然后进入 Pages 项目的 `Settings -> Functions`：

- Compatibility date 设置为 `2026-07-06` 或更新日期。
- Bindings、Environment variables 和 Secrets 都通过 Web UI 添加。

构建完成后，在 Pages 项目的 `Custom domains` 中绑定 `tmp.air1.cn`。如果这个域名仍然挂在旧 Worker route 上，需要先移除旧 route，或者让 DNS/路由指向新的 Pages 项目。

## 最小配置

只使用 KV 小文件模式时，只需要绑定一个资源：

| 类型 | 名称 | 必填 | 说明 |
| --- | --- | --- | --- |
| KV namespace binding | `TEMP_STORE` | 是 | 保存短链索引和小文件内容 |

这个模式下不需要配置 WebDAV、S3、R2 或通知变量，但超过 `24 MiB` 的文件会被拒绝。

## 通用变量

| 变量名 | 必填 | 说明 |
| --- | --- | --- |
| `LARGE_STORAGE_BACKEND` | 否 | 大文件后端，可选 `none`、`r2`、`s3`、`webdav`，默认 `none` |
| `PUBLIC_BASE_URL` | 否 | 生成下载链接时使用的公开域名，默认使用当前请求域名；可设为 `https://tmp.air1.cn/` |

`PUBLIC_BASE_URL` 不是绑定域名必须项。它只影响通知和上传响应里生成的下载链接；如果你始终从正式域名访问上传页，可以不填。

## 通知通道

通知通道按变量启用：只配置企业微信就只发企业微信，只配置 Telegram 就只发 Telegram，两组都配置就两个通道都发。

通知内容为中文，包含文件名、大小、存储后端、上传 IP、时间、过期时间和下载地址。

### 企业微信 Webhook

| 变量名 | 必填 | 说明 |
| --- | --- | --- |
| `WECOM_WEBHOOK_URL` | 否 | 企业微信机器人 webhook，配置后启用企业微信通知 |

### Telegram Bot

| 变量名 | 必填 | 说明 |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | 否 | Telegram Bot token，和 `TELEGRAM_CHAT_ID` 一起配置后启用 Telegram 通知 |
| `TELEGRAM_CHAT_ID` | 否 | Telegram 接收方 chat id，可以是用户、群组或频道 id |

`TELEGRAM_BOT_TOKEN` 和 `TELEGRAM_CHAT_ID` 必须成对配置；只填其中一个时，通知会失败并写入运行日志。

## 大文件后端：R2

适合 Cloudflare 原生大文件存储。当前 R2 走普通上传通道，因此建议用于 `24 MiB - 99 MiB` 文件；超过 `99 MiB` 的浏览器上传请使用 WebDAV 分片。

| 类型 | 名称 | 必填 | 说明 |
| --- | --- | --- | --- |
| Environment variable | `LARGE_STORAGE_BACKEND=r2` | 是 | 启用 R2 大文件后端 |
| R2 bucket binding | `R2_BUCKET` | 是 | 绑定到 Pages Functions 的 R2 bucket |

## 大文件后端：S3

适合 AWS S3、Backblaze B2、MinIO、Tigris、R2 S3 API 等 S3-compatible 存储。当前 S3 走普通上传通道，因此建议用于 `24 MiB - 99 MiB` 文件；超过 `99 MiB` 的浏览器上传请使用 WebDAV 分片。

| 变量名 | 必填 | 说明 |
| --- | --- | --- |
| `LARGE_STORAGE_BACKEND` | 是 | 设为 `s3` |
| `S3_ENDPOINT` | 是 | S3 服务端点，不带 bucket，例如 `https://s3.us-east-1.amazonaws.com` |
| `S3_BUCKET` | 是 | Bucket 名称 |
| `S3_ACCESS_KEY_ID` | 是 | Access key |
| `S3_SECRET_ACCESS_KEY` | 是 | Secret key，建议作为 Secret 保存 |
| `S3_REGION` | 否 | Region，默认 `auto`；AWS S3 建议填写真实区域，例如 `us-east-1` |

当前使用 path-style URL：`S3_ENDPOINT/S3_BUCKET/object-key`。

## 大文件后端：WebDAV

WebDAV 是当前唯一支持浏览器分片上传到 `2 GiB` 的后端。项目不内置默认 WebDAV 提供商，必须显式配置 WebDAV 目录地址。

| 变量名 | 必填 | 说明 |
| --- | --- | --- |
| `LARGE_STORAGE_BACKEND` | 是 | 设为 `webdav` |
| `WEBDAV_URL` | 是 | WebDAV 目录地址，例如 `https://example.com/dav/tempfile/` |
| `WEBDAV_ACCOUNT` | 是 | WebDAV 账号 |
| `WEBDAV_PASSWORD` | 是 | WebDAV 密码，建议作为 Secret 保存 |

WebDAV 分片上传会在目标目录写入多个临时分片文件，并在完成上传时额外生成一个完整文件。KV 的 7 天 TTL 只会删除短链记录，不会自动删除 WebDAV 上的文件本体或临时分片；需要在 WebDAV 后端配置生命周期清理，或后续增加定时清理任务。

## 本地开发

安装依赖：

```bash
npm install
```

启动本地 Pages runtime：

```bash
npm run dev
```

`wrangler pages dev` 会使用本地模拟的 `TEMP_STORE` KV。

如需本地测试 WebDAV 分片上传，可以创建 `.dev.vars`：

```ini
LARGE_STORAGE_BACKEND=webdav
WEBDAV_URL=https://example.com/dav/tempfile/
WEBDAV_ACCOUNT=your-webdav-account
WEBDAV_PASSWORD=your-webdav-password
PUBLIC_BASE_URL=http://localhost:8788/
```

如需测试通知：

```ini
WECOM_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...
TELEGRAM_BOT_TOKEN=123456:your-bot-token
TELEGRAM_CHAT_ID=123456789
```

## 手动部署

如果不走 GitHub 自动构建，也可以本地构建后部署：

```bash
npm run build
npx wrangler pages deploy dist
```

手动部署时如果 Wrangler 要求选择 Pages 项目，选择你的 TempFile / air1-tempfile 项目即可。

## 注意事项

- 上传接口保持公开行为，没有上传口令。
- 普通表单上传仍受 Cloudflare 请求体限制影响，所以保留 `99 MiB` 上限。
- `2 GiB` 上传只适用于单文件 WebDAV 分片模式。
- WebDAV 分片上传完成时会多一次合并阶段，完成后下载只读取一个完整 WebDAV 文件。
- 多文件 ZIP 会占用 Worker CPU 和内存，因此只支持 `99 MiB` 内的普通上传。
- KV TTL 不会删除 R2 / S3 / WebDAV 的文件本体，需要后端存储自行清理。
