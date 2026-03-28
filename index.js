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
let checkCount = 0;
let intervalId = null;

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

// ==================== ПРОВЕРКА ЗАКАЗОВ ====================

async function checkNewOrders() {
    checkCount++;
    const time = new Date().toLocaleTimeString();
    console.log(`🔍 [${checkCount}] ${time} Проверка новых заказов...`);
    
    try {
        const q = query(collection(db, 'orders'), orderBy('date', 'desc'), limit(5));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            console.log(`📭 [${checkCount}] Заказов нет`);
            return;
        }
        
        const latestOrder = snapshot.docs[0];
        const latestOrderId = latestOrder.id;
        const order = latestOrder.data();
        
        console.log(`📦 [${checkCount}] Последний заказ: ID=${latestOrderId.substring(0, 10)}..., товар=${order.productName}`);
        
        // Если это новый заказ (не отправляли раньше)
        if (lastSentOrderId !== latestOrderId) {
            lastSentOrderId = latestOrderId;
            
            console.log(`🆕 [${checkCount}] НОВЫЙ ЗАКАЗ! Отправляем уведомление...`);
            
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
                try {
                    await bot.telegram.sendMessage(GROUP_CHAT_ID, message);
                    console.log(`✅ [${checkCount}] Отправлено в группу`);
                } catch (err) {
                    console.error(`❌ [${checkCount}] Ошибка группы:`, err.message);
                }
            }
            
            // Отправляем админам
            for (const adminId of ADMIN_IDS) {
                try {
                    await bot.telegram.sendMessage(adminId, message);
                    console.log(`✅ [${checkCount}] Отправлено админу ${adminId}`);
                } catch (err) {
                    console.error(`❌ [${checkCount}] Ошибка админу ${adminId}:`, err.message);
                }
            }
        }
    } catch (error) {
        console.error(`❌ [${checkCount}] Ошибка проверки заказов:`, error.message);
    }
}

// ==================== КОМАНДЫ ====================

// Команда /start
bot.start(async (ctx) => {
    await ctx.reply(
        '🍎 Добро пожаловать в магазин "Яблочный"!\n\n' +
        'Используйте кнопку внизу экрана, чтобы открыть магазин.'
    );
});

// Команда /help
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
/addproduct - добавить новый товар
/admin - список администраторов
/addadmin <id> - добавить администратора
/removeadmin <id> - удалить администратора
/checkorders - проверить заказы в базе
/testorder - отправить тестовое уведомление
/forcecheck - принудительно проверить и отправить уведомление
/status - проверить статус бота
/restart - перезапустить проверку заказов

📝 Как добавить товар:
1. /addproduct
2. Введите название
3. Введите описание
4. Введите память (128GB, 256GB)
5. Введите цвет
6. Введите цену
7. Отправьте фото

🔔 Уведомления о заказах приходят в группу и в личные сообщения`;
    }
    
    await ctx.reply(helpText);
});

// Команда /status
bot.command('status', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (!ADMIN_IDS.includes(userId)) {
        return ctx.reply('❌ Нет доступа');
    }
    
    await ctx.reply(
        `📊 Статус бота:\n\n` +
        `Проверок выполнено: ${checkCount}\n` +
        `Последний отправленный заказ ID: ${lastSentOrderId ? lastSentOrderId.substring(0, 20) + '...' : 'нет'}\n` +
        `Админов: ${ADMIN_IDS.length}\n` +
        `Группа: ${GROUP_CHAT_ID || 'не настроена'}\n` +
        `Интервал активен: ${intervalId ? 'да' : 'нет'}`
    );
});

// Команда /restart - перезапустить проверку
bot.command('restart', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (!ADMIN_IDS.includes(userId)) {
        return ctx.reply('❌ Нет доступа');
    }
    
    if (intervalId) {
        clearInterval(intervalId);
    }
    
    intervalId = setInterval(checkNewOrders, 5000);
    await ctx.reply('✅ Проверка заказов перезапущена (каждые 5 секунд)');
});

// Команда /addproduct
bot.command('addproduct', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (!ADMIN_IDS.includes(userId)) {
        return ctx.reply('❌ У вас нет доступа');
    }
    sessions.set(userId, { step: 'name' });
    await ctx.reply('📱 Введите название модели:');
});

// Команда /admin
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

// Команда /addadmin
bot.command('addadmin', async (ctx) => {
    const userId = ctx.from.id.toString();
    const args = ctx.message.text.split(' ');
    
    if (userId !== "7441684316") {
        return ctx.reply('❌ Только главный администратор');
    }
    if (args.length < 2) {
        return ctx.reply('⚠️ Использование: /addadmin <telegram_id>');
    }
    const newAdminId = args[1];
    if (ADMIN_IDS.includes(newAdminId)) {
        return ctx.reply('⚠️ Уже администратор');
    }
    ADMIN_IDS.push(newAdminId);
    await saveAdminsToDB(ADMIN_IDS);
    await ctx.reply(`✅ Администратор добавлен: ${newAdminId}`);
});

// Команда /removeadmin
bot.command('removeadmin', async (ctx) => {
    const userId = ctx.from.id.toString();
    const args = ctx.message.text.split(' ');
    
    if (userId !== "7441684316") {
        return ctx.reply('❌ Только главный администратор');
    }
    if (args.length < 2) {
        return ctx.reply('⚠️ Использование: /removeadmin <telegram_id>');
    }
    const removeId = args[1];
    if (removeId === userId) {
        return ctx.reply('❌ Нельзя удалить себя');
    }
    const index = ADMIN_IDS.indexOf(removeId);
    if (index === -1) {
        return ctx.reply('⚠️ Не администратор');
    }
    ADMIN_IDS.splice(index, 1);
    await saveAdminsToDB(ADMIN_IDS);
    await ctx.reply(`✅ Администратор удален: ${removeId}`);
});

// Команда /checkorders
bot.command('checkorders', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (!ADMIN_IDS.includes(userId)) {
        return ctx.reply('❌ Нет доступа');
    }
    
    try {
        const ordersRef = collection(db, 'orders');
        const snapshot = await getDocs(ordersRef);
        const orders = [];
        snapshot.forEach(doc => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        
        if (orders.length === 0) {
            await ctx.reply('📭 В базе нет заказов');
        } else {
            const lastOrder = orders[orders.length - 1];
            await ctx.reply(
                `📊 Статистика заказов:\n\n` +
                `Всего: ${orders.length}\n` +
                `Последний: ${lastOrder.productName || '—'} (${lastOrder.username || 'аноним'})\n` +
                `Время: ${lastOrder.date || '—'}`
            );
        }
    } catch (error) {
        console.error('Ошибка:', error);
        await ctx.reply('❌ Ошибка при проверке');
    }
});

// Команда /testorder
bot.command('testorder', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (!ADMIN_IDS.includes(userId)) {
        return ctx.reply('❌ Нет доступа');
    }
    
    const testMessage = `
🛍 ТЕСТОВОЕ УВЕДОМЛЕНИЕ

👤 Клиент: @testuser
🆔 ID: 123456789

📱 Товар: iPhone 17 (тест)
💾 Память: 256GB
🎨 Цвет: Black
💰 Сумма: 99 900 ₽

📅 Время: ${new Date().toLocaleString('ru-RU')}
    `.trim();
    
    if (GROUP_CHAT_ID) {
        await bot.telegram.sendMessage(GROUP_CHAT_ID, testMessage)
            .catch(err => console.error('❌ Ошибка группы:', err.message));
    }
    
    for (const adminId of ADMIN_IDS) {
        await bot.telegram.sendMessage(adminId, testMessage)
            .catch(err => console.error('❌ Ошибка админу:', err.message));
    }
    
    await ctx.reply('✅ Тестовое уведомление отправлено');
});

// Команда /forcecheck
bot.command('forcecheck', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (!ADMIN_IDS.includes(userId)) {
        return ctx.reply('❌ Нет доступа');
    }
    
    await ctx.reply('🔄 Принудительная проверка...');
    await checkNewOrders();
    await ctx.reply(`✅ Проверка выполнена. Всего проверок: ${checkCount}`);
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
        
        await ctx.reply(
            `✅ Товар добавлен!\n\n` +
            `📱 ${session.name}\n` +
            `💾 ${session.storage}\n` +
            `🎨 ${session.color}\n` +
            `💰 ${session.price.toLocaleString()} ₽`
        );
        
        sessions.delete(userId);
    } catch (error) {
        console.error('Ошибка:', error);
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
        
        // Запускаем периодическую проверку каждые 5 секунд
        intervalId = setInterval(checkNewOrders, 5000);
        console.log('✅ Периодическая проверка запущена (каждые 5 секунд)');
        
        // Отправляем тестовое сообщение главному админу
        setTimeout(async () => {
            await bot.telegram.sendMessage("7441684316", "✅ Бот перезапущен. Проверка заказов каждые 5 секунд.\n\nПосле нового заказа уведомление должно прийти в течение 5-10 секунд.");
        }, 3000);
        
    } catch (error) {
        console.error('❌ Ошибка запуска бота:', error);
    }
}

startBot();

process.once('SIGINT', () => {
    if (intervalId) clearInterval(intervalId);
    bot.stop('SIGINT');
    server.close();
});

process.once('SIGTERM', () => {
    if (intervalId) clearInterval(intervalId);
    bot.stop('SIGTERM');
    server.close();
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Необработанная ошибка:', error.message);
});
