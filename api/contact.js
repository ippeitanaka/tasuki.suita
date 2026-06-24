import { Resend } from "resend";
import { methodNotAllowed, readJson, sendJson } from "./_lib/http.js";

const CONTACT_TO_EMAIL = "syck138@gmail.com";
const WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS = 5;
const attempts = new Map();

const CATEGORY_LABELS = {
  activity: "活動への参加について",
  membership: "会員について",
  support: "地域活動の支援・相談について",
  other: "その他",
};

function getClientKey(request) {
  return String(request.headers["x-forwarded-for"] || request.socket?.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export default async function handler(request, response) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);

  try {
    const key = getClientKey(request);
    const now = Date.now();
    const previous = attempts.get(key);
    const record =
      previous && now - previous.startedAt < WINDOW_MS
        ? previous
        : { count: 0, startedAt: now };

    if (record.count >= MAX_SENDS) {
      return sendJson(response, 429, {
        error: "送信回数が多すぎます。時間をおいてからお試しください。",
      });
    }

    const body = await readJson(request);
    if (body.website) return sendJson(response, 200, { ok: true });

    const name = cleanText(body.name, 100);
    const email = cleanText(body.email, 254).toLowerCase();
    const category = CATEGORY_LABELS[body.category] || CATEGORY_LABELS.other;
    const message = cleanText(body.message, 5000);

    if (!name || !isValidEmail(email) || !message || body.privacyConsent !== "on") {
      return sendJson(response, 400, {
        error: "お名前、メールアドレス、お問い合わせ内容を確認してください。",
      });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.CONTACT_FROM_EMAIL || "onboarding@resend.dev";
    if (!apiKey) {
      console.error("RESEND_API_KEY が未設定です。");
      return sendJson(response, 503, {
        error: "現在メールを送信できません。時間をおいてからお試しください。",
      });
    }

    const resend = new Resend(apiKey);
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeCategory = escapeHtml(category);
    const safeMessage = escapeHtml(message).replaceAll("\n", "<br />");
    const { error } = await resend.emails.send({
      from: `NPO法人TASUKI お問い合わせ <${fromEmail}>`,
      to: CONTACT_TO_EMAIL,
      replyTo: email,
      subject: `【TASUKIお問い合わせ】${category}／${name}様`,
      text: [
        "NPO法人TASUKI ホームページからお問い合わせが届きました。",
        "",
        `お名前：${name}`,
        `メールアドレス：${email}`,
        `お問い合わせ種別：${category}`,
        "",
        "お問い合わせ内容：",
        message,
      ].join("\n"),
      html: `
        <div style="font-family: sans-serif; color: #163d3b; line-height: 1.8;">
          <h1 style="font-size: 20px;">ホームページからお問い合わせが届きました</h1>
          <table style="width: 100%; max-width: 640px; border-collapse: collapse;">
            <tr><th style="padding: 10px; border: 1px solid #d8e4df; text-align: left;">お名前</th><td style="padding: 10px; border: 1px solid #d8e4df;">${safeName}</td></tr>
            <tr><th style="padding: 10px; border: 1px solid #d8e4df; text-align: left;">メールアドレス</th><td style="padding: 10px; border: 1px solid #d8e4df;"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
            <tr><th style="padding: 10px; border: 1px solid #d8e4df; text-align: left;">お問い合わせ種別</th><td style="padding: 10px; border: 1px solid #d8e4df;">${safeCategory}</td></tr>
          </table>
          <h2 style="margin-top: 28px; font-size: 17px;">お問い合わせ内容</h2>
          <div style="max-width: 640px; padding: 18px; border-radius: 8px; background: #edf8f4;">${safeMessage}</div>
          <p style="margin-top: 24px; color: #607774; font-size: 12px;">このメールに返信すると、お問い合わせいただいた方のメールアドレスに返信できます。</p>
        </div>
      `,
    });

    if (error) {
      console.error(error);
      return sendJson(response, 502, {
        error: "メールを送信できませんでした。時間をおいてからお試しください。",
      });
    }

    record.count += 1;
    attempts.set(key, record);
    return sendJson(response, 200, { ok: true });
  } catch (error) {
    console.error(error);
    return sendJson(response, 500, {
      error: "送信中にエラーが発生しました。時間をおいてからお試しください。",
    });
  }
}
