import { getAppSettings, getTelegramBotToken } from "@/lib/server/repositories";
import type { TelegramNotificationType } from "@/types";

const APP_NAME = "إدارة خزينة المناوبات";

function escapeTelegramMarkdown(value: string) {
  return value.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

async function sendTelegramMessage(text: string) {
  const settings = await getAppSettings();
  const token = await getTelegramBotToken();

  if (!settings.telegram.enabled || !settings.telegram.chatId || !token) {
    return { sent: false as const, reason: "disabled" as const };
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: settings.telegram.chatId,
      text,
      parse_mode: "MarkdownV2"
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || "TELEGRAM_SEND_FAILED");
  }

  return { sent: true as const };
}

export async function sendConfiguredTelegramNotification(type: TelegramNotificationType, text: string) {
  const settings = await getAppSettings();
  if (!settings.telegram.enabled || !settings.telegram.notifications.includes(type)) {
    return { sent: false as const, reason: "disabled" as const };
  }

  return sendTelegramMessage(text);
}

export function formatTelegramMoney(amount: number) {
  const normalized = Number.isFinite(amount) ? amount : 0;
  return `${normalized.toLocaleString("fr-FR")} دج`;
}

export function formatTelegramMessage(lines: string[]) {
  return lines.map((line) => escapeTelegramMarkdown(line)).join("\n");
}


export function buildTelegramNotification(input: {
  title: string;
  lines: string[];
  level?: "info" | "success" | "warning" | "error";
}) {
  const icon =
    input.level === "success" ? "✅" : input.level === "warning" ? "⚠️" : input.level === "error" ? "🚨" : "ℹ️";

  const lines = [
    `${icon} ${input.title}`,
    ...input.lines.filter(Boolean),
    `الوقت: ${new Date().toLocaleString("fr-FR")}`,
    `النظام: ${APP_NAME}`
  ];

  return formatTelegramMessage(lines);
}
