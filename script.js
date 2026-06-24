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
