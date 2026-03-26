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
        { command: 'testorder', description: '🔔 Тест уведомления' },
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
    console.log('👀 Отслеживание заказов запущено...');
    
    const q = query(collection(db, 'orders'), orderBy('date', 'desc'), limit(10));
    
    onSnapshot(q, (snapshot) => {
        console.log(`📊 Получено изменение в orders. Всего документов: ${snapshot.size}`);
        
        snapshot.docChanges().forEach((change) => {
            console.log(`🔄 Тип изменения: ${change.type}`);
            
            if (change.type === 'added') {
                const order = change.doc.data();
                console.log(`🆕 Новый заказ найден: ${order.productName}`);
                
                let date = 'только что';
                if (order.date) {
                    try {
                        date = new Date(order.date).toLocaleString('ru-RU');
                    } catch (e) {
                        date = order.date;
                    }
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
                    console.log(`📤 Отправка в группу ${GROUP_CHAT_ID}...`);
                    bot.telegram.sendMessage(GROUP_CHAT_ID, message)
                        .then(() => console.log('✅ Уведомление отправлено в группу'))
                        .catch(err => console.error('❌ Ошибка группы:', err.message));
                } else {
                    console.log('⚠️ GROUP_CHAT_ID не задан');
                }
                
                // Отправляем админам
                for (const adminId of ADMIN_IDS) {
                    console.log(`📤 Отправка админу ${adminId}...`);
                    bot.telegram.sendMessage(adminId, message)
                        .then(() => console.log(`✅ Уведомление админу ${adminId}`))
                        .catch(err => console.error(`❌ Ошибка админу ${adminId}:`, err.message));
                }
            }
        });
    }, (error) => {
        console.error('❌ Ошибка отслеживания заказов:', error);
    });
}

// ==================== КОМАНДЫ ====================

// Команда /start — просто приветствие без кнопки
bot.start(async (ctx) => {
    await ctx.reply(
        '🍎 Добро пожаловать в магазин "Яблочный"!\n\n' +
        'Используйте кнопку внизу экрана, чтобы открыть магазин.'
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
    let adminList = '';
    ADMIN_IDS.forEach((id, index) => {
        adminList += `${index + 1}. ${id}\n`;
    });
    await ctx.reply(`👥 Список администраторов:\n\n${adminList}\nВсего: ${ADMIN_IDS.length}`);
});

// Команда /addadmin <id> (добавить нового админа)
bot.command('addadmin', async (ctx) => {
    const userId = ctx.from.id.toString();
    const args = ctx.message.text.split(' ');
    
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
    await setAdminCommands();
    await ctx.reply(`✅ Новый администратор добавлен!\n\nID: ${newAdminId}`);
});

// Команда /removeadmin <id> (удалить админа)
bot.command('removeadmin', async (ctx) => {
    const userId = ctx.from.id.toString();
    const args = ctx.message.text.split(' ');
    
    if (userId !== "7441684316") {
        return ctx.reply('❌ Только главный администратор может удалять админов');
    }
    if (args.length < 2) {
        return ctx.reply('⚠️ Использование: /removeadmin <telegram_id>\n\nПример: /removeadmin 123456789');
    }
    const removeId = args[1];
    if (removeId === userId) {
        return ctx.reply('❌ Вы не можете удалить себя из списка администраторов');
    }
    const index = ADMIN_IDS.indexOf(removeId);
    if (index === -1) {
        return ctx.reply('⚠️ Этот пользователь не является администратором');
    }
    ADMIN_IDS.splice(index, 1);
    await saveAdminsToDB(ADMIN_IDS);
    await setAdminCommands();
    await ctx.reply(`✅ Администратор удален!\n\nID: ${removeId}`);
});

// Команда /testorder (тест уведомлений)
bot.command('testorder', async (ctx) => {
    const userId = ctx.from.id.toString();
    
    if (!ADMIN_IDS.includes(userId)) {
        return ctx.reply('❌ У вас нет доступа к этой команде');
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
    
    // Отправляем в группу
    if (GROUP_CHAT_ID) {
        await bot.telegram.sendMessage(GROUP_CHAT_ID, testMessage)
            .then(() => console.log('✅ Тест в группу отправлен'))
            .catch(err => console.error('❌ Ошибка группы:', err.message));
    }
    
    // Отправляем админам
    for (const adminId of ADMIN_IDS) {
        await bot.telegram.sendMessage(adminId, testMessage)
            .catch(err => console.error('❌ Ошибка админу:', err.message));
    }
    
    await ctx.reply('✅ Тестовое уведомление отправлено. Проверьте группу и личные сообщения.');
});

// Команда /help (справка)
bot.command('help', async (ctx) => {
    const isAdmin = ADMIN_IDS.includes(ctx.from.id.toString());
    
    let helpText = `🍎 Яблочный магазин

🛍 Для открытия магазина используйте кнопку внизу экрана.

Основные команды:
/start - показать приветствие
/help - показать эту справку`;

    if (isAdmin) {
        helpText += `

👑 Административные команды:
/addproduct - добавить новый товар
/admin - список администраторов
/addadmin <id> - добавить администратора
/removeadmin <id> - удалить администратора
/testorder - отправить тестовое уведомление`;
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
            `✅ Товар успешно добавлен!\n\n` +
            `📱 Название: ${session.name}\n` +
            `💾 Память: ${session.storage}\n` +
            `🎨 Цвет: ${session.color}\n` +
            `💰 Цена: ${session.price.toLocaleString()} ₽\n\n` +
            `Можете добавить еще один через /addproduct`
        );
        
        sessions.delete(userId);
    } catch (error) {
        console.error('Ошибка сохранения товара:', error);
        await ctx.reply('❌ Ошибка при сохранении. Попробуйте снова /addproduct');
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
        console.error('❌ Ошибка запуска бота:', error);
    }
}

startBot();

process.once('SIGINT', () => {
    bot.stop('SIGINT');
    server.close();
    console.log('🛑 Бот остановлен');
});

process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    server.close();
    console.log('🛑 Бот остановлен');
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Необработанная ошибка:', error.message);
});
