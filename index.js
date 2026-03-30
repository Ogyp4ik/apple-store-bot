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

📝 Как добавить товар:
1. /addproduct
2. Введите номер или название категории
3. Введите название модели
4. Введите описание
5. Введите память или "нет"
6. Введите цвет или "нет"
7. Введите цену
8. Отправьте фото

📁 Как добавить категорию:
1. /addcategory
2. Введите название категории

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
    
    sessions.set(userId, { step: 'new_category' });
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
        
        sessions.set(userId, { step: 'category', categories: categories });
        
        let categoryList = '📁 Доступные категории:\n\n';
        categories.forEach((cat, index) => {
            categoryList += `${index + 1}. ${cat.name}\n`;
        });
        categoryList += '\nВведите номер категории или название:';
        
        await ctx.reply(categoryList);
        
    } catch (error) {
        console.error('Ошибка:', error);
        await ctx.reply('❌ Ошибка загрузки категорий');
    }
});

// ==================== ОБРАБОТКА ТЕКСТА ====================

bot.on('text', async (ctx) => {
    const userId = ctx.from.id.toString();
    const session = sessions.get(userId);
    
    if (!session) return;
    
    const message = ctx.message.text;
    
    // Добавление категории
    if (session.step === 'new_category') {
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
        
        sessions.delete(userId);
        return;
    }
    
    // Выбор категории для товара
    if (session.step === 'category') {
        const selected = message.trim();
        let selectedCategory = null;
        
        const num = parseInt(selected);
        if (!isNaN(num) && num >= 1 && num <= session.categories.length) {
            selectedCategory = session.categories[num - 1];
        } else {
            selectedCategory = session.categories.find(c => 
                c.name.toLowerCase() === selected.toLowerCase()
            );
        }
        
        if (!selectedCategory) {
            return ctx.reply('❌ Категория не найдена. Попробуйте снова /addproduct');
        }
        
        session.categoryId = selectedCategory.id;
        session.categoryName = selectedCategory.name;
        session.step = 'model';
        
        await ctx.reply(`✅ Выбрано: ${selectedCategory.name}\n\n📱 Введите название модели (например: iPhone 17 Pro):`);
        return;
    }
    
    // Добавление товара
    if (session.step === 'model') {
        session.model = message;
        session.step = 'description';
        await ctx.reply('📝 Введите описание товара:');
    }
    else if (session.step === 'description') {
        session.description = message;
        session.step = 'storage';
        await ctx.reply('💾 Введите память (например: 128GB, 256GB) или напишите "нет":');
    }
    else if (session.step === 'storage') {
        session.storage = message.toLowerCase() === 'нет' ? '—' : message;
        session.step = 'color';
        await ctx.reply('🎨 Введите цвет или напишите "нет":');
    }
    else if (session.step === 'color') {
        session.color = message.toLowerCase() === 'нет' ? '—' : message;
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

// ==================== ОБРАБОТКА ФОТО ====================

bot.on('photo', async (ctx) => {
    const userId = ctx.from.id.toString();
    const session = sessions.get(userId);
    
    if (!session || session.step !== 'image') return;
    
    try {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const fileLink = await ctx.telegram.getFileLink(photo.file_id);
        
        await addDoc(collection(db, 'products'), {
            categoryId: session.categoryId,
            name: session.model,
            description: session.description,
            storage: session.storage,
            color: session.color,
            price: session.price,
            image: fileLink.href,
            createdAt: new Date().toISOString()
        });
        
        await ctx.reply(
            `✅ Товар добавлен!\n\n` +
            `📁 Категория: ${session.categoryName}\n` +
            `📱 Модель: ${session.model}\n` +
            `📝 Описание: ${session.description}\n` +
            `💾 Память: ${session.storage}\n` +
            `🎨 Цвет: ${session.color}\n` +
            `💰 Цена: ${session.price.toLocaleString()} ₽`
        );
        
        sessions.delete(userId);
    } catch (error) {
        console.error('Ошибка:', error);
        await ctx.reply('❌ Ошибка, попробуйте снова');
        sessions.delete(userId);
    }
});

// ==================== ОСТАЛЬНЫЕ КОМАНДЫ ====================

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

// ==================== ЗАПУСК ====================

async function startBot() {
    try {
        await loadAdminsFromDB();
        
        // Удаляем вебхук
        await bot.telegram.deleteWebhook();
        console.log('✅ Вебхук удален');
        
        // Запускаем бота
        await bot.launch();
        console.log('✅ Бот запущен');
        
    } catch (error) {
        console.error('❌ Ошибка запуска:', error.message);
    }
}

startBot();

// Обработка остановки
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
