import { Resend } from "resend";

export const resend = new Resend(
  process.env.RESEND_API_KEY
);

const defaultFromEmail = "Glowea <ivanduran@glowea.app>";

type SendTransactionalEmailInput = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function textToHtml(text: string) {
  return text
    .split("\n\n")
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export async function sendTransactionalEmail(input: SendTransactionalEmailInput) {
  if (!process.env.RESEND_API_KEY) {
    return { success: false as const, error: "RESEND_API_KEY manquante" };
  }

  const result = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || defaultFromEmail,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: textToHtml(input.text),
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
  });

  if (result.error) {
    return { success: false as const, error: result.error.message };
  }

  return { success: true as const, id: result.data?.id || "" };
}
