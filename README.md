# Air1 TempFile

Air1 TempFile 是部署在 Cloudflare 上的临时文件上传站。当前仓库使用 Cloudflare Pages 的 Advanced Worker 模式：GitHub 推送后由 Pages 构建出 `dist/_worker.js`，运行时仍是 Cloudflare Workers runtime。

## 功能

- 上传口令保护上传接口。
- 小文件存入 Cloudflare KV。
- 大文件自动转存 WebDAV，KV 只保存短链索引和元数据。
- 多文件自动打包为 ZIP。
- 上传成功后可发送企业微信机器人通知。
- 短链记录默认 7 天过期。

## 项目结构

```text
src/
  index.ts      # Worker 入口和路由
  html.ts       # 上传页面
  auth.ts       # UPLOAD_TOKEN 校验
  config.ts     # 运行时配置
  storage.ts    # KV / ZIP / 下载逻辑
  webdav.ts     # WebDAV 上传和下载
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
| Compatibility date | `2026-07-06` |

构建完成后，在 Pages 项目的 Custom domains 中绑定 `tmp.air1.cn`。如果这个域名当前还挂在旧 Worker route 上，需要先移除旧 route 或让 DNS/路由指向新的 Pages 项目。

## 必须绑定的变量和资源

在 Pages 项目里进入 Settings -> Functions，绑定以下资源。

### KV namespace bindings

| Binding name | 说明 |
| --- | --- |
| `TEMP_STORE` | 保存短链索引、小文件内容、WebDAV 文件元数据。 |

建议 Production 和 Preview 都绑定 KV。Preview 可以使用单独的测试 KV。

### Environment variables / Secrets

| 变量名 | 必填 | 说明 |
| --- | --- | --- |
| `UPLOAD_TOKEN` | 是 | 上传口令。前端不会内置这个值，用户上传时手动输入。 |
| `WEBDAV_ACCOUNT` | 是 | WebDAV 账号。文件超过 `KV_MAX_BYTES` 时使用。 |
| `WEBDAV_PASSWORD` | 是 | WebDAV 密码。建议作为 Secret 保存。 |
| `WECOM_WEBHOOK_URL` | 否 | 企业微信机器人 webhook，不填则跳过通知。 |
| `WEBDAV_BASE_URL` | 否 | WebDAV 目录地址，默认 `https://higa.teracloud.jp/dav/air1/`。 |
| `PUBLIC_BASE_URL` | 否 | 生成下载链接时使用的公开域名，默认使用当前请求域名。可设为 `https://tmp.air1.cn/`。 |
| `EXPIRATION_TTL_SECONDS` | 否 | KV 短链过期时间，默认 `604800`，也就是 7 天。 |
| `MAX_UPLOAD_BYTES` | 否 | 单次上传总上限，默认 `103809024`，也就是 99 MiB。 |
| `KV_MAX_BYTES` | 否 | 小文件存 KV 的阈值，默认 `25165824`，也就是 24 MiB。超过后走 WebDAV。 |
| `MAX_FILE_COUNT` | 否 | 单次最多文件数，默认 `20`。 |

不要把这些密钥写进 GitHub。Cloudflare Pages 里 Production 和 Preview 的变量是分开的，至少 Production 需要配置完整。

## 本地开发

安装依赖：

```bash
npm install
```

创建 `.dev.vars`：

```ini
UPLOAD_TOKEN=dev-token
WEBDAV_ACCOUNT=your-webdav-account
WEBDAV_PASSWORD=your-webdav-password
WECOM_WEBHOOK_URL=
WEBDAV_BASE_URL=https://higa.teracloud.jp/dav/air1/
PUBLIC_BASE_URL=http://localhost:8788/
```

启动本地 Pages runtime：

```bash
npm run dev
```

`wrangler pages dev` 会用本地模拟的 `TEMP_STORE` KV。打开终端输出里的本地地址，用 `.dev.vars` 里的 `UPLOAD_TOKEN` 上传。

## 手动部署

如果不走 GitHub 自动构建，也可以本地构建后部署：

```bash
npm run build
npx wrangler pages deploy dist --project-name tempfile
```

## 注意事项

- KV 的 TTL 只会删除 KV 里的记录。大文件本体在 WebDAV 上不会被 KV 自动删除，需要定期清理 WebDAV 目录。
- 多文件 ZIP 会占用 Worker CPU 和内存，建议保持 `MAX_UPLOAD_BYTES` 在 99 MiB 或更低。
- 上传接口会在 `UPLOAD_TOKEN` 缺失时关闭，避免误变成公开上传站。
