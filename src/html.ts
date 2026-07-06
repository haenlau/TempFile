export const HTML = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Air1 TempFile</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7fb;
      --panel: #ffffff;
      --text: #172033;
      --muted: #667085;
      --line: #d8dee9;
      --primary: #2563eb;
      --primary-dark: #1d4ed8;
      --danger: #b42318;
      --ok: #047857;
      --shadow: 0 18px 55px rgba(23, 32, 51, 0.12);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background:
        linear-gradient(180deg, rgba(37, 99, 235, 0.08), rgba(4, 120, 87, 0.05) 45%, transparent 80%),
        var(--bg);
      color: var(--text);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
    }

    main {
      width: min(720px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 48px 0 32px;
    }

    header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
    }

    h1 {
      margin: 0;
      font-size: clamp(30px, 5vw, 48px);
      line-height: 1;
      letter-spacing: 0;
    }

    .badge {
      color: var(--muted);
      font-size: 14px;
      white-space: nowrap;
    }

    .panel {
      background: var(--panel);
      border: 1px solid rgba(216, 222, 233, 0.86);
      border-radius: 8px;
      box-shadow: var(--shadow);
      padding: 22px;
    }

    .drop-area {
      display: grid;
      place-items: center;
      min-height: 220px;
      border: 1.5px dashed #9aa7bd;
      border-radius: 8px;
      background: #fbfcff;
      cursor: pointer;
      transition: border-color 0.18s ease, background 0.18s ease;
      text-align: center;
      padding: 24px;
    }

    .drop-area:hover,
    .drop-area.dragover {
      border-color: var(--primary);
      background: #eef4ff;
    }

    .drop-title {
      margin: 0 0 8px;
      font-size: 20px;
      font-weight: 760;
    }

    .drop-subtitle,
    .selected-file,
    .footer {
      color: var(--muted);
      font-size: 14px;
    }

    .selected-file {
      display: none;
      margin: 12px 0 0;
      overflow-wrap: anywhere;
    }

    .controls {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      margin-top: 18px;
    }

    input[type="password"] {
      width: 100%;
      min-height: 44px;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 0 13px;
      font-size: 15px;
      outline: none;
    }

    input[type="password"]:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    button {
      min-height: 44px;
      border: 0;
      border-radius: 8px;
      padding: 0 18px;
      background: var(--primary);
      color: #fff;
      font-size: 15px;
      font-weight: 720;
      cursor: pointer;
    }

    button:hover {
      background: var(--primary-dark);
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.58;
    }

    .progress {
      display: none;
      margin-top: 18px;
    }

    .progress-track {
      height: 8px;
      overflow: hidden;
      border-radius: 999px;
      background: #e7ecf5;
    }

    .progress-fill {
      width: 0%;
      height: 100%;
      background: linear-gradient(90deg, var(--primary), var(--ok));
      transition: width 0.18s ease;
    }

    .status {
      margin: 10px 0 0;
      min-height: 20px;
      color: var(--muted);
      font-size: 14px;
      overflow-wrap: anywhere;
    }

    .result {
      display: none;
      margin-top: 18px;
      padding: 16px;
      border: 1px solid #b7e4ca;
      border-radius: 8px;
      background: #f0fdf4;
    }

    .result.show {
      display: block;
    }

    .result-title {
      margin: 0 0 10px;
      color: var(--ok);
      font-weight: 760;
    }

    .result-link {
      display: block;
      color: var(--primary-dark);
      overflow-wrap: anywhere;
      line-height: 1.5;
    }

    .copy-row {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 10px;
      margin-top: 12px;
      flex-wrap: wrap;
    }

    .copy-btn {
      min-height: 36px;
      padding: 0 13px;
      background: #172033;
    }

    .copy-btn:hover {
      background: #0f172a;
    }

    .error {
      color: var(--danger);
    }

    .footer {
      margin: 16px 0 0;
      text-align: center;
    }

    @media (max-width: 560px) {
      main {
        width: min(100vw - 24px, 720px);
        padding-top: 24px;
      }

      header {
        align-items: flex-start;
        flex-direction: column;
      }

      .controls {
        grid-template-columns: 1fr;
      }

      button {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Air1 TempFile</h1>
      <div class="badge">tmp.air1.cn</div>
    </header>

    <section class="panel">
      <div class="drop-area" id="dropArea" role="button" tabindex="0">
        <div>
          <p class="drop-title">选择或拖放文件</p>
          <div class="drop-subtitle">单次上传上限由服务端配置控制</div>
          <input id="fileInput" type="file" multiple hidden>
          <div class="selected-file" id="selectedFile"></div>
        </div>
      </div>

      <div class="controls">
        <input id="tokenInput" type="password" autocomplete="current-password" placeholder="上传口令">
        <button id="uploadBtn" type="button">上传</button>
      </div>

      <div class="progress" id="progress">
        <div class="progress-track">
          <div class="progress-fill" id="progressFill"></div>
        </div>
        <p class="status" id="statusText"></p>
      </div>

      <div class="result" id="result">
        <p class="result-title">上传完成</p>
        <a class="result-link" id="resultLink" target="_blank" rel="noopener noreferrer"></a>
        <div class="copy-row">
          <button class="copy-btn" id="copyBtn" type="button">复制链接</button>
          <span class="status" id="resultMeta"></span>
        </div>
      </div>
    </section>

    <p class="footer">Part of Air1 Quick Tools · Powered by Cloudflare</p>
  </main>

  <script>
    const dropArea = document.getElementById("dropArea");
    const fileInput = document.getElementById("fileInput");
    const selectedFile = document.getElementById("selectedFile");
    const tokenInput = document.getElementById("tokenInput");
    const uploadBtn = document.getElementById("uploadBtn");
    const progress = document.getElementById("progress");
    const progressFill = document.getElementById("progressFill");
    const statusText = document.getElementById("statusText");
    const result = document.getElementById("result");
    const resultLink = document.getElementById("resultLink");
    const resultMeta = document.getElementById("resultMeta");
    const copyBtn = document.getElementById("copyBtn");
    const tokenStorageKey = "air1-tempfile-upload-token";

    tokenInput.value = localStorage.getItem(tokenStorageKey) || "";

    function preventDefaults(event) {
      event.preventDefault();
      event.stopPropagation();
    }

    function updateSelection() {
      const files = Array.from(fileInput.files || []);
      if (!files.length) {
        selectedFile.style.display = "none";
        selectedFile.textContent = "";
        return;
      }

      let names = files.map((file) => file.name).join(", ");
      if (names.length > 96) names = names.slice(0, 96) + "...";
      selectedFile.textContent = "已选择 " + files.length + " 个文件：" + names;
      selectedFile.style.display = "block";
    }

    ["dragenter", "dragover", "dragleave", "drop"].forEach((name) => {
      dropArea.addEventListener(name, preventDefaults, false);
    });

    ["dragenter", "dragover"].forEach((name) => {
      dropArea.addEventListener(name, () => dropArea.classList.add("dragover"), false);
    });

    ["dragleave", "drop"].forEach((name) => {
      dropArea.addEventListener(name, () => dropArea.classList.remove("dragover"), false);
    });

    dropArea.addEventListener("drop", (event) => {
      fileInput.files = event.dataTransfer.files;
      updateSelection();
    });

    dropArea.addEventListener("click", () => fileInput.click());
    dropArea.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") fileInput.click();
    });
    fileInput.addEventListener("change", updateSelection);

    function setBusy(isBusy) {
      uploadBtn.disabled = isBusy;
      uploadBtn.textContent = isBusy ? "上传中..." : "上传";
    }

    function setProgress(percent, message) {
      progress.style.display = "block";
      progressFill.style.width = percent + "%";
      statusText.textContent = message;
      statusText.classList.remove("error");
    }

    function showError(message) {
      progress.style.display = "block";
      statusText.textContent = message;
      statusText.classList.add("error");
    }

    function uploadFiles() {
      const files = Array.from(fileInput.files || []);
      if (!files.length) {
        showError("请选择至少一个文件。");
        return;
      }

      const token = tokenInput.value.trim();
      if (!token) {
        showError("请输入上传口令。");
        tokenInput.focus();
        return;
      }

      localStorage.setItem(tokenStorageKey, token);
      result.classList.remove("show");
      setBusy(true);
      setProgress(0, "准备上传...");

      const formData = new FormData();
      files.forEach((file) => formData.append("file", file));

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");
      xhr.setRequestHeader("Authorization", "Bearer " + token);

      xhr.upload.addEventListener("progress", (event) => {
        if (!event.lengthComputable) return;
        const percent = Math.max(1, Math.round((event.loaded / event.total) * 100));
        setProgress(percent, "上传中... " + percent + "%");
      });

      xhr.addEventListener("load", () => {
        setBusy(false);
        let payload = {};

        try {
          payload = JSON.parse(xhr.responseText || "{}");
        } catch {
          showError("服务端返回格式错误。");
          return;
        }

        if (xhr.status < 200 || xhr.status >= 300 || !payload.downloadUrl) {
          showError(payload.error || "上传失败。");
          return;
        }

        progressFill.style.width = "100%";
        statusText.textContent = "上传完成。";
        resultLink.href = payload.downloadUrl;
        resultLink.textContent = payload.downloadUrl;
        resultMeta.textContent = payload.storage ? "存储：" + payload.storage : "";
        result.classList.add("show");

        if (payload.notifyError) {
          statusText.textContent = "上传完成，但通知失败：" + payload.notifyError;
          statusText.classList.add("error");
        }
      });

      xhr.addEventListener("error", () => {
        setBusy(false);
        showError("网络错误，请重试。");
      });

      xhr.addEventListener("abort", () => {
        setBusy(false);
        showError("上传已取消。");
      });

      xhr.send(formData);
    }

    uploadBtn.addEventListener("click", uploadFiles);
    copyBtn.addEventListener("click", async () => {
      const text = resultLink.href;
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = "已复制";
        setTimeout(() => {
          copyBtn.textContent = "复制链接";
        }, 1600);
      } catch {
        showError("复制失败，请手动选择链接。");
      }
    });
  </script>
</body>
</html>`;
