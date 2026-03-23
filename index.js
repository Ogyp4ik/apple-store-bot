const express = require('express');
const { Telegraf } = require('telegraf');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Токен бота
const BOT_TOKEN = "8754493631:AAH9vZvWTS-SOHwk5Y0y7Rbr6klwmgeSgN0";

// Ссылка на Mini App
const MINI_APP_URL = "https://apple-store-web.vercel.app";

// Прокси для обхода блокировок (публичный прокси, может быть медленным)
// Если у тебя есть свой платный прокси/VPN, замени URL
const PROXY_URL = "http://45.140.146.241:8080"; // Публичный прокси, можно заменить

// Создаем агент для прокси
const agent = new HttpsProxyAgent(PROXY_URL);

// Создаем Express приложение
const app = express();
const PORT = process.env.PORT || 10000;

// Простой endpoint для проверки
app.get('/', (req, res) => {
  res.send('Apple Store Bot is running!');
});

// Запускаем HTTP сервер
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ HTTP сервер запущен на порту ${PORT}`);
});

// Создаем бота с прокси
const bot = new Telegraf(BOT_TOKEN, {
  telegram: {
    agent: agent
  }
});

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

// Ответ на любое сообщение
bot.on('text', (ctx) => {
  ctx.reply('Я бот магазина "Яблочный". Напишите /start чтобы открыть магазин');
});

// Запускаем бота
bot.launch()
  .then(() => {
    console.log('✅ Бот запущен с прокси');
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
