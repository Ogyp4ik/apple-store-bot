const express = require('express');
const { Telegraf } = require('telegraf');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, doc, getDoc, setDoc } = require('firebase/firestore');

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

// Хранилище для временных данных (категории и товары)
const tempData = new Map();

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
/addcategory - добавить категорию
/admin - список админов
/addadmin <id> - добавить админа
/removeadmin <id> - удалить админа
/checkorders - проверить заказы
/testorder - тестовое уведомление

📝 Как добавить товар:
1. /addcategory - сначала создайте категорию
2. /addproduct - выберите категорию и добавьте товар

🔔 Уведомления приходят автоматически`;
    }
    
    await ctx.reply(helpText);
});

// ==================== УПРАВЛЕНИЕ КАТЕГОРИЯМИ ====================

bot.command('addcategory', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (!ADMIN_IDS.includes(userId)) {
        return ctx.reply('❌ Нет доступа');
    }
    
    tempData.set(userId, { step: 'category_name' });
    await ctx.reply('📁 Введите название категории (например: iPhone, iPad, MacBook, AirPods):');
});

// ==================== ДОБАВЛЕНИЕ ТОВАРОВ ====================

bot.command('addproduct', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (!ADMIN_IDS.includes(userId)) {
        return ctx.reply('❌ Нет доступа');
    }
    
    try {
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        const categories = [];
        categoriesSnapshot.forEach(doc => {
            const data = doc.data();
            categories.push({ id: doc.id, name: data.name });
        });
        
        if (categories.length === 0) {
            return ctx.reply('❌ Сначала добавьте категории через /addcategory');
        }
        
        // Сохраняем список категорий
        tempData.set(userId, { step: 'select_category', categories: categories });
        
        let categoryList = '📁 Доступные категории:\n\n';
        categories.forEach((cat, index) => {
            categoryList += `${index + 1}. ${cat.name}\n`;
        });
        categoryList += '\nВведите номер категории:';
        
        await ctx.reply(categoryList);
        
    } catch (error) {
        console.error('Ошибка:', error);
        await ctx.reply('❌ Ошибка загрузки категорий');
    }
});

// ==================== АДМИНСКИЕ КОМАНДЫ ====================

bot.command('admin', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (!ADMIN_IDS.includes(userId)) {
        return ctx.reply('❌ Нет доступа');
    }
    
    let adminList = '👥 Администраторы:\n\n';
    ADMIN_IDS.forEach((id, index) => {
        adminList += `${index + 1}. ${id}\n`;
    });
    adminList += `\nВсего: ${ADMIN_IDS.length}`;
    
    await ctx.reply(adminList);
});

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
        return ctx.reply('⚠️ Этот пользователь уже администратор');
    }
    
    ADMIN_IDS.push(newAdminId);
    await saveAdminsToDB(ADMIN_IDS);
    await ctx.reply(`✅ Администратор добавлен!\nID: ${newAdminId}`);
});

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
        return ctx.reply('⚠️ Этот пользователь не администратор');
    }
    
    ADMIN_IDS.splice(index, 1);
    await saveAdminsToDB(ADMIN_IDS);
    await ctx.reply(`✅ Администратор удален!\nID: ${removeId}`);
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
            await ctx.reply(
                `📊 Статистика заказов:\n\n` +
                `Всего: ${orders.length}\n` +
                `Последний: ${last.productName || 'Заказ под заказ'} (${last.username})\n` +
                `Время: ${last.date ? new Date(last.date).toLocaleString('ru-RU') : '—'}`
            );
        }
    } catch (error) {
        console.error('Ошибка:', error);
        await ctx.reply('❌ Ошибка при проверке');
    }
});

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

// ==================== ОБРАБОТКА СООБЩЕНИЙ ====================

bot.on('text', async (ctx) => {
    const userId = ctx.from.id.toString();
    const data = tempData.get(userId);
    
    if (!data) return;
    
    const message = ctx.message.text;
    
    // Добавление категории
    if (data.step === 'category_name') {
        const categoryName = message;
        const categoryId = categoryName.toLowerCase().replace(/\s/g, '_');
        
        try {
            await addDoc(collection(db, 'categories'), {
                id: categoryId,
                name: categoryName,
                order: 999
            });
            await ctx.reply(`✅ Категория "${categoryName}" добавлена!`);
        } catch (error) {
            console.error('Ошибка:', error);
            await ctx.reply('❌ Ошибка при добавлении категории');
        }
        
        tempData.delete(userId);
        return;
    }
    
    // Выбор категории для товара
    if (data.step === 'select_category') {
        const num = parseInt(message);
        if (isNaN(num) || num < 1 || num > data.categories.length) {
            return ctx.reply(`❌ Введите номер от 1 до ${data.categories.length}`);
        }
        
        const selectedCategory = data.categories[num - 1];
        
        tempData.set(userId, {
            step: 'product_name',
            categoryId: selectedCategory.id,
            categoryName: selectedCategory.name
        });
        
        await ctx.reply(`✅ Выбрано: ${selectedCategory.name}\n\n📱 Введите название модели:`);
        return;
    }
    
    // Добавление названия товара
    if (data.step === 'product_name') {
        tempData.set(userId, {
            ...data,
            step: 'product_description',
            productName: message
        });
        await ctx.reply('📝 Введите описание товара:');
        return;
    }
    
    // Добавление описания
    if (data.step === 'product_description') {
        tempData.set(userId, {
            ...data,
            step: 'product_storage',
            productDescription: message
        });
        await ctx.reply('💾 Введите память (например: 128GB, 256GB) или напишите "нет":');
        return;
    }
    
    // Добавление памяти
    if (data.step === 'product_storage') {
        tempData.set(userId, {
            ...data,
            step: 'product_color',
            productStorage: message.toLowerCase() === 'нет' ? '—' : message
        });
        await ctx.reply('🎨 Введите цвет или напишите "нет":');
        return;
    }
    
    // Добавление цвета
    if (data.step === 'product_color') {
        tempData.set(userId, {
            ...data,
            step: 'product_price',
            productColor: message.toLowerCase() === 'нет' ? '—' : message
        });
        await ctx.reply('💰 Введите цену (только число):');
        return;
    }
    
    // Добавление цены
    if (data.step === 'product_price') {
        const price = parseInt(message);
        if (isNaN(price)) {
            return ctx.reply('❌ Введите число!');
        }
        
        tempData.set(userId, {
            ...data,
            step: 'product_image',
            productPrice: price
        });
        await ctx.reply('📸 Отправьте фото товара:');
    }
});

// ==================== ОБРАБОТКА ФОТО ====================

bot.on('photo', async (ctx) => {
    const userId = ctx.from.id.toString();
    const data = tempData.get(userId);
    
    if (!data || data.step !== 'product_image') return;
    
    try {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const fileLink = await ctx.telegram.getFileLink(photo.file_id);
        
        await addDoc(collection(db, 'products'), {
            categoryId: data.categoryId,
            name: data.productName,
            description: data.productDescription,
            storage: data.productStorage,
            color: data.productColor,
            price: data.productPrice,
            image: fileLink.href,
            createdAt: new Date().toISOString()
        });
        
        await ctx.reply(
            `✅ Товар добавлен!\n\n` +
            `📁 Категория: ${data.categoryName}\n` +
            `📱 Модель: ${data.productName}\n` +
            `📝 Описание: ${data.productDescription}\n` +
            `💾 Память: ${data.productStorage}\n` +
            `🎨 Цвет: ${data.productColor}\n` +
            `💰 Цена: ${data.productPrice.toLocaleString()} ₽`
        );
        
        tempData.delete(userId);
    } catch (error) {
        console.error('Ошибка:', error);
        await ctx.reply('❌ Ошибка, попробуйте снова');
        tempData.delete(userId);
    }
});

// ==================== ЗАПУСК ====================

async function startBot() {
    try {
        await loadAdminsFromDB();
        
        await bot.telegram.deleteWebhook();
        console.log('✅ Вебхук удален');
        
        await bot.launch();
        console.log('✅ Бот запущен');
        
        setTimeout(async () => {
            await bot.telegram.sendMessage("7441684316", "✅ Бот запущен! Все команды работают.");
        }, 3000);
        
    } catch (error) {
        console.error('❌ Ошибка запуска:', error.message);
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
