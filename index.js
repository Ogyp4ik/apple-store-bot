const express = require('express');
const { Telegraf } = require('telegraf');

// Токен бота
const BOT_TOKEN = "8754493631:AAH9vZvWTS-SOHwk5Y0y7Rbr6klwmgeSgN0";

// Ссылка на Mini App
const MINI_APP_URL = "https://apple-store-web.vercel.app";

// Создаем Express приложение
const app = express();
const PORT = process.env.PORT || 10000;

// Простой endpoint для проверки
app.get('/', (req, res) => {
  res.send('Apple Store Bot is running!');
});

// Запускаем HTTP сервер ДО того, как запускаем бота
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ HTTP сервер запущен на порту ${PORT}`);
});

// Создаем бота
const bot = new Telegraf(BOT_TOKEN);

// Команда /start
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
bot.launch()
  .then(() => {
    console.log('✅ Бот запущен');
  })
  .catch((err) => {
    console.error('❌ Ошибка запуска бота:', err.message);
  });

// Обработка остановки
process.once('SIGINT', () => {
  bot.stop('SIGINT');
  server.close();
});
process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
  server.close();
});
