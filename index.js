const express = require('express');
const { Telegraf } = require('telegraf');
const { HttpsProxyAgent } = require('https-proxy-agent');

const BOT_TOKEN = "8754493631:AAH9vZvWTS-SOHwk5Y0y7Rbr6klwmgeSgN0";
const MINI_APP_URL = "https://apple-store-web.vercel.app";

// Публичный прокси (может быть медленным, но работает)
const PROXY_URL = "http://45.140.146.241:8080";

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('Apple Store Bot is running!');
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ HTTP сервер запущен на порту ${PORT}`);
});

// Создаем агент для прокси
const agent = new HttpsProxyAgent(PROXY_URL);

// Создаем бота с прокси
const bot = new Telegraf(BOT_TOKEN, {
  telegram: {
    agent: agent
  }
});

bot.start((ctx) => {
  ctx.replyWithHTML(
    '🍎 Добро пожаловать в магазин "Яблочный"!\n\nНажми кнопку ниже:',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛍 Открыть магазин', web_app: { url: MINI_APP_URL } }]
        ]
      }
    }
  );
});

// Запускаем бота
bot.launch();

console.log('✅ Бот запущен с прокси');

// Обработка остановки
process.once('SIGINT', () => {
  bot.stop('SIGINT');
  server.close();
});
process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
  server.close();
});
