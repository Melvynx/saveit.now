import { env } from "../env";
import { logger } from "../logger";

export const sendTelegramNotification = async (message: string) => {
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: message,
    }),
  };

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`,
      options
    );
    
    if (!response.ok) {
      const errorData = await response.text();
      logger.error("Telegram API responded with error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      throw new Error(`Telegram API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    logger.info("Telegram notification sent successfully:", {
      messageId: data.message_id,
      chatId: data.chat?.id,
    });
    
    return data;
  } catch (error) {
    logger.error("Failed to send Telegram notification:", error);
    throw error;
  }
};