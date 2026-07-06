# Air1 TempFile

Air1 TempFile 是部署在 Cloudflare 上的临时文件上传站。这个仓库把原来手动粘贴到 Worker 的脚本改造成了 GitHub 可构建项目。

当前推荐部署方式是 **Cloudflare Pages + Advanced Worker**：GitHub 推送后由 Pages 执行构建，输出 `dist/_worker.js`，运行时仍然是 Cloudflare Workers runtime。

> 重要：本仓库故意不提交 `wrangler.toml`。这样 KV 绑定、环境变量和 Secrets 可以继续在 Cloudflare Dashboard 里管理，而不会出现“此项目的绑定通过 wrangler.toml 管理”的限制。

## 功能

- 首页前端保持旧版 Air1 TempFile 样式和交互。
- 公开上传接口：`POST /api/upload-public`。
- 小文件存入 Cloudflare KV。
- 大文件自动转存 WebDAV，KV 只保存短链索引和元数据。
- 多文件自动打包为 ZIP。
- 上传成功后可发送企业微信机器人通知。
- 短链记录默认 7 天过期。

## 项目结构

```text
src/
  index.ts      # Worker 入口和路由
  html.ts       # 旧版上传页面
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

然后进入 Pages 项目的 Settings -> Functions：

- Compatibility date 设置为 `2026-07-06` 或更新日期。
- KV namespace bindings、Environment variables、Secrets 都在这里通过 Web UI 添加。

构建完成后，在 Pages 项目的 Custom domains 中绑定 `tmp.air1.cn`。如果这个域名当前还挂在旧 Worker route 上，需要先移除旧 route，或者让 DNS/路由指向新的 Pages 项目。

## 必须绑定的变量和资源

在 Pages 项目里进入 Settings -> Functions，绑定以下资源。

### KV Namespace Bindings

| Binding name | 必填 | 说明 |
| --- | --- | --- |
| `TEMP_STORE` | 是 | 保存短链索引、小文件内容、WebDAV 文件元数据。 |

建议 Production 和 Preview 都绑定 KV。Preview 可以使用单独的测试 KV。

### Environment Variables / Secrets

| 变量名 | 必填 | 说明 |
| --- | --- | --- |
| `WEBDAV_ACCOUNT` | 是 | WebDAV 账号。文件超过 `KV_MAX_BYTES` 时使用。 |
| `WEBDAV_PASSWORD` | 是 | WebDAV 密码。建议作为 Secret 保存。 |
| `WECOM_WEBHOOK_URL` | 否 | 企业微信机器人 webhook，不填则跳过通知。 |
| `WEBDAV_BASE_URL` | 否 | WebDAV 目录地址，默认 `https://higa.teracloud.jp/dav/air1/`。 |
| `PUBLIC_BASE_URL` | 否 | 生成下载链接时使用的公开域名，默认使用当前请求域名。可设为 `https://tmp.air1.cn/`。 |
| `EXPIRATION_TTL_SECONDS` | 否 | KV 短链过期时间，默认 `604800`，也就是 7 天。 |
| `MAX_UPLOAD_BYTES` | 否 | 单次上传总上限，默认 `103809024`，也就是 99 MiB。 |
| `KV_MAX_BYTES` | 否 | 小文件存 KV 的阈值，默认 `25165824`，也就是 24 MiB。超过后走 WebDAV。 |
| `MAX_FILE_COUNT` | 否 | 单次最多文件数，默认 `20`。 |
| `UPLOAD_TOKEN` | 否 | 当前版本不使用。旧 Cloudflare 项目里如果已经绑定，保留也不会影响运行。 |

不要把账号、密码、Webhook 写进 GitHub。Cloudflare Pages 里 Production 和 Preview 的变量是分开的，至少 Production 需要配置完整。

## 如果 Dashboard 提示 wrangler.toml 管理

如果你看到“此项目的绑定在通过 wrangler.toml 进行管理”，说明 Cloudflare 当前部署仍然看到了旧提交里的 `wrangler.toml`。

处理方式：

1. 确认 GitHub 最新提交里根目录没有 `wrangler.toml`。
2. 在 Cloudflare Pages 里重新触发一次部署。
3. 部署完成后刷新 Settings -> Functions 页面。

从移除 `wrangler.toml` 的提交开始，绑定就应该可以回到 Dashboard 里管理。

## 本地开发

安装依赖：

```bash
npm install
```

如需测试 WebDAV 大文件路径，可以创建 `.dev.vars`：

```ini
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

`wrangler pages dev` 会用本地模拟的 `TEMP_STORE` KV。

## 手动部署

如果不走 GitHub 自动构建，也可以本地构建后部署：

```bash
npm run build
npx wrangler pages deploy dist
```

手动部署时如果 Wrangler 要求选择 Pages 项目，选择你的 TempFile/air1-tempfile 项目即可。

## 注意事项

- 上传接口保持旧版公开上传行为，没有上传口令。
- KV 的 TTL 只会删除 KV 里的记录。大文件本体在 WebDAV 上不会被 KV 自动删除，需要定期清理 WebDAV 目录。
- 多文件 ZIP 会占用 Worker CPU 和内存，建议保持 `MAX_UPLOAD_BYTES` 在 99 MiB 或更低。
