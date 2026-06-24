import { createClient } from "@supabase/supabase-js";

const loginView = document.querySelector("#login-view");
const dashboard = document.querySelector("#dashboard");
const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const postForm = document.querySelector("#post-form");
const postList = document.querySelector("#post-list");
const postCount = document.querySelector("#post-count");
const saveState = document.querySelector("#save-state");
const imageList = document.querySelector("#image-list");
const pdfList = document.querySelector("#pdf-list");
const imageInput = document.querySelector("#post-images");
const pdfInput = document.querySelector("#post-pdf");
const deleteButton = document.querySelector("#delete-post");

let posts = [];
let currentImages = [];
let currentPdf = null;
let activeId = null;
let pendingDeletionPaths = [];

const fields = {
  id: document.querySelector("#post-id"),
  title: document.querySelector("#post-title"),
  date: document.querySelector("#post-date"),
  summary: document.querySelector("#post-summary"),
  body: document.querySelector("#post-body"),
  published: document.querySelector("#post-published"),
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getContentType(file) {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  return (
    {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
    }[extension] || "application/octet-stream"
  );
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && path !== "/api/login") showLogin();
    throw new Error(data.error || "処理に失敗しました。");
  }
  return data;
}

function showLogin() {
  dashboard.hidden = true;
  loginView.hidden = false;
}

function showDashboard() {
  loginView.hidden = true;
  dashboard.hidden = false;
}

async function loadPosts() {
  saveState.textContent = "読み込み中…";
  const data = await api("/api/content?admin=1");
  posts = Array.isArray(data.posts) ? data.posts : [];
  sortPosts();
  renderPostList();
  saveState.textContent = "";
}

function sortPosts() {
  posts.sort((a, b) => {
    const dateOrder = String(b.date || "").localeCompare(String(a.date || ""));
    return dateOrder || String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
  });
}

function renderPostList() {
  postCount.textContent = `${posts.length}件`;
  if (!posts.length) {
    postList.innerHTML =
      '<p class="post-list-empty">まだお知らせはありません。<br />「新規作成」から登録できます。</p>';
    return;
  }

  postList.innerHTML = posts
    .map(
      (post) => `
        <button class="post-list-item${post.id === activeId ? " active" : ""}" type="button" data-id="${escapeHtml(post.id)}">
          <strong>${escapeHtml(post.title || "無題のお知らせ")}</strong>
          <span class="post-meta">
            <time>${escapeHtml(post.date || "日付未設定")}</time>
            <span class="status-badge${post.published ? "" : " draft"}">${post.published ? "公開中" : "下書き"}</span>
          </span>
        </button>
      `,
    )
    .join("");
}

function renderMedia() {
  imageList.innerHTML = currentImages
    .map(
      (image, index) => `
        <div class="media-item">
          <img src="${escapeHtml(image.url)}" alt="" />
          <span class="media-name" title="${escapeHtml(image.name)}">${escapeHtml(image.name)}</span>
          <button class="remove-media" type="button" data-image-index="${index}">写真を外す</button>
        </div>
      `,
    )
    .join("");

  pdfList.innerHTML = currentPdf
    ? `
        <div class="media-item">
          <span aria-hidden="true">📄</span>
          <a class="media-name" href="${escapeHtml(currentPdf.url)}" target="_blank" rel="noopener">${escapeHtml(currentPdf.name)}</a>
          <button class="remove-media" type="button" data-remove-pdf>PDFを外す</button>
        </div>
      `
    : "";
}

async function deleteMedia(paths) {
  const validPaths = paths.filter(Boolean);
  if (!validPaths.length) return;
  await api("/api/media", {
    method: "DELETE",
    body: JSON.stringify({ paths: validPaths }),
  });
}

function resetEditor() {
  activeId = null;
  fields.id.value = "";
  fields.title.value = "";
  fields.date.value = today();
  fields.summary.value = "";
  fields.body.value = "";
  fields.published.checked = false;
  imageInput.value = "";
  pdfInput.value = "";
  currentImages = [];
  currentPdf = null;
  pendingDeletionPaths = [];
  document.querySelector("#editor-title").textContent = "新しいお知らせ";
  deleteButton.hidden = true;
  saveState.textContent = "";
  renderMedia();
  renderPostList();
  fields.title.focus();
}

function editPost(id) {
  const post = posts.find((item) => item.id === id);
  if (!post) return;

  activeId = post.id;
  fields.id.value = post.id;
  fields.title.value = post.title || "";
  fields.date.value = post.date || today();
  fields.summary.value = post.summary || "";
  fields.body.value = post.body || "";
  fields.published.checked = Boolean(post.published);
  imageInput.value = "";
  pdfInput.value = "";
  currentImages = Array.isArray(post.images) ? [...post.images] : [];
  currentPdf = post.pdf || null;
  pendingDeletionPaths = [];
  document.querySelector("#editor-title").textContent = "お知らせを編集";
  deleteButton.hidden = false;
  saveState.textContent = "";
  renderMedia();
  renderPostList();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function uploadFile(file, category) {
  const contentType = getContentType(file);
  const uploadInfo = await api("/api/upload", {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      contentType,
      size: file.size,
      category,
    }),
  });

  const supabase = createClient(uploadInfo.supabaseUrl, uploadInfo.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.storage
    .from(uploadInfo.bucket)
    .uploadToSignedUrl(uploadInfo.path, uploadInfo.token, file, {
      contentType,
    });
  if (error) {
    throw new Error(
      error.message
        ? `ファイルをアップロードできませんでした：${error.message}`
        : "ファイルをアップロードできませんでした。",
    );
  }

  return {
    url: uploadInfo.publicUrl,
    path: uploadInfo.path,
    name: file.name,
    contentType,
    size: file.size,
  };
}

async function uploadSelectedFiles() {
  const selectedImages = [...imageInput.files];
  if (currentImages.length + selectedImages.length > 8) {
    throw new Error("写真は最大8枚までです。");
  }

  for (const [index, file] of selectedImages.entries()) {
    saveState.textContent = `写真をアップロード中… ${index + 1}/${selectedImages.length}`;
    currentImages.push(await uploadFile(file, "images"));
  }

  if (pdfInput.files[0]) {
    saveState.textContent = "PDFをアップロード中…";
    currentPdf = await uploadFile(pdfInput.files[0], "documents");
  }

  imageInput.value = "";
  pdfInput.value = "";
  renderMedia();
}

async function saveAllPosts() {
  const data = await api("/api/content", {
    method: "PUT",
    body: JSON.stringify({ posts }),
  });
  posts = data.posts;
  sortPosts();
  renderPostList();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "確認中…";
  const button = loginForm.querySelector("button");
  button.disabled = true;

  try {
    await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ password: document.querySelector("#password").value }),
    });
    document.querySelector("#password").value = "";
    showDashboard();
    await loadPosts();
    resetEditor();
  } catch (error) {
    loginMessage.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

postList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (button) editPost(button.dataset.id);
});

document.querySelector("#new-post").addEventListener("click", resetEditor);

imageInput.addEventListener("change", () => {
  const count = imageInput.files.length;
  if (count) {
    saveState.textContent = `写真を${count}枚選択しました。「保存する」でアップロードします。`;
  }
});

pdfInput.addEventListener("change", () => {
  const file = pdfInput.files[0];
  if (!file) return;
  pdfList.innerHTML = `
    <div class="media-item pending-media">
      <span aria-hidden="true">📄</span>
      <span class="media-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
      <span>選択済み</span>
    </div>
  `;
  saveState.textContent = "PDFを選択しました。「保存する」でアップロードします。";
});

imageList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-image-index]");
  if (!button) return;
  const index = Number(button.dataset.imageIndex);
  const image = currentImages[index];
  if (!window.confirm("この写真を掲載から外しますか？")) return;
  if (image?.path) pendingDeletionPaths.push(image.path);
  currentImages.splice(index, 1);
  renderMedia();
});

pdfList.addEventListener("click", (event) => {
  if (!event.target.closest("[data-remove-pdf]")) return;
  if (!window.confirm("このPDFを掲載から外しますか？")) return;
  if (currentPdf?.path) pendingDeletionPaths.push(currentPdf.path);
  currentPdf = null;
  renderMedia();
});

postForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!postForm.checkValidity()) {
    postForm.reportValidity();
    return;
  }

  const submitButton = postForm.querySelector('[type="submit"]');
  submitButton.disabled = true;
  saveState.textContent = "保存準備中…";

  try {
    await uploadSelectedFiles();
    const now = new Date().toISOString();
    const existing = posts.find((item) => item.id === activeId);
    const id = activeId || `news-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const post = {
      id,
      title: fields.title.value.trim(),
      date: fields.date.value,
      summary: fields.summary.value.trim(),
      body: fields.body.value.trim(),
      published: fields.published.checked,
      images: currentImages,
      pdf: currentPdf,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    if (existing) {
      posts = posts.map((item) => (item.id === id ? post : item));
    } else {
      posts.push(post);
    }

    activeId = id;
    saveState.textContent = "保存中…";
    await saveAllPosts();
    await deleteMedia(pendingDeletionPaths);
    pendingDeletionPaths = [];
    editPost(id);
    saveState.textContent = post.published ? "公開しました" : "下書きを保存しました";
  } catch (error) {
    saveState.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

deleteButton.addEventListener("click", async () => {
  if (!activeId || !window.confirm("このお知らせを削除しますか？")) return;

  deleteButton.disabled = true;
  saveState.textContent = "削除中…";
  try {
    const deletedPost = posts.find((post) => post.id === activeId);
    const paths = [
      ...(deletedPost?.images || []).map((image) => image.path),
      deletedPost?.pdf?.path,
    ];
    posts = posts.filter((post) => post.id !== activeId);
    await saveAllPosts();
    await deleteMedia(paths);
    resetEditor();
    saveState.textContent = "削除しました";
  } catch (error) {
    saveState.textContent = error.message;
  } finally {
    deleteButton.disabled = false;
  }
});

document.querySelector("#logout").addEventListener("click", async () => {
  await api("/api/logout", { method: "POST", body: "{}" }).catch(() => {});
  showLogin();
});

(async function initialize() {
  try {
    const { authenticated } = await api("/api/session");
    if (!authenticated) return showLogin();
    showDashboard();
    await loadPosts();
    resetEditor();
  } catch {
    showLogin();
  }
})();
