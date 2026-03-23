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

// Инициализация Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Прокси (если нужно) - раскомментируй если интернет через прокси
// process.env.HTTP_PROXY = "http://proxy-server:port";
// process.env.HTTPS_PROXY = "http://proxy-server:port";

// Создаем бота с таймаутами
const bot = new Telegraf(BOT_TOKEN, {
  handlerTimeout: 90000,
  telegram: {
    apiRoot: 'https://api.telegram.org',
    agent: null
  }
});

// Айди владельца (твоего Telegram)
const OWNER_ID = "7441684316"; // как узнать - напиши @userinfobot

// Хранилище сессий (простое)
const sessions = new Map();

// Команда /start
bot.start((ctx) => {
  const miniAppUrl = "ССЫЛКА_НА_MINI_APP"; // ВСТАВЬ ССЫЛКУ ПОТОМ
  
  ctx.replyWithHTML(
    '🍎 Добро пожаловать в магазин "Яблочный"!\n\nНажми кнопку ниже, чтобы открыть каталог:',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛍 Открыть магазин', web_app: { url: miniAppUrl } }]
        ]
      }
    }
  ).catch(err => console.log('Ошибка отправки:', err.message));
});

// Команда /addproduct
bot.command('addproduct', async (ctx) => {
  const userId = ctx.from.id.toString();
  
  if (userId !== OWNER_ID) {
    return ctx.reply('❌ У вас нет доступа к этой команде');
  }
  
  sessions.set(userId, { step: 'name' });
  await ctx.reply('📱 Введите название модели (например: iPhone 17):');
});

// Обработка текстовых сообщений
bot.on('text', async (ctx) => {
  const userId = ctx.from.id.toString();
  const session = sessions.get(userId);
  
  if (!session) return;
  
  const message = ctx.message.text;
  
  try {
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
  } catch (err) {
    console.log('Ошибка:', err.message);
    await ctx.reply('❌ Ошибка, попробуйте сначала /addproduct');
    sessions.delete(userId);
  }
});

// Обработка фото
bot.on('photo', async (ctx) => {
  const userId = ctx.from.id.toString();
  const session = sessions.get(userId);
  
  if (!session || session.step !== 'image') return;
  
  try {
    // Получаем фото
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileId = photo.file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);
    
    // Сохраняем в Firebase
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
    console.error('Ошибка сохранения:', error);
    await ctx.reply('❌ Ошибка при сохранении. Попробуйте снова /addproduct');
    sessions.delete(userId);
  }
});

// Отслеживаем новые заказы (уведомления владельцу)
async function watchOrders() {
  const q = query(collection(db, 'orders'), orderBy('date', 'desc'), limit(5));
  
  onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const order = change.doc.data();
        bot.telegram.sendMessage(OWNER_ID, 
          `🛍 НОВАЯ ЗАЯВКА!\n\n` +
          `👤 Пользователь: @${order.username || 'нет юзернейма'}\n` +
          `🆔 ID: ${order.userId}\n\n` +
          `📱 Товар: ${order.productName}\n` +
          `💾 Память: ${order.storage}\n` +
          `🎨 Цвет: ${order.color}\n` +
          `💰 Цена: ${(order.price || 0).toLocaleString()} ₽\n\n` +
          `📅 ${new Date(order.date).toLocaleString('ru-RU')}`
        ).catch(err => console.log('Ошибка отправки уведомления:', err.message));
      }
    });
  }, (error) => {
    console.log('Ошибка отслеживания заказов:', error.message);
  });
}

// Запускаем бота с обработкой ошибок
async function startBot() {
  try {
    // Проверяем подключение
    const me = await bot.telegram.getMe();
    console.log(`✅ Бот запущен: @${me.username}`);
    
    // Запускаем отслеживание заказов
    watchOrders();
    
    // Запускаем бота
    bot.launch();
    
    console.log('✅ Бот готов к работе');
  } catch (error) {
    console.error('❌ Ошибка запуска бота:', error.message);
    console.log('\n🔧 Возможные решения:');
    console.log('1. Проверьте интернет-соединение');
    console.log('2. Проверьте токен бота (он правильный?)');
    console.log('3. Если вы в России,可能需要 VPN или прокси');
    console.log('4. Попробуйте перезапустить через 5-10 секунд');
  }
}

// Обработка ошибок
process.on('unhandledRejection', (error) => {
  console.error('Необработанная ошибка:', error.message);
});

// Запускаем
startBot();