const express = require('express');
const { Telegraf } = require('telegraf');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, doc, getDoc, setDoc } = require('firebase/firestore');

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
    "1317122793",
    "1015865721"
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

// Храним ID последнего отправленного заказа
let lastSentOrderId = null;

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

// ==================== ПРОВЕРКА ЗАКАЗОВ (КАЖДЫЕ 10 СЕКУНД) ====================

async function checkOrders() {
    try {
        const q = query(collection(db, 'orders'), orderBy('date', 'desc'), limit(5));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            return;
        }
        
        const latestOrder = snapshot.docs[0];
        const orderId = latestOrder.id;
        const order = latestOrder.data();
        
        // Если это новый заказ
        if (lastSentOrderId !== orderId) {
            lastSentOrderId = orderId;
            
            console.log(`🆕 НОВЫЙ ЗАКАЗ: ${order.productName} от ${order.username}`);
            
            const message = `
🛍 НОВЫЙ ЗАКАЗ!

👤 Клиент: ${order.username ? '@' + order.username : 'Не указан'}
🆔 ID: ${order.userId || '—'}

📱 Товар: ${order.productName}
💾 Память: ${order.storage || '—'}
🎨 Цвет: ${order.color || '—'}
💰 Сумма: ${(order.price || 0).toLocaleString()} ₽

📅 Время: ${new Date().toLocaleString('ru-RU')}
            `.trim();
            
            // Отправляем в группу
            if (GROUP_CHAT_ID) {
                await bot.telegram.sendMessage(GROUP_CHAT_ID, message);
                console.log('✅ Отправлено в группу');
            }
            
            // Отправляем админам
            for (const adminId of ADMIN_IDS) {
                await bot.telegram.sendMessage(adminId, message);
                console.log(`✅ Отправлено админу ${adminId}`);
            }
        }
    } catch (error) {
        console.error('❌ Ошибка проверки заказов:', error);
    }
}

// ==================== КОМАНДЫ ====================

bot.start(async (ctx) => {
    await ctx.reply(
        '🍎 Добро пожаловать в магазин "Яблочный"!\n\n' +
        'Используйте кнопку внизу экрана, чтобы открыть магазин.'
    );
});

bot.command('help', async (ctx) => {
    const isAdmin = ADMIN_IDS.includes(ctx.from.id.toString());
    
    let helpText = `🍎 Яблочный магазин

🛍 Для открытия магазина используйте кнопку внизу экрана.

📋 Доступные команды:
/start - показать приветствие
/help - показать эту справку`;

    if (isAdmin) {
        helpText += `

👑 Административные команды:
/addproduct - добавить товар
/admin - список админов
/addadmin <id> - добавить админа
/removeadmin <id> - удалить админа
/checkorders - проверить заказы

📝 Как добавить товар:
1. /addproduct
2. Введите название
3. Введите описание
4. Введите память
5. Введите цвет
6. Введите цену
7. Отправьте фото

🔔 Уведомления приходят автоматически каждые 10 секунд`;
    }
    
    await ctx.reply(helpText);
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
        return ctx.reply('⚠️ /addadmin <id>');
    }
    const newAdminId = args[1];
    if (ADMIN_IDS.includes(newAdminId)) {
        return ctx.reply('⚠️ Уже админ');
    }
    ADMIN_IDS.push(newAdminId);
    await saveAdminsToDB(ADMIN_IDS);
    await ctx.reply(`✅ Админ добавлен: ${newAdminId}`);
});

bot.command('removeadmin', async (ctx) => {
    const userId = ctx.from.id.toString();
    const args = ctx.message.text.split(' ');
    
    if (userId !== "7441684316") {
        return ctx.reply('❌ Только главный админ');
    }
    if (args.length < 2) {
        return ctx.reply('⚠️ /removeadmin <id>');
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
    await ctx.reply(`✅ Админ удален: ${removeId}`);
});

bot.command('checkorders', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (!ADMIN_IDS.includes(userId)) {
        return ctx.reply('❌ Нет доступа');
    }
    
    try {
        const snapshot = await getDocs(collection(db, 'orders'));
        const orders = [];
        snapshot.forEach(doc => orders.push(doc.data()));
        
        if (orders.length === 0) {
            await ctx.reply('📭 Заказов нет');
        } else {
            const last = orders[orders.length - 1];
            await ctx.reply(`📊 Всего заказов: ${orders.length}\nПоследний: ${last.productName} (${last.username})`);
        }
    } catch (error) {
        await ctx.reply('❌ Ошибка');
    }
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
        if (isNaN(price)) return ctx.reply('❌ Введите число!');
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
        await ctx.reply('❌ Ошибка, попробуйте снова');
        sessions.delete(userId);
    }
});

// ==================== ЗАПУСК ====================

async function startBot() {
    try {
        await loadAdminsFromDB();
        await bot.launch();
        console.log('✅ Бот запущен');
        
        // Запускаем проверку заказов каждые 10 секунд
        setInterval(checkOrders, 10000);
        console.log('✅ Проверка заказов запущена (каждые 10 секунд)');
        
        setTimeout(async () => {
            await bot.telegram.sendMessage("7441684316", "✅ Бот перезапущен. Проверка заказов каждые 10 секунд.");
        }, 3000);
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
