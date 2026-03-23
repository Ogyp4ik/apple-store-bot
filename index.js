const { Telegraf } = require('telegraf');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, onSnapshot } = require('firebase/firestore');

// 🔥 ВСТАВЬ СВОИ ДАННЫЕ ИЗ FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCR01An-gdwysrsNfDoPGV0fQ9Zxmk1S4g",
  authDomain: "yablochniy-e5daf.firebaseapp.com",
  projectId: "yablochniy-e5daf",
  storageBucket: "yablochniy-e5daf.firebasestorage.app",
  messagingSenderId: "909418919751",
  appId: "1:909418919751:web:cc3975c0e62b5ae4703e62"
};

// 🤖 ВСТАВЬ ТОКЕН БОТА
const BOT_TOKEN = "8754493631:AAH9vZvWTS-SOHwk5Y0y7Rbr6klwmgeSgN0";

// 🔢 ВСТАВЬ СВОЙ TELEGRAM ID (узнай у @userinfobot)
const OWNER_ID = "7441684316";

// Ссылка на Mini App (потом вставишь)
const MINI_APP_URL = "apple-store-web.vercel.app";

// Инициализация Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Создаем бота
const bot = new Telegraf(BOT_TOKEN);

// Хранилище сессий
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
  ).catch(err => console.log('Ошибка:', err.message));
});

// Команда /addproduct
bot.command('addproduct', async (ctx) => {
  const userId = ctx.from.id.toString();
  
  if (userId !== OWNER_ID) {
    return ctx.reply('❌ У вас нет доступа к этой команде');
  }
  
  sessions.set(userId, { step: 'name' });
  await ctx.reply('📱 Введите название модели:');
});

// Обработка текста
bot.on('text', async (ctx) => {
  const userId = ctx.from.id.toString();
  const session = sessions.get(userId);
  
  if (!session) return;
  
  const message = ctx.message.text;
  
  if (session.step === 'name') {
    session.name = message;
    session.step = 'description';
    await ctx.reply('📝 Введите описание:');
  }
  else if (session.step === 'description') {
    session.description = message;
    session.step = 'storage';
    await ctx.reply('💾 Введите память (128GB, 256GB):');
  }
  else if (session.step === 'storage') {
    session.storage = message;
    session.step = 'color';
    await ctx.reply('🎨 Введите цвет (Black, White, Blue):');
  }
  else if (session.step === 'color') {
    session.color = message;
    session.step = 'price';
    await ctx.reply('💰 Введите цену (только число):');
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
    
    await ctx.reply('✅ Товар добавлен!');
    sessions.delete(userId);
  } catch (error) {
    console.error(error);
    await ctx.reply('❌ Ошибка');
    sessions.delete(userId);
  }
});

// Отслеживание заказов
function watchOrders() {
  const q = query(collection(db, 'orders'), orderBy('date', 'desc'), limit(5));
  
  onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const order = change.doc.data();
        bot.telegram.sendMessage(OWNER_ID, 
          `🛍 НОВАЯ ЗАЯВКА!\n\n` +
          `Пользователь: @${order.username || 'нет'}\n` +
          `ID: ${order.userId}\n\n` +
          `Товар: ${order.productName}\n` +
          `Память: ${order.storage}\n` +
          `Цвет: ${order.color}\n` +
          `Цена: ${(order.price || 0).toLocaleString()} ₽`
        ).catch(err => console.log('Ошибка:', err.message));
      }
    });
  });
}

// Запуск
bot.launch().then(() => {
  console.log('✅ Бот запущен');
  watchOrders();
}).catch(err => {
  console.error('❌ Ошибка:', err.message);
});

process.on('unhandledRejection', (error) => {
  console.error('Ошибка:', error.message);
});