const header = document.querySelector(".site-header");
const menuButton = document.querySelector(".menu-button");
const navigation = document.querySelector(".global-nav");
const menuLabel = menuButton?.querySelector(".sr-only");

const updateHeader = () => {
  header?.classList.toggle("scrolled", window.scrollY > 20);
};

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

menuButton?.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isOpen));
  navigation?.classList.toggle("open", !isOpen);
  if (menuLabel) menuLabel.textContent = isOpen ? "メニューを開く" : "メニューを閉じる";
});

navigation?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuButton?.setAttribute("aria-expanded", "false");
    navigation.classList.remove("open");
    if (menuLabel) menuLabel.textContent = "メニューを開く";
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navigation?.classList.contains("open")) {
    menuButton?.setAttribute("aria-expanded", "false");
    navigation.classList.remove("open");
    menuButton?.focus();
  }
});

const contactForm = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");

contactForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!contactForm.checkValidity()) {
    contactForm.reportValidity();
    return;
  }

  if (formStatus) {
    formStatus.textContent =
      "入力ありがとうございます。公開時に送信先を設定すると、お問い合わせを送信できます。";
  }
});

const newsSection = document.querySelector("#news");
const newsGrid = document.querySelector("#news-grid");
const newsNavLinks = document.querySelectorAll(".news-nav-link");

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatDate = (value) => {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${year}.${month}.${day}` : value;
};

const renderNews = (posts) => {
  const publishedPosts = [...posts]
    .filter((post) => post.published)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  if (!publishedPosts.length || !newsSection || !newsGrid) return;

  newsGrid.innerHTML = publishedPosts
    .map((post) => {
      const image = post.images?.[0];
      const extraImages = Math.max(0, (post.images?.length || 0) - 1);
      const description = post.summary || post.body || "";
      const body = post.body
        ? `<div class="news-body">${escapeHtml(post.body).replaceAll("\n", "<br />")}</div>`
        : "";
      const gallery =
        post.images?.length > 1
          ? `<div class="news-gallery">${post.images
              .slice(1)
              .map(
                (item) =>
                  `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener"><img src="${escapeHtml(item.url)}" alt="${escapeHtml(post.title)}の活動写真" loading="lazy" /></a>`,
              )
              .join("")}</div>`
          : "";

      return `
        <article class="news-card">
          ${
            image
              ? `<a class="news-image" href="${escapeHtml(image.url)}" target="_blank" rel="noopener">
                  <img src="${escapeHtml(image.url)}" alt="${escapeHtml(post.title)}の活動写真" loading="lazy" />
                  ${extraImages ? `<span>ほか${extraImages}枚</span>` : ""}
                </a>`
              : '<div class="news-image news-image-placeholder" aria-hidden="true"><span>TASUKI</span></div>'
          }
          <div class="news-card-content">
            <time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDate(post.date))}</time>
            <h3>${escapeHtml(post.title)}</h3>
            ${description ? `<p>${escapeHtml(description)}</p>` : ""}
            ${
              body || gallery || post.pdf
                ? `<details class="news-details">
                    <summary>詳しく見る <span aria-hidden="true">＋</span></summary>
                    ${body}
                    ${gallery}
                    ${
                      post.pdf
                        ? `<a class="pdf-link" href="${escapeHtml(post.pdf.url)}" target="_blank" rel="noopener">
                            <span aria-hidden="true">PDF</span>
                            ${escapeHtml(post.pdf.name || "資料を見る")}
                          </a>`
                        : ""
                    }
                  </details>`
                : ""
            }
          </div>
        </article>
      `;
    })
    .join("");

  newsSection.hidden = false;
  newsNavLinks.forEach((link) => {
    link.hidden = false;
  });
};

fetch("/api/content", { cache: "no-store" })
  .then((response) => (response.ok ? response.json() : Promise.reject()))
  .then((data) => renderNews(Array.isArray(data.posts) ? data.posts : []))
  .catch(() => {});
