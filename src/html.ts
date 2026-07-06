export const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
 <meta charset="utf-8" />
 <meta name="viewport" content="width=device-width, initial-scale=1" />
 <title>\u2728 Air1 TempFile</title>
 <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGNpcmNsZSBjeD0iMTAwIiBjeT0iMTAwIiByPSI5MCIgZmlsbD0iIzYzNjZmMSIgc3Ryb2tlPSIjODExY2Y4IiBzdHJva2Utd2lkdGg9IjIiLz4KICA8cGF0aCBkPSJNODAgODBDODAgNzUuNiA4My42IDcyIDg4IDcySDExMkMxMTYuNCA3MiAxMjAgNzUuNiAxMjAgODB2NDBDMTIwIDEyNC40IDExNi40IDEyOCAxMTIgMTI4SDg4QzgzLjYgMTI4IDgwIDEyNC40IDgwIDEyMFY4MFoiIGZpbGw9IndoaXRlIi8+CiAgPHBhdGggZD0iTTEwMCA5MFYxMDBIMTFWOTBIMTAweiIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjODExY2Y4IiBzdHJva2Utd2lkdGg9IjEuNSIvPgogIDxwYXRoIGQ9Ik0xMDAgMTExVjEyMEgxMVYxMTFIMTAweiIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjODExY2Y4IiBzdHJva2Utd2lkdGg9IjEuNSIvPgo8L3N2Zz4="/>
 <style>
 :root {
 --bg: #0f0f12;
 --card-bg: rgba(255, 255, 255, 0.06);
 --card-border: rgba(255, 255, 255, 0.1);
 --text: #f0f0f5;
 --muted: #a0a0b0;
 --primary: #4d9fff;
 --success: #4ade80;
 --danger: #f87171;
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
 --primary: #2563eb;
 --success: #16a34a;
 --danger: #dc2626;
 --shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
 }
 }

 * {
 margin: 0;
 padding: 0;
 box-sizing: border-box;
 }

 body {
 background: var(--bg);
 color: var(--text);
 font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
 min-height: 100vh;
 display: flex;
 flex-direction: column;
 align-items: center;
 justify-content: center;
 padding: 2rem 1.5rem;
 position: relative;
 overflow-x: hidden;
 }

 body::before {
 content: "";
 position: absolute;
 top: 0;
 left: 0;
 width: 100%;
 height: 100%;
 background:
 radial-gradient(circle at 20% 30%, rgba(77, 159, 255, 0.06) 0%, transparent 40%),
 radial-gradient(circle at 80% 70%, rgba(77, 159, 255, 0.04) 0%, transparent 50%);
 pointer-events: none;
 z-index: -1;
 }

 .container {
 width: 100%;
 max-width: 520px;
 text-align: center;
 }

 h1 {
 font-weight: 700;
 font-size: 2.2rem;
 margin-bottom: 0.4rem;
 background: linear-gradient(135deg, #ffffff, #a0a0ff);
 -webkit-background-clip: text;
 background-clip: text;
 color: transparent;
 background-size: 200% 200%;
 animation: gradientShift 8s ease infinite;
 }

 @keyframes gradientShift {
 0% { background-position: 0% 50%; }
 50% { background-position: 100% 50%; }
 100% { background-position: 0% 50%; }
 }

 .subtitle {
 color: var(--muted);
 font-size: 0.95rem;
 margin-bottom: 2.2rem;
 }

 .upload-card {
 background: var(--card-bg);
 border: 1px solid var(--card-border);
 backdrop-filter: blur(12px);
 -webkit-backdrop-filter: blur(12px);
 border-radius: var(--radius);
 padding: 2.2rem 1.5rem;
 margin-bottom: 1.8rem;
 cursor: pointer;
 transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
 position: relative;
 overflow: hidden;
 }

 .upload-card:hover {
 transform: translateY(-4px);
 box-shadow: var(--shadow);
 border-color: rgba(77, 159, 255, 0.3);
 }

 .upload-card.dragover {
 border-color: var(--primary);
 background: rgba(77, 159, 255, 0.08);
 }

 .upload-icon {
 font-size: 3.2rem;
 margin-bottom: 1.2rem;
 display: block;
 transition: transform 0.3s;
 }

 .upload-card:hover .upload-icon {
 transform: scale(1.1) rotate(3deg);
 }

 .upload-text {
 font-size: 1.1rem;
 font-weight: 500;
 margin-bottom: 0.4rem;
 }

 .upload-hint {
 font-size: 0.85rem;
 color: var(--muted);
 }

 .selected-file {
 margin-top: 0.6rem;
 font-size: 0.85rem;
 color: var(--primary);
 display: none;
 }

 #fileInput {
 display: none;
 }

 .btn {
 width: 100%;
 padding: 0.95rem;
 background: var(--primary);
 color: white;
 border: none;
 border-radius: 14px;
 font-size: 1.05rem;
 font-weight: 600;
 cursor: pointer;
 transition: all 0.25s;
 letter-spacing: 0.3px;
 }

 .btn:hover:not(:disabled) {
 background: #3a8bff;
 transform: translateY(-2px);
 box-shadow: 0 6px 16px rgba(77, 159, 255, 0.3);
 }

 .btn:disabled {
 opacity: 0.7;
 cursor: not-allowed;
 transform: none;
 box-shadow: none;
 }

 .result-card {
 background: var(--card-bg);
 border: 1px solid var(--card-border);
 backdrop-filter: blur(12px);
 -webkit-backdrop-filter: blur(12px);
 border-radius: var(--radius);
 padding: 1.6rem;
 margin-top: 1.5rem;
 display: none;
 }

 .result-card.show {
 display: block;
 animation: fadeIn 0.4s ease;
 }

 @keyframes fadeIn {
 from { opacity: 0; transform: translateY(10px); }
 to { opacity: 1; transform: translateY(0); }
 }

 .result-title {
 font-size: 1.1rem;
 margin-bottom: 1rem;
 color: var(--success);
 font-weight: 600;
 }

 .result-item {
 margin-bottom: 1rem;
 text-align: center;
 padding: 0.8rem;
 background: rgba(77, 159, 255, 0.05);
 border-radius: 10px;
 display: flex;
 flex-direction: column;
 align-items: center;
 }
 .result-filename {
 font-weight: bold;
 margin-bottom: 0.3rem;
 color: var(--text);
 }

 .result-link {
 display: block;
 word-break: break-all;
 color: var(--primary);
 text-decoration: none;
 font-size: 0.9rem;
 font-family: monospace;
 margin: 0.2rem 0;
 }

 .copy-btn {
 background: rgba(255, 255, 255, 0.12);
 color: var(--text);
 border: none;
 padding: 0.4rem 0.8rem;
 border-radius: 8px;
 font-weight: 600;
 cursor: pointer;
 transition: all 0.2s;
 font-size: 0.85rem;
 }

 .copy-btn:hover {
 background: rgba(255, 255, 255, 0.2);
 }

 .copy-btn.copied {
 background: var(--success);
 color: white;
 }

 .error-msg {
 color: var(--danger);
 margin-top: 0.5rem;
 font-size: 0.85rem;
 }

 /* ===== \u65B0\u589E\uFF1A\u8FDB\u5EA6\u6761\u6837\u5F0F ===== */
 .progress-track {
 height: 6px;
 background: rgba(255, 255, 255, 0.1);
 border-radius: 3px;
 margin-top: 1.2rem;
 overflow: hidden;
 display: none; /* \u521D\u59CB\u9690\u85CF */
 }

 .progress-fill {
 height: 100%;
 width: 0%;
 border-radius: 3px;
 transition: width 0.2s ease;
 /* \u9ED8\u8BA4\u6837\u5F0F (\u53EF\u9009\uFF0C\u4F8B\u5982\u4E0A\u4F20\u4E2D) */
 background: var(--primary);
 }
 .progress-fill.uploading {
     background: linear-gradient(to right, var(--primary), #80c4ff);
 }
 .progress-fill.completed {
     background: var(--success);
 }

 .progress-text {
 margin-top: 0.4rem;
 font-size: 0.85rem;
 color: var(--muted);
 }

 .footer {
 margin-top: 2.5rem;
 color: var(--muted);
 font-size: 0.8rem;
 opacity: 0.8;
 }

 @media (max-width: 480px) {
 h1 { font-size: 1.8rem; }
 .upload-card { padding: 1.8rem 1rem; }
 }
 </style>
</head>
<body>
 <div class="container">
 <h1>Air1 TempFile</h1>
 <p class="subtitle">\u5B89\u5168\u4E0A\u4F20 \xB7 \u591A\u6587\u4EF6\u81EA\u52A8\u6253\u5305 \xB7 7\u5929\u81EA\u52A8\u9500\u6BC1</p>

 <div class="upload-card" id="dropArea">
 <span class="upload-icon">\u{1F4E4}</span>
 <p class="upload-text">\u62D6\u62FD\u6587\u4EF6\u6216\u70B9\u51FB\u4E0A\u4F20</p>
 <p class="upload-hint">\u652F\u6301\u4EFB\u610F\u683C\u5F0F</p>
 <p class="selected-file" id="selectedFile"></p>
 <input type="file" id="fileInput" multiple />
 </div>

 <button class="btn" id="uploadBtn" onclick="uploadFiles()">\u786E\u8BA4\u4E0A\u4F20</button>

 <!-- ===== \u65B0\u589E\uFF1A\u8FDB\u5EA6\u6761\u5BB9\u5668 ===== -->
 <div class="progress-track" id="progressTrack">
 <div class="progress-fill" id="progressFill"></div>
 </div>
 <p class="progress-text" id="progressText" style="display:none;">\u4E0A\u4F20\u4E2D...</p>

 <div class="result-card" id="resultCard">
 <div class="result-title">\u2705 \u4E0A\u4F20\u5B8C\u6210</div>
 <div id="resultsList"></div>
 </div>

 <p class="footer">Part of <strong>Air1 Quick Tools</strong> \xB7 Powered by Cloudflare</p>
 </div>

 <script>
 const dropArea = document.getElementById('dropArea');
 const fileInput = document.getElementById('fileInput');
 const uploadBtn = document.getElementById('uploadBtn');
 const resultCard = document.getElementById('resultCard');
 const resultsList = document.getElementById('resultsList');
 const progressTrack = document.getElementById('progressTrack');
 const progressFill = document.getElementById('progressFill');
 const progressText = document.getElementById('progressText');
 const selectedFileEl = document.getElementById('selectedFile');

 ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => {
 dropArea.addEventListener(e, preventDefaults, false);
 });

 function preventDefaults(e) {
 e.preventDefault();
 e.stopPropagation();
 }

 ['dragenter', 'dragover'].forEach(e => {
 dropArea.addEventListener(e, () => dropArea.classList.add('dragover'), false);
 });

 ['dragleave', 'drop'].forEach(e => {
 dropArea.addEventListener(e, () => dropArea.classList.remove('dragover'), false);
 });

 dropArea.addEventListener('drop', e => {
 fileInput.files = e.dataTransfer.files;
 fileInput.dispatchEvent(new Event('change'));
 });

 dropArea.addEventListener('click', () => fileInput.click());

 fileInput.addEventListener('change', () => {
 const files = fileInput.files;
 if (files.length > 0) {
 let names = Array.from(files).map(f => f.name).join(', ');
 if (names.length > 60) names = names.substring(0, 60) + '...';
 selectedFileEl.textContent = '\u5DF2\u9009\u62E9 ' + files.length + ' \u4E2A\u6587\u4EF6\uFF1A' + names;
 selectedFileEl.style.display = 'block';
 } else {
 selectedFileEl.style.display = 'none';
 }
 });

 // ====== \u65B0\u589E\uFF1A\u4E0A\u4F20\u8FDB\u5EA6\u51FD\u6570 ======
 function updateProgress(loaded, total) {
 const percent = Math.round((loaded / total) * 100);
 progressFill.style.width = percent + '%';
 progressText.textContent = '\u4E0A\u4F20\u4E2D... ' + percent + '%';
 // \u786E\u4FDD\u4E0A\u4F20\u4E2D\u72B6\u6001
 progressFill.classList.add('uploading');
 progressFill.classList.remove('completed');
 }

 async function uploadFiles() {
 const files = Array.from(fileInput.files);
 if (!files.length) return alert('\u8BF7\u9009\u62E9\u81F3\u5C11\u4E00\u4E2A\u6587\u4EF6');

 for (const file of files) {
 if (file.size > 99 * 1024 * 1024) {
 return alert('\u300C' + file.name + '\u300D\u4E0D\u80FD\u8D85\u8FC7 99MB');
 }
 }

 resultCard.classList.remove('show');
 resultsList.innerHTML = ''; // Clear previous results
 // ====== \u4FEE\u6539\uFF1A\u66F4\u65B0\u6309\u94AE\u72B6\u6001 ======
 uploadBtn.disabled = true;
 uploadBtn.textContent = '\u4E0A\u4F20\u4E2D...';
 progressTrack.style.display = 'block'; // \u663E\u793A\u8FDB\u5EA6\u6761
 progressText.style.display = 'block'; // \u663E\u793A\u8FDB\u5EA6\u6587\u672C
 progressFill.style.width = '0%'; // \u91CD\u7F6E\u8FDB\u5EA6
 // \u786E\u4FDD\u521D\u59CB\u72B6\u6001
 progressFill.classList.remove('completed'); // \u79FB\u9664\u5B8C\u6210\u72B6\u6001
 progressFill.classList.add('uploading'); // \u6DFB\u52A0\u4E0A\u4F20\u4E2D\u72B6\u6001

 const formData = new FormData();
 files.forEach(f => formData.append('file', f));

 function resetUploadUI() {
 uploadBtn.disabled = false;
 uploadBtn.textContent = '\u786E\u8BA4\u4E0A\u4F20';
 progressTrack.style.display = 'none';
 progressText.style.display = 'none';
 progressText.textContent = '\u4E0A\u4F20\u4E2D... 0%';
 }

 try {
 // \u4F7F\u7528 XMLHttpRequest \u5B9E\u73B0\u8FDB\u5EA6\u76D1\u542C
 const xhr = new XMLHttpRequest();

 // \u76D1\u542C\u4E0A\u4F20\u8FDB\u5EA6
 xhr.upload.addEventListener('progress', (e) => {
 if (e.lengthComputable) {
 updateProgress(e.loaded, e.total);
 }
 });

 // \u76D1\u542C\u8BF7\u6C42\u5B8C\u6210
 xhr.addEventListener('load', () => {
 if (xhr.status >= 200 && xhr.status < 300) {
 try {
 const res = JSON.parse(xhr.responseText);
 if (res.downloadUrl) {
 const div = document.createElement('div');
 div.className = 'result-item';

 const filenameEl = document.createElement('div');
 filenameEl.className = 'result-filename';
 let filename = files.length === 1 ? files[0].name : 'upload_' + res.fileId + '.zip';
 filenameEl.textContent = '\u{1F4C1} ' + filename;
 div.appendChild(filenameEl);

 const linkEl = document.createElement('a');
 linkEl.className = 'result-link';
 linkEl.href = res.downloadUrl;
 linkEl.target = '_blank';
 linkEl.textContent = res.downloadUrl;
 div.appendChild(linkEl);

 const copyBtn = document.createElement('button');
 copyBtn.className = 'copy-btn';
 copyBtn.textContent = '\u{1F4CB} \u590D\u5236';
 copyBtn.onclick = function() {
 copyText({ target: copyBtn }, res.downloadUrl);
 };
 div.appendChild(copyBtn);

 resultsList.appendChild(div);
 resultCard.classList.add('show');
 } else {
 alert(res.error || '\u4E0A\u4F20\u5931\u8D25');
 }
 } catch (parseError) {
 console.error('JSON parse error:', parseError);
 alert('\u670D\u52A1\u5668\u8FD4\u56DE\u683C\u5F0F\u9519\u8BEF');
 }
 } else {
 console.error('Upload error:', xhr.statusText);
 alert('\u4E0A\u4F20\u5931\u8D25: ' + xhr.statusText);
 }
 resetUploadUI();
 });

 xhr.addEventListener('error', () => {
 console.error('Network error during upload');
 alert('\u7F51\u7EDC\u9519\u8BEF\uFF0C\u8BF7\u91CD\u8BD5');
 resetUploadUI();
 });

 xhr.addEventListener('abort', () => {
 console.log('Upload aborted');
 alert('\u4E0A\u4F20\u88AB\u53D6\u6D88');
 resetUploadUI();
 });

 // \u53D1\u9001\u8BF7\u6C42
 xhr.open('POST', '/api/upload-public');
 xhr.send(formData);

 } catch (e) {
 console.error('Upload error:', e);
 alert('\u4E0A\u4F20\u521D\u59CB\u5316\u5931\u8D25');
 resetUploadUI();
 } finally {
 // \u6CE8\u610F\uFF1A\u8FD9\u91CC\u4E0D\u518D\u7ACB\u5373\u9690\u85CF\u8FDB\u5EA6\u6761\uFF0C\u56E0\u4E3A\u8FDB\u5EA6\u7531 xhr \u4E8B\u4EF6\u63A7\u5236
 // \u5F53 xhr \u5B8C\u6210\u6216\u51FA\u9519\u65F6\uFF0C\u8FDB\u5EA6\u6761\u548C\u6587\u672C\u7684\u9690\u85CF\u5E94\u5728\u4E8B\u4EF6\u5904\u7406\u51FD\u6570\u4E2D\u5B8C\u6210
 // \u4E3A\u4E86\u7B80\u5316\uFF0C\u6211\u4EEC\u53EF\u4EE5\u5728 finally \u91CC\u9690\u85CF\uFF0C\u4F46\u5B9E\u9645\u8FDB\u5EA6\u66F4\u65B0\u7531 xhr \u63A7\u5236
 // uploadBtn.disabled = false; // \u79FB\u52A8\u5230 xhr \u4E8B\u4EF6\u5904\u7406\u4E2D
 // progressTrack.style.display = 'none'; // \u79FB\u52A8\u5230 xhr \u4E8B\u4EF6\u5904\u7406\u4E2D
 // progressText.style.display = 'none'; // \u79FB\u52A8\u5230 xhr \u4E8B\u4EF6\u5904\u7406\u4E2D
 }



 }

 // ====== \u517C\u5BB9\u6027\u590D\u5236\u51FD\u6570 ======
 function copyText(event, text) {
 const btn = event.target;
 if (navigator.clipboard && window.isSecureContext) {
 navigator.clipboard.writeText(text).then(() => {
 showCopySuccess(btn);
 }).catch(() => {
 fallbackCopyText(btn, text);
 });
 } else {
 fallbackCopyText(btn, text);
 }
 }

 function fallbackCopyText(btn, text) {
 const textarea = document.createElement('textarea');
 textarea.value = text;
 textarea.style.position = 'fixed';
 textarea.style.opacity = '0';
 document.body.appendChild(textarea);
 textarea.select();
 try {
 const ok = document.execCommand('copy');
 if (ok) {
 showCopySuccess(btn);
 } else {
 alert('\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u957F\u6309\u94FE\u63A5\u590D\u5236');
 }
 } catch (e) {
 alert('\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u590D\u5236');
 } finally {
 document.body.removeChild(textarea);
 }
 }

 function showCopySuccess(btn) {
 btn.classList.add('copied');
 btn.textContent = '\u2705 \u5DF2\u590D\u5236';
 setTimeout(() => {
 btn.classList.remove('copied');
 btn.textContent = '\u{1F4CB} \u590D\u5236';
 }, 2000);
 }
 <\/script>
</body>
</html>`;
