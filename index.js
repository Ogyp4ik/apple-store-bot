const express = require('express');
const { Telegraf } = require('telegraf');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, orderBy, onSnapshot, doc, getDoc, setDoc } = require('firebase/firestore');

// ==================== КОНФИГУРАЦИЯ ====================

// Firebase конфиг
const firebaseConfig = {
    apiKey: "AIzaSyCR01An-gdwysrsNfDoPGV0fQ9Zxmk1S4g",
    authDomain: "yablochniy-e5daf.firebaseapp.com",
    projectId: "yablochniy-e5daf",
    storageBucket: "yablochniy-e5daf.firebasestorage.app",
    messagingSenderId: "909418919751",
    appId: "1:909418919751:web:cc3975c0e62b5ae4703e62"
};

// Токен бота
const BOT_TOKEN = "8754493631:AAH9vZvWTS-SOHwk5Y0y7Rbr6klwmgeSgN0";

// Ссылка на Mini App
const MINI_APP_URL = "https://apple-store-web-production.up.railway.app";

// ID администраторов (кто может добавлять товары и получать уведомления)
// Твой ID: 7441684316
const ADMIN_IDS = [
    "7441684316",  // главный администратор
    // "123456789",  // можно добавить других админов через команду /addadmin
];

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

// Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Express для Render/Railway
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('🍎 Apple Store Bot is running!');
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ HTTP сервер запущен на порту ${PORT}`);
});

// Telegram бот
const bot = new Telegraf(BOT_TOKEN);

// Хранилище сессий для добавления товаров
const sessions = new Map();

// ==================== ФУНКЦИИ РАБОТЫ С АДМИНАМИ ====================

// Сохраняем список админов в Firebase
async function saveAdminsToDB(admins) {
    try {
        const adminsRef = doc(db, 'settings', 'admins');
        await setDoc(adminsRef, { 
            ids: admins, 
            updatedAt: new Date().toISOString() 
        });
        console.log('✅ Список админов сохранен в Firebase');
    } catch (error) {
        console.error('❌ Ошибка сохранения админов:', error);
    }
}

// Загружаем админов из Firebase при старте
async function loadAdminsFromDB() {
    try {
        const adminsRef = doc(db, 'settings', 'admins');
        const docSnap = await getDoc(adminsRef);
        
        if (docSnap.exists()) {
            const savedAdmins = docSnap.data().ids;
            // Очищаем текущий массив и заполняем загруженными
            ADMIN_IDS.length = 0;
            savedAdmins.forEach(id => ADMIN_IDS.push(id));
            console.log(`✅ Загружено админов из Firebase: ${ADMIN_IDS.length}`);
        } else {
            // Если в базе нет, сохраняем текущих
            await saveAdminsToDB(ADMIN_IDS);
            console.log(`✅ Создан новый список админов: ${ADMIN_IDS.length}`);
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки админов:', error);
    }
}

// ==================== ОТСЛЕЖИВАНИЕ ЗАКАЗОВ ====================

async function watchOrders() {
    const q = query(collection(db, 'orders'), orderBy('date', 'desc'), limit(10));
    
    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const order = change.doc.data();
                
                // Форматируем дату
                let date = 'только что';
                if (order.date) {
                    try {
                        date = new Date(order.date).toLocaleString('ru-RU');
                    } catch (e) {
                        date = order.date;
                    }
                }
                
                // Формируем красивое сообщение
                const message = `
🛍 <b>НОВЫЙ ЗАКАЗ!</b>

👤 <b>Клиент:</b> ${order.username ? '@' + order.username : 'Не указан'}
🆔 <b>ID:</b> <code>${order.userId || '—'}</code>
📝 <b>Имя:</b> ${order.firstName ? order.firstName + ' ' + (order.lastName || '') : '—'}

📱 <b>Товар:</b> ${order.productName}
💾 <b>Память:</b> ${order.storage || '—'}
🎨 <b>Цвет:</b> ${order.color || '—'}
💰 <b>Сумма:</b> ${(order.price || 0).toLocaleString()} ₽

📅 <b>Время:</b> ${date}

💡 <i>Для обработки заказа свяжитесь с клиентом</i>
                `.trim();
                
                // Отправляем всем админам
                ADMIN_IDS.forEach(adminId => {
                    bot.telegram.sendMessage(adminId, message, { parse_mode: 'HTML' })
                        .catch(err => console.error('Ошибка отправки админу:', err.message));
                });
                
                console.log(`📬 Отправлено уведомление о заказе: ${order.productName}`);
            }
        });
    }, (error) => {
        console.error('❌ Ошибка отслеживания заказов:', error);
    });
}

// ==================== КОМАНДЫ БОТА ====================

// Команда /start
bot.start((ctx) => {
    ctx.replyWithHTML(
        '🍎 Добро пожаловать в магазин "Яблочный"!\n\n' +
        'Нажми кнопку ниже, чтобы открыть каталог:',
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🛍 Открыть магазин', web_app: { url: MINI_APP_URL } }]
                ]
            }
        }
    );
});

// Команда /addproduct (только для админов)
bot.command('addproduct', async (ctx) => {
    const userId = ctx.from.id.toString();
    
    if (!ADMIN_IDS.includes(userId)) {
        return ctx.reply('❌ У вас нет доступа к этой команде');
    }
    
    sessions.set(userId, { step: 'name' });
    await ctx.reply('📱 Введите название модели (например: iPhone 17):');
});

// Команда /admin (показать список админов)
bot.command('admin', async (ctx) => {
    const userId = ctx.from.id.toString();
    
    if (!ADMIN_IDS.includes(userId)) {
        return ctx.reply('❌ У вас нет доступа к этой команде');
    }
    
    const adminList = ADMIN_IDS.map(id => {
        return `👤 <code>${id}</code>`;
    }).join('\n');
    
    await ctx.replyWithHTML(`
<b>👥 Список администраторов:</b>
${adminList || '—'}

<b>Всего:</b> ${ADMIN_IDS.length}
    `.trim());
});

// Команда /addadmin <id> (добавить нового админа)
bot.command('addadmin', async (ctx) => {
    const userId = ctx.from.id.toString();
    const args = ctx.message.text.split(' ');
    
    // Только главный админ может добавлять других
    if (userId !== "7441684316") {
        return ctx.reply('❌ Только главный администратор может добавлять админов');
    }
    
    if (args.length < 2) {
        return ctx.reply('⚠️ Использование: /addadmin <telegram_id>\n\nПример: /addadmin 123456789');
    }
    
    const newAdminId = args[1];
    
    if (ADMIN_IDS.includes(newAdminId)) {
        return ctx.reply('⚠️ Этот пользователь уже является администратором');
    }
    
    ADMIN_IDS.push(newAdminId);
    await saveAdminsToDB(ADMIN_IDS);
    
    await ctx.replyWithHTML(`✅ <b>Новый администратор добавлен!</b>\n\nID: <code>${newAdminId}</code>`);
});

// Команда /removeadmin <id> (удалить админа)
bot.command('removeadmin', async (ctx) => {
    const userId = ctx.from.id.toString();
    const args = ctx.message.text.split(' ');
    
    // Только главный админ может удалять
    if (userId !== "7441684316") {
        return ctx.reply('❌ Только главный администратор может удалять админов');
    }
    
    if (args.length < 2) {
        return ctx.reply('⚠️ Использование: /removeadmin <telegram_id>\n\nПример: /removeadmin 123456789');
    }
    
    const removeId = args[1];
    
    // Нельзя удалить самого себя
    if (removeId === userId) {
        return ctx.reply('❌ Вы не можете удалить себя из списка администраторов');
    }
    
    const index = ADMIN_IDS.indexOf(removeId);
    if (index === -1) {
        return ctx.reply('⚠️ Этот пользователь не является администратором');
    }
    
    ADMIN_IDS.splice(index, 1);
    await saveAdminsToDB(ADMIN_IDS);
    
    await ctx.replyWithHTML(`✅ <b>Администратор удален!</b>\n\nID: <code>${removeId}</code>`);
});

// Команда /help (справка)
bot.command('help', async (ctx) => {
    const userId = ctx.from.id.toString();
    const isAdmin = ADMIN_IDS.includes(userId);
    
    let helpText = `
🍎 <b>Яблочный магазин - помощь</b>

<b>Основные команды:</b>
/start - открыть магазин
/help - показать эту справку

<b>Для покупателей:</b>
• Нажмите кнопку "Открыть магазин"
• Выберите товар
• Нажмите "Купить" для оформления заказа
    `.trim();
    
    if (isAdmin) {
        helpText += `

<b>👑 Административные команды:</b>
/addproduct - добавить новый товар
/admin - список администраторов
/addadmin <id> - добавить администратора
/removeadmin <id> - удалить администратора

<b>Как добавить товар:</b>
1. /addproduct
2. Введите название
3. Введите описание
4. Введите память (128GB, 256GB)
5. Введите цвет
6. Введите цену
7. Отправьте фото

<b>Уведомления:</b>
При каждом новом заказе вы получите уведомление
        `.trim();
    }
    
    await ctx.replyWithHTML(helpText);
});

// ==================== ОБРАБОТКА ДОБАВЛЕНИЯ ТОВАРОВ ====================

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
            createdAt: new Date().toISOString()
        });
        
        await ctx.replyWithHTML(`
✅ <b>Товар успешно добавлен!</b>

📱 <b>Название:</b> ${session.name}
💾 <b>Память:</b> ${session.storage}
🎨 <b>Цвет:</b> ${session.color}
💰 <b>Цена:</b> ${session.price.toLocaleString()} ₽

Можете добавить еще один через /addproduct
        `.trim());
        
        sessions.delete(userId);
    } catch (error) {
        console.error('Ошибка сохранения товара:', error);
        await ctx.reply('❌ Ошибка при сохранении. Попробуйте снова /addproduct');
        sessions.delete(userId);
    }
});

// ==================== ЗАПУСК БОТА ====================

async function startBot() {
    try {
        // Загружаем список админов из Firebase
        await loadAdminsFromDB();
        
        // Запускаем бота
        await bot.launch();
        console.log('✅ Бот запущен');
        
        // Начинаем отслеживать заказы
        watchOrders();
        console.log('✅ Отслеживание заказов запущено');
        
    } catch (error) {
        console.error('❌ Ошибка запуска бота:', error);
    }
}

// Запускаем
startBot();

// Обработка остановки
process.once('SIGINT', () => {
    bot.stop('SIGINT');
    server.close();
    console.log('🛑 Бот остановлен (SIGINT)');
});

process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    server.close();
    console.log('🛑 Бот остановлен (SIGTERM)');
});

// Обработка необработанных ошибок
process.on('unhandledRejection', (error) => {
    console.error('❌ Необработанная ошибка:', error.message);
});
