const express = require('express');
const { Telegraf } = require('telegraf');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

// Firebase конфиг
const firebaseConfig = {
  apiKey: "AIzaSyCR01An-gdwysrsNfDoPGV0fQ9Zxmk1S4g",
  authDomain: "yablochniy-e5daf.firebaseapp.com",
  projectId: "yablochniy-e5daf",
  storageBucket: "yablochniy-e5daf.firebasestorage.app",
  messagingSenderId: "909418919751",
  appId: "1:909418919751:web:cc3975c0e62b5ae4703e62"
};

const BOT_TOKEN = "8754493631:AAH9vZvWTS-SOHwk5Y0y7Rbr6klwmgeSgN0";
const MINI_APP_URL = "https://apple-store-web.vercel.app"; // Сюда вставь ссылку из Vercel
const OWNER_ID = "7441684316"; // Твой Telegram ID

const app = express();
const PORT = process.env.PORT || 10000;

// Инициализация Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

app.get('/', (req, res) => {
  res.send('Apple Store Bot is running!');
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ HTTP сервер запущен на порту ${PORT}`);
});

const bot = new Telegraf(BOT_TOKEN);

// Хранилище сессий для добавления товаров
const sessions = new Map();

// Команда /start
bot.start((ctx) => {
  ctx.replyWithHTML(
    '🍎 Добро пожаловать в магазин "Яблочный"!\n\nНажми кнопку ниже, чтобы открыть каталог:',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛍 Открыть магазин', web_app: { url: MINI_APP_URL } }]
        ]
      }
    }
  );
});

// Команда /addproduct (только для владельца)
bot.command('addproduct', async (ctx) => {
  const userId = ctx.from.id.toString();
  
  if (userId !== OWNER_ID) {
    return ctx.reply('❌ У вас нет доступа к этой команде');
  }
  
  sessions.set(userId, { step: 'name' });
  await ctx.reply('📱 Введите название модели (например: iPhone 17):');
});

// Обработка текста (диалог добавления товара)
bot.on('text', async (ctx) => {
  const userId = ctx.from.id.toString();
  const session = sessions.get(userId);
  
  if (!session) return;
  
  const message = ctx.message.text;
  
  if (session.step === 'name') {
    session.name = message;
    session.step = 'description';
    await ctx.reply('📝 Введите описание товара:');
  }
  else if (session.step === 'description') {
    session.description = message;
    session.step = 'storage';
    await ctx.reply('💾 Введите объем памяти (например: 128GB, 256GB):');
  }
  else if (session.step === 'storage') {
    session.storage = message;
    session.step = 'color';
    await ctx.reply('🎨 Введите цвет (например: Black, White, Blue):');
  }
  else if (session.step === 'color') {
    session.color = message;
    session.step = 'price';
    await ctx.reply('💰 Введите цену в рублях (только число):');
  }
  else if (session.step === 'price') {
    const price = parseInt(message);
    if (isNaN(price)) {
      return ctx.reply('❌ Введите число!');
    }
    session.price = price;
    session.step = 'image';
    await ctx.reply('📸 Отправьте фото товара:');
  }
});

// Обработка фото
bot.on('photo', async (ctx) => {
  const userId = ctx.from.id.toString();
  const session = sessions.get(userId);
  
  if (!session || session.step !== 'image') return;
  
  try {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileLink = await ctx.telegram.getFileLink(photo.file_id);
    
    await addDoc(collection(db, 'products'), {
      name: session.name,
      description: session.description,
      storage: session.storage,
      color: session.color,
      price: session.price,
      image: fileLink.href,
      createdAt: new Date()
    });
    
    await ctx.reply('✅ Товар успешно добавлен!\n\nМожете добавить еще один через /addproduct');
    sessions.delete(userId);
  } catch (error) {
    console.error('Ошибка:', error);
    await ctx.reply('❌ Ошибка при сохранении. Попробуйте снова /addproduct');
    sessions.delete(userId);
  }
});

// Запускаем бота
bot.launch();
console.log('✅ Бот запущен');

process.once('SIGINT', () => {
  bot.stop('SIGINT');
  server.close();
});
process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
  server.close();
});
