const express = require('express');
const { Telegraf } = require('telegraf');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, orderBy, onSnapshot, doc, getDoc, setDoc } = require('firebase/firestore');

// ==================== КОНФИГУРАЦИЯ ====================

const firebaseConfig = {
    apiKey: "AIzaSyCR01An-gdwysrsNfDoPGV0fQ9Zxmk1S4g",
    authDomain: "yablochniy-e5daf.firebaseapp.com",
    projectId: "yablochniy-e5daf",
    storageBucket: "yablochniy-e5daf.firebasestorage.app",
    messagingSenderId: "909418919751",
    appId: "1:909418919751:web:cc3975c0e62b5ae4703e62"
};

const BOT_TOKEN = "8754493631:AAH9vZvWTS-SOHwk5Y0y7Rbr6klwmgeSgN0";
const MINI_APP_URL = "https://apple-store-web-production.up.railway.app";

const ADMIN_IDS = [
    "7441684316",
];

const GROUP_CHAT_ID = -1003850642883;

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('🍎 Apple Store Bot is running!');
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ HTTP сервер запущен на порту ${PORT}`);
});

const bot = new Telegraf(BOT_TOKEN);
const sessions = new Map();

// ==================== ПОСТОЯННАЯ КНОПКА ====================

async function setPersistentMenu() {
    try {
        await bot.telegram.setChatMenuButton({
            menu_button: {
                type: 'web_app',
                text: '🛍 Магазин',
                web_app: { url: MINI_APP_URL }
            }
        });
        console.log('✅ Постоянная кнопка магазина установлена');
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    }
}

// ==================== МЕНЮ КОМАНД ====================

bot.telegram.setMyCommands([
    { command: 'start', description: '🛍 Открыть магазин' },
    { command: 'help', description: '❓ Помощь' }
]);

async function setAdminCommands() {
    const adminCommands = [
        { command: 'addproduct', description: '➕ Добавить товар' },
        { command: 'admin', description: '👥 Список админов' },
        { command: 'addadmin', description: '👑 Добавить админа' },
        { command: 'removeadmin', description: '🗑 Удалить админа' },
        { command: 'help', description: '❓ Помощь' },
        { command: 'start', description: '🛍 Открыть магазин' }
    ];
    
    for (const adminId of ADMIN_IDS) {
        try {
            await bot.telegram.setMyCommands(adminCommands, { scope: { type: 'chat', chat_id: adminId } });
            console.log(`✅ Меню для админа ${adminId}`);
        } catch (error) {
            console.error(`❌ Ошибка для ${adminId}:`, error.message);
        }
    }
}

// ==================== КНОПКА МАГАЗИНА (ТОЛЬКО В ЛИЧКУ) ====================

async function sendStoreButton(chatId, chatType) {
    // Не отправляем кнопку в группы
    if (chatType !== 'private') {
        return;
    }
    
    await bot.telegram.sendMessage(chatId, 
        '🍎 Добро пожаловать в магазин "Яблочный"!\n\nНажмите кнопку ниже, чтобы открыть каталог:',
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🛍 Открыть магазин', web_app: { url: MINI_APP_URL } }]
                ]
            }
        }
    );
}

// ==================== ФУНКЦИИ АДМИНОВ ====================

async function saveAdminsToDB(admins) {
    try {
        const adminsRef = doc(db, 'settings', 'admins');
        await setDoc(adminsRef, { ids: admins, updatedAt: new Date().toISOString() });
        console.log('✅ Список админов сохранен');
    } catch (error) {
        console.error('❌ Ошибка:', error);
    }
}

async function loadAdminsFromDB() {
    try {
        const adminsRef = doc(db, 'settings', 'admins');
        const docSnap = await getDoc(adminsRef);
        
        if (docSnap.exists()) {
            const savedAdmins = docSnap.data().ids;
            ADMIN_IDS.length = 0;
            savedAdmins.forEach(id => ADMIN_IDS.push(id));
            console.log(`✅ Загружено админов: ${ADMIN_IDS.length}`);
        } else {
            await saveAdminsToDB(ADMIN_IDS);
            console.log(`✅ Создан список админов: ${ADMIN_IDS.length}`);
        }
    } catch (error) {
        console.error('❌ Ошибка:', error);
    }
}

// ==================== ОТСЛЕЖИВАНИЕ ЗАКАЗОВ ====================

async function watchOrders() {
    console.log('👀 Отслеживание заказов...');
    
    const q = query(collection(db, 'orders'), orderBy('date', 'desc'), limit(10));
    
    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const order = change.doc.data();
                
                let date = 'только что';
                if (order.date) {
                    try {
                        date = new Date(order.date).toLocaleString('ru-RU');
                    } catch (e) {}
                }
                
                const message = `
🛍 НОВЫЙ ЗАКАЗ!

👤 Клиент: ${order.username ? '@' + order.username : 'Не указан'}
🆔 ID: ${order.userId || '—'}

📱 Товар: ${order.productName}
💾 Память: ${order.storage || '—'}
🎨 Цвет: ${order.color || '—'}
💰 Сумма: ${(order.price || 0).toLocaleString()} ₽

📅 Время: ${date}
                `.trim();
                
                // Отправляем в группу
                if (GROUP_CHAT_ID) {
                    bot.telegram.sendMessage(GROUP_CHAT_ID, message)
                        .catch(err => console.error('❌ Ошибка группы:', err.message));
                }
                
                // Отправляем админам
                ADMIN_IDS.forEach(adminId => {
                    bot.telegram.sendMessage(adminId, message)
                        .catch(err => console.error('❌ Ошибка админу:', err.message));
                });
                
                console.log(`📬 Заказ: ${order.productName}`);
            }
        });
    }, (error) => {
        console.error('❌ Ошибка:', error);
    });
}

// ==================== КОМАНДЫ ====================

bot.start(async (ctx) => {
    await sendStoreButton(ctx.chat.id, ctx.chat.type);
});

bot.command('shop', async (ctx) => {
    await sendStoreButton(ctx.chat.id, ctx.chat.type);
});

bot.command('addproduct', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (!ADMIN_IDS.includes(userId)) {
        return ctx.reply('❌ Нет доступа');
    }
    sessions.set(userId, { step: 'name' });
    await ctx.reply('📱 Название модели:');
});

bot.command('admin', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (!ADMIN_IDS.includes(userId)) {
        return ctx.reply('❌ Нет доступа');
    }
    let adminList = '';
    ADMIN_IDS.forEach((id, index) => {
        adminList += `${index + 1}. ${id}\n`;
    });
    await ctx.reply(`👥 Администраторы:\n\n${adminList}\nВсего: ${ADMIN_IDS.length}`);
});

bot.command('addadmin', async (ctx) => {
    const userId = ctx.from.id.toString();
    const args = ctx.message.text.split(' ');
    
    if (userId !== "7441684316") {
        return ctx.reply('❌ Только главный админ');
    }
    if (args.length < 2) {
        return ctx.reply('⚠️ Использование: /addadmin <id>');
    }
    const newAdminId = args[1];
    if (ADMIN_IDS.includes(newAdminId)) {
        return ctx.reply('⚠️ Уже админ');
    }
    ADMIN_IDS.push(newAdminId);
    await saveAdminsToDB(ADMIN_IDS);
    await setAdminCommands();
    await ctx.reply(`✅ Админ добавлен: ${newAdminId}`);
});

bot.command('removeadmin', async (ctx) => {
    const userId = ctx.from.id.toString();
    const args = ctx.message.text.split(' ');
    
    if (userId !== "7441684316") {
        return ctx.reply('❌ Только главный админ');
    }
    if (args.length < 2) {
        return ctx.reply('⚠️ Использование: /removeadmin <id>');
    }
    const removeId = args[1];
    if (removeId === userId) {
        return ctx.reply('❌ Нельзя удалить себя');
    }
    const index = ADMIN_IDS.indexOf(removeId);
    if (index === -1) {
        return ctx.reply('⚠️ Не админ');
    }
    ADMIN_IDS.splice(index, 1);
    await saveAdminsToDB(ADMIN_IDS);
    await setAdminCommands();
    await ctx.reply(`✅ Админ удален: ${removeId}`);
});

bot.command('help', async (ctx) => {
    const isAdmin = ADMIN_IDS.includes(ctx.from.id.toString());
    let helpText = `🍎 Яблочный магазин\n\n/start - открыть магазин\n/help - помощь`;
    if (isAdmin) {
        helpText += `\n\n👑 Админ-команды:\n/addproduct\n/admin\n/addadmin <id>\n/removeadmin <id>`;
    }
    await ctx.reply(helpText);
});

// ==================== ДОБАВЛЕНИЕ ТОВАРОВ ====================

bot.on('text', async (ctx) => {
    const userId = ctx.from.id.toString();
    const session = sessions.get(userId);
    if (!session) return;
    
    const message = ctx.message.text;
    
    if (session.step === 'name') {
        session.name = message;
        session.step = 'description';
        await ctx.reply('📝 Описание:');
    }
    else if (session.step === 'description') {
        session.description = message;
        session.step = 'storage';
        await ctx.reply('💾 Память:');
    }
    else if (session.step === 'storage') {
        session.storage = message;
        session.step = 'color';
        await ctx.reply('🎨 Цвет:');
    }
    else if (session.step === 'color') {
        session.color = message;
        session.step = 'price';
        await ctx.reply('💰 Цена (число):');
    }
    else if (session.step === 'price') {
        const price = parseInt(message);
        if (isNaN(price)) {
            return ctx.reply('❌ Введите число!');
        }
        session.price = price;
        session.step = 'image';
        await ctx.reply('📸 Отправьте фото:');
    }
});

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
        
        await ctx.reply(`✅ Товар добавлен!\n${session.name} - ${session.price.toLocaleString()} ₽`);
        sessions.delete(userId);
    } catch (error) {
        console.error('Ошибка:', error);
        await ctx.reply('❌ Ошибка');
        sessions.delete(userId);
    }
});

// ==================== ЗАПУСК ====================

async function startBot() {
    try {
        await loadAdminsFromDB();
        await bot.telegram.setMyCommands([
            { command: 'start', description: '🛍 Открыть магазин' },
            { command: 'help', description: '❓ Помощь' }
        ]);
        await setAdminCommands();
        await setPersistentMenu();
        await bot.launch();
        console.log('✅ Бот запущен');
        watchOrders();
        console.log('✅ Отслеживание заказов запущено');
    } catch (error) {
        console.error('❌ Ошибка:', error);
    }
}

startBot();

process.once('SIGINT', () => {
    bot.stop('SIGINT');
    server.close();
});
process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    server.close();
});
process.on('unhandledRejection', (error) => {
    console.error('❌ Ошибка:', error.message);
});
