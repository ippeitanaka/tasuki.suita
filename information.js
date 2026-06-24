const documentList = document.querySelector("#document-list");

const escapeDocumentHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const isDisclosureDocument = (post) =>
  Boolean(
    post?.published &&
      post?.pdf &&
      (String(post.summary || "").trim() === "情報公開" ||
        String(post.title || "").includes("規約")),
  );

const documentLabel = (post) =>
  String(post.title || "")
    .replace(/^NPO法人TASUKI[\s　]*/u, "")
    .trim() || post.pdf?.name || "公開資料";

const renderDocuments = (posts) => {
  const documents = posts.filter(isDisclosureDocument);

  if (!documents.length) {
    documentList.innerHTML =
      '<p class="document-empty">現在公開中の資料はありません。</p>';
    return;
  }

  documentList.innerHTML = documents
    .map(
      (post) => `
        <a class="document-card" href="${escapeDocumentHtml(post.pdf.url)}" target="_blank" rel="noopener">
          <span class="document-icon" aria-hidden="true">PDF</span>
          <span class="document-copy">
            <strong>${escapeDocumentHtml(documentLabel(post))}</strong>
            <small>${escapeDocumentHtml(post.pdf.name || "PDF資料")}</small>
          </span>
          <span class="document-arrow" aria-hidden="true">↗</span>
        </a>
      `,
    )
    .join("");
};

fetch("/api/content", { cache: "no-store" })
  .then((response) => (response.ok ? response.json() : Promise.reject()))
  .then((data) => renderDocuments(Array.isArray(data.posts) ? data.posts : []))
  .catch(() => {
    documentList.innerHTML =
      '<p class="document-empty">資料を読み込めませんでした。時間をおいて再度お試しください。</p>';
  });
