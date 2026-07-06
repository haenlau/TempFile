export function downloadUnavailableResponse(): Response {
  return new Response(
    `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Air1 TempFile - 链接不可用</title>
  <style>
    :root {
      --bg: #0f0f12;
      --card-bg: rgba(255, 255, 255, 0.06);
      --card-border: rgba(255, 255, 255, 0.1);
      --text: #f0f0f5;
      --muted: #a0a0b0;
      --primary: #4d9fff;
      --shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      --radius: 18px;
    }

    @media (prefers-color-scheme: light) {
      :root {
        --bg: #f8f9ff;
        --card-bg: rgba(255, 255, 255, 0.7);
        --card-border: rgba(0, 0, 0, 0.08);
        --text: #1a1a25;
        --muted: #666;
        --shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
      }
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1.5rem;
      background: var(--bg);
      color: var(--text);
      font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    body::before {
      content: "";
      position: fixed;
      inset: 0;
      background:
        radial-gradient(circle at 20% 30%, rgba(77, 159, 255, 0.06) 0%, transparent 40%),
        radial-gradient(circle at 80% 70%, rgba(77, 159, 255, 0.04) 0%, transparent 50%);
      pointer-events: none;
      z-index: -1;
    }

    main {
      width: 100%;
      max-width: 520px;
      text-align: center;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      padding: 2rem 1.5rem;
    }

    h1 {
      margin: 0 0 0.7rem;
      font-size: 1.7rem;
    }

    p {
      margin: 0;
      color: var(--muted);
      line-height: 1.7;
    }

    a {
      display: inline-block;
      margin-top: 1.5rem;
      color: var(--primary);
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <main>
    <h1>链接不存在或已过期</h1>
    <p>这个临时文件链接已经失效，可能是 7 天保存期已结束，或者文件记录已被清理。</p>
    <a href="/">返回 Air1 TempFile</a>
  </main>
</body>
</html>`,
    {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
