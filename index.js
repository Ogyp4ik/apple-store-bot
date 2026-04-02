<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="color-scheme" content="light dark">
    <title>Яблочный</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore-compat.js"></script>
    <style>
/* ============================================================
   Яблочный — Telegram Mini App — Premium Design v4
   CSS встроен прямо в HTML — никакой проблемы с подключением
   ============================================================ */

:root {
    --font: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif;
    --accent: #007aff;
    --accent-dark: #0055cc;
    --green: #34c759;

    --bg: #f2f2f7;
    --bg-card: #ffffff;
    --bg-secondary: #f2f2f7;
    --text: #1d1d1f;
    --text-sub: #6c6c70;
    --text-hint: #aeaeb2;
    --sep: rgba(60,60,67,0.12);
    --img-bg: #e8e8ed;

    --shadow: 0 2px 8px rgba(0,0,0,0.07), 0 6px 20px rgba(0,0,0,0.05);
    --shadow-btn: 0 4px 20px rgba(0,122,255,0.4);
    --shadow-modal: 0 -4px 40px rgba(0,0,0,0.12);

    --r-md: 18px;
    --r-lg: 22px;
    --r-pill: 100px;

    --ease: 0.18s cubic-bezier(0.25,0.46,0.45,0.94);
    --spring: 0.3s cubic-bezier(0.34,1.4,0.64,1);
}

@media (prefers-color-scheme: dark) {
    :root {
        --bg: #000;
        --bg-card: #1c1c1e;
        --bg-secondary: #2c2c2e;
        --text: #fff;
        --text-sub: #8e8e93;
        --text-hint: #48484a;
        --sep: rgba(255,255,255,0.1);
        --img-bg: #2c2c2e;
        --shadow: 0 2px 8px rgba(0,0,0,0.45), 0 6px 20px rgba(0,0,0,0.35);
        --shadow-btn: 0 4px 20px rgba(0,122,255,0.48);
        --shadow-modal: 0 -4px 40px rgba(0,0,0,0.55);
    }
}

*,*::before,*::after { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
html { -webkit-text-size-adjust:100%; }

body {
    font-family: var(--font);
    background: var(--tg-theme-bg-color, var(--bg));
    color: var(--tg-theme-text-color, var(--text));
    min-height: 100vh;
    padding-bottom: 100px;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
}

img { display:block; }
button { font-family:var(--font); cursor:pointer; border:none; outline:none; -webkit-appearance:none; background:none; }
textarea { font-family:var(--font); -webkit-appearance:none; }

/* ---- App container ---- */
#app {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px 16px 16px;
}

/* ---- Spinner (initial) ---- */
.loading-spinner {
    width: 32px; height: 32px;
    border: 2.5px solid var(--sep);
    border-top-color: var(--tg-theme-button-color, var(--accent));
    border-radius: 50%;
    animation: spin .7s linear infinite;
    margin: 120px auto;
}

/* ---- Loading state (text) ---- */
.loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding: 90px 20px;
    color: var(--tg-theme-hint-color, var(--text-sub));
    font-size: 15px;
    font-weight: 500;
}
.loading::before {
    content:'';
    width:30px; height:30px;
    border:2.5px solid var(--sep);
    border-top-color: var(--tg-theme-button-color, var(--accent));
    border-radius:50%;
    animation:spin .7s linear infinite;
}

@keyframes spin { to { transform:rotate(360deg); } }
@keyframes fadeUp {
    from { opacity:0; transform:translateY(14px); }
    to   { opacity:1; transform:translateY(0); }
}

/* ---- Empty ---- */
.empty {
    text-align:center;
    padding:80px 24px;
    color: var(--tg-theme-hint-color, var(--text-sub));
    font-size:15px;
    line-height:1.6;
}

/* ---- Header ---- */
.header { padding:6px 0 26px; }
.header h1 {
    font-size:34px;
    font-weight:700;
    letter-spacing:-0.8px;
    line-height:1.1;
    color: var(--tg-theme-text-color, var(--text));
}
.header h1 em {
    font-style:normal;
    background:linear-gradient(130deg,#007aff 0%,#5ac8fa 100%);
    -webkit-background-clip:text;
    background-clip:text;
    -webkit-text-fill-color:transparent;
}

/* ---- Nav bar ---- */
.nav-bar {
    display:flex;
    align-items:center;
    gap:14px;
    padding:6px 0 22px;
}
.back-btn {
    width:36px; height:36px;
    border-radius:50%;
    background: var(--tg-theme-secondary-bg-color, var(--bg-card));
    color: var(--tg-theme-button-color, var(--accent));
    font-size:20px;
    display:flex; align-items:center; justify-content:center;
    box-shadow:var(--shadow);
    flex-shrink:0;
    transition:transform var(--ease), opacity var(--ease);
    line-height:1;
    cursor:pointer;
}
.back-btn:active { transform:scale(0.88); opacity:.7; }
.nav-bar h2 {
    font-size:20px;
    font-weight:600;
    letter-spacing:-0.3px;
    color: var(--tg-theme-text-color, var(--text));
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
}

/* ---- Categories grid ---- */
.categories-grid {
    display:grid;
    grid-template-columns:repeat(2,1fr);
    gap:14px;
}
.category-card {
    background: var(--tg-theme-secondary-bg-color, var(--bg-card));
    border-radius:var(--r-lg);
    padding:22px 14px 18px;
    text-align:center;
    cursor:pointer;
    box-shadow:var(--shadow);
    border:1px solid var(--sep);
    transition:transform var(--spring), box-shadow var(--ease);
    user-select:none;
    -webkit-user-select:none;
    animation:fadeUp .4s cubic-bezier(.25,.46,.45,.94) both;
}
.category-card:nth-child(1){animation-delay:.03s}
.category-card:nth-child(2){animation-delay:.08s}
.category-card:nth-child(3){animation-delay:.13s}
.category-card:nth-child(4){animation-delay:.18s}
.category-card:nth-child(5){animation-delay:.23s}
.category-card:nth-child(6){animation-delay:.28s}
.category-card:nth-child(7){animation-delay:.33s}
.category-card:nth-child(8){animation-delay:.38s}
.category-card:active { transform:scale(0.95); box-shadow:0 1px 4px rgba(0,0,0,.06); }

.category-image {
    width:80px; height:80px;
    margin:0 auto 14px;
    border-radius:50%;
    background:var(--img-bg);
    display:flex; align-items:center; justify-content:center;
    overflow:hidden;
}
.category-image img { width:100%; height:100%; object-fit:cover; }
.category-card h3 {
    font-size:15px;
    font-weight:600;
    letter-spacing:-.1px;
    color: var(--tg-theme-text-color, var(--text));
    line-height:1.35;
}

/* ---- Products list ---- */
.products-list { display:flex; flex-direction:column; gap:16px; }
.product-card {
    background: var(--tg-theme-secondary-bg-color, var(--bg-card));
    border-radius:var(--r-lg);
    overflow:hidden;
    box-shadow:var(--shadow);
    border:1px solid var(--sep);
    transition:transform var(--spring), box-shadow var(--ease);
    user-select:none;
    -webkit-user-select:none;
    animation:fadeUp .4s cubic-bezier(.25,.46,.45,.94) both;
}
.product-card:nth-child(1){animation-delay:.04s}
.product-card:nth-child(2){animation-delay:.10s}
.product-card:nth-child(3){animation-delay:.16s}
.product-card:nth-child(4){animation-delay:.22s}
.product-card:nth-child(5){animation-delay:.28s}
.product-card:active { transform:scale(0.985); box-shadow:0 1px 4px rgba(0,0,0,.06); }

.product-image {
    width:100%;
    aspect-ratio:4/3;
    background:var(--img-bg);
    display:flex; align-items:center; justify-content:center;
    overflow:hidden;
}
.product-image img { width:100%; height:100%; object-fit:contain; padding:12px; }

.product-info { padding:18px 18px 20px; }
.product-title {
    font-size:17px; font-weight:600; letter-spacing:-.2px;
    color: var(--tg-theme-text-color, var(--text));
    margin-bottom:6px; line-height:1.35;
}
.product-price {
    font-size:26px; font-weight:700; letter-spacing:-.6px;
    color: var(--tg-theme-button-color, var(--accent));
    margin-bottom:8px;
}
.product-specs {
    font-size:13px;
    color: var(--tg-theme-hint-color, var(--text-sub));
    margin-bottom:18px; line-height:1.5;
}

/* ---- Buy button ---- */
.buy-btn {
    display:block; width:100%;
    background: var(--tg-theme-button-color, var(--accent));
    color: var(--tg-theme-button-text-color, #fff);
    padding:14px 20px;
    border-radius:var(--r-md);
    font-size:16px; font-weight:600; letter-spacing:-.1px;
    text-align:center; cursor:pointer;
    transition:transform var(--spring), opacity var(--ease);
    border:none;
}
.buy-btn:active { transform:scale(0.97); opacity:.85; }
.buy-btn:disabled { opacity:.5; cursor:default; transform:none; }

/* ---- Fixed bottom button ---- */
.gradient-btn {
    position:fixed;
    bottom:calc(env(safe-area-inset-bottom,0px) + 18px);
    left:50%; transform:translateX(-50%);
    width:calc(100% - 32px); max-width:568px;
    background:linear-gradient(135deg,#007aff 0%,#0055cc 100%);
    color:#fff;
    padding:16px 24px;
    border-radius:var(--r-pill);
    font-size:17px; font-weight:600; letter-spacing:-.2px;
    text-align:center; cursor:pointer;
    box-shadow:var(--shadow-btn);
    z-index:100;
    transition:transform var(--spring), box-shadow var(--ease), opacity var(--ease);
    white-space:nowrap;
    border:none;
}
.gradient-btn:active {
    transform:translateX(-50%) scale(0.97);
    box-shadow:0 2px 8px rgba(0,122,255,.2);
    opacity:.9;
}

/* ---- Modal (bottom sheet) ---- */
.modal {
    position:fixed; inset:0;
    background:rgba(0,0,0,.5);
    backdrop-filter:blur(12px);
    -webkit-backdrop-filter:blur(12px);
    display:flex; align-items:flex-end; justify-content:center;
    z-index:200;
    visibility:hidden; opacity:0;
    transition:opacity var(--ease), visibility var(--ease);
}
.modal.active { visibility:visible; opacity:1; }
.modal.active .modal-content { transform:translateY(0); }

.modal-content {
    background: var(--tg-theme-bg-color, var(--bg-card));
    border-radius:26px 26px 0 0;
    padding:12px 20px calc(env(safe-area-inset-bottom,0px) + 28px);
    width:100%; max-width:600px;
    box-shadow:var(--shadow-modal);
    transform:translateY(80px);
    transition:transform var(--spring);
}
.modal-content::before {
    content:'';
    display:block;
    width:36px; height:4px;
    background:var(--sep);
    border-radius:10px;
    margin:0 auto 20px;
}
.modal-content h3 {
    font-size:20px; font-weight:700; letter-spacing:-.3px;
    color: var(--tg-theme-text-color, var(--text));
    margin-bottom:16px;
}
.modal-content textarea {
    width:100%;
    padding:14px 16px;
    border-radius:12px;
    border:1.5px solid var(--sep);
    background: var(--tg-theme-secondary-bg-color, var(--bg-secondary));
    color: var(--tg-theme-text-color, var(--text));
    font-size:15px; line-height:1.5;
    resize:none; outline:none;
    margin-bottom:14px;
    transition:border-color var(--ease);
    min-height:100px;
}
.modal-content textarea::placeholder { color:var(--text-hint); }
.modal-content textarea:focus { border-color: var(--tg-theme-button-color, var(--accent)); }

.modal-btn {
    display:block; width:100%;
    padding:15px 20px;
    border-radius:var(--r-pill);
    font-size:16px; font-weight:600; letter-spacing:-.1px;
    text-align:center; cursor:pointer; border:none;
    transition:transform var(--spring), opacity var(--ease);
}
.modal-btn:active { transform:scale(0.97); opacity:.85; }

#submitCustomBtn {
    background:linear-gradient(135deg,#007aff,#0055cc);
    color:#fff;
    box-shadow:0 4px 14px rgba(0,122,255,.3);
    margin-bottom:10px;
}
.close-modal {
    background: var(--tg-theme-secondary-bg-color, var(--bg-secondary));
    color: var(--tg-theme-button-color, var(--accent));
}

/* scrollbar */
::-webkit-scrollbar { width:4px; }
::-webkit-scrollbar-track { background:transparent; }
::-webkit-scrollbar-thumb { background:var(--sep); border-radius:4px; }
    </style>
</head>
<body>

    <div id="app">
        <div class="loading-spinner"></div>
    </div>

    <button class="gradient-btn" id="customOrderBtn">Заказать под заказ</button>

    <div id="customModal" class="modal">
        <div class="modal-content">
            <h3>Заказ под заказ</h3>
            <textarea id="customComment" rows="4" placeholder="Напишите, что вы ищете..."></textarea>
            <button id="submitCustomBtn" class="modal-btn">Отправить заявку</button>
            <button id="closeModalBtn" class="modal-btn close-modal">Отмена</button>
        </div>
    </div>

    <script>
// ================================================================
//  app.js — встроен в HTML, Firebase логика без изменений
// ================================================================
const tg = window.Telegram.WebApp;
tg.expand();

const firebaseConfig = {
    apiKey: "AIzaSyCR01An-gdwysrsNfDoPGV0fQ9Zxmk1S4g",
    authDomain: "yablochniy-e5daf.firebaseapp.com",
    projectId: "yablochniy-e5daf",
    storageBucket: "yablochniy-e5daf.firebasestorage.app",
    messagingSenderId: "909418919751",
    appId: "1:909418919751:web:cc3975c0e62b5ae4703e62"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const TELEGRAM_TOKEN = "8754493631:AAH9vZvWTS-SOHwk5Y0y7Rbr6klwmgeSgN0";
const GROUP_CHAT_ID = "-1003850642883";

let user = null;
try { if (tg.initDataUnsafe?.user) user = tg.initDataUnsafe.user; } catch(e) {}

async function sendTelegramNotification(message) {
    if (!GROUP_CHAT_ID) return;
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({chat_id:GROUP_CHAT_ID, text:message})
        });
    } catch(e) { console.error(e); }
}

async function sendOrder(product, btn) {
    const orig = btn.textContent;
    btn.textContent = 'Отправка...';
    btn.disabled = true;
    try {
        const order = {
            userId: user?.id || 0,
            username: user?.username || 'Не указан',
            productName: product.name,
            storage: product.storage || '—',
            color: product.color || '—',
            price: product.price,
            date: new Date().toISOString(),
            type: 'product'
        };
        await db.collection('orders').add(order);
        await sendTelegramNotification(
            `🛍 НОВЫЙ ЗАКАЗ!\n👤 ${order.username}\n📱 ${order.productName}\n💾 ${order.storage}\n🎨 ${order.color}\n💰 ${order.price.toLocaleString()} ₽`
        );
        tg.showAlert('✅ Заявка отправлена!');
        btn.textContent = '✅ Отправлено!';
        btn.style.background = '#34c759';
        setTimeout(() => {
            btn.textContent = orig;
            btn.disabled = false;
            btn.style.background = '';
        }, 2000);
    } catch(e) {
        console.error(e);
        tg.showAlert('❌ Ошибка');
        btn.textContent = orig;
        btn.disabled = false;
    }
}

async function sendCustomOrder(comment) {
    try {
        const order = {
            userId: user?.id || 0,
            username: user?.username || 'Не указан',
            productName: 'Заказ под заказ',
            storage: '—', color: '—', price: 0,
            comment,
            date: new Date().toISOString(),
            type: 'custom'
        };
        await db.collection('orders').add(order);
        await sendTelegramNotification(`📦 ЗАКАЗ ПОД ЗАКАЗ!\n👤 ${order.username}\n📝 ${comment}`);
        tg.showAlert('✅ Заявка принята!');
    } catch(e) { console.error(e); tg.showAlert('❌ Ошибка'); }
}

// ---- Pages ----

async function showCategories() {
    const app = document.getElementById('app');
    app.innerHTML = '<div class="loading">Загрузка...</div>';
    try {
        const snap = await db.collection('categories').orderBy('order').get();
        const cats = [];
        snap.forEach(doc => {
            console.log('📁 Категория:', doc.data().name, 'ID документа:', doc.id);
            cats.push({ id: doc.id, ...doc.data() });
        });

        if (!cats.length) {
            app.innerHTML = '<div class="empty">Категории пока не добавлены</div>';
            return;
        }

        app.innerHTML = `
            <div class="header"><h1><em>Яблочный</em></h1></div>
            <div class="categories-grid" id="grid"></div>
        `;
        const grid = document.getElementById('grid');
        cats.forEach(cat => {
            const el = document.createElement('div');
            el.className = 'category-card';
            el.innerHTML = `
                <div class="category-image">
                    <img src="${cat.image || 'https://placehold.co/200x200?text=?'}" alt="${cat.name}" loading="lazy">
                </div>
                <h3>${cat.name}</h3>
            `;
            el.onclick = () => showProducts(cat.id, cat.name);
            grid.appendChild(el);
        });
    } catch(e) {
        console.error(e);
        document.getElementById('app').innerHTML = '<div class="empty">Ошибка загрузки</div>';
    }
}

// ========== ДИАГНОСТИЧЕСКАЯ ФУНКЦИЯ showProducts ==========
async function showProducts(categoryId, categoryName) {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="nav-bar">
            <button class="back-btn" onclick="showCategories()">←</button>
            <h2>${categoryName}</h2>
        </div>
        <div class="loading">Диагностика...</div>
    `;
    try {
        console.log('🔍 1. categoryId (входной параметр):', categoryId);
        
        // Получаем документ категории
        const catDoc = await db.collection('categories').doc(categoryId).get();
        if (!catDoc.exists) {
            console.error('❌ Категория с ID', categoryId, 'не найдена');
            app.innerHTML = `<div class="empty">Ошибка: категория не найдена (ID: ${categoryId})</div>`;
            return;
        }
        const catData = catDoc.data();
        console.log('🏷 2. Данные категории:', catData);
        
        // Смотрим, какие товары есть в базе и какие у них categoryId
        const allProducts = await db.collection('products').get();
        console.log('📦 3. Все товары в базе:');
        allProducts.forEach(doc => {
            console.log('   -', doc.data().name, 'categoryId =', doc.data().categoryId, 'тип:', typeof doc.data().categoryId);
        });
        
        // Пробуем найти товары с нужным categoryId
        const targetId = catData.id; // поле id из категории
        console.log('🎯 4. Ищем товары с categoryId =', targetId);
        
        const snap = await db.collection('products').where('categoryId', '==', targetId).get();
        console.log('✅ 5. Найдено товаров:', snap.size);
        
        const products = [];
        snap.forEach(doc => products.push({ id: doc.id, ...doc.data() }));

        if (!products.length) {
            app.innerHTML = `
                <div class="nav-bar">
                    <button class="back-btn" onclick="showCategories()">←</button>
                    <h2>${categoryName}</h2>
                </div>
                <div class="empty">В этой категории пока нет товаров (ищем по id: ${targetId})</div>
            `;
            return;
        }

        // Если нашли — показываем
        app.innerHTML = `
            <div class="nav-bar">
                <button class="back-btn" onclick="showCategories()">←</button>
                <h2>${categoryName}</h2>
            </div>
            <div class="products-list" id="list"></div>
        `;
        const list = document.getElementById('list');

        products.forEach(p => {
            const specs = [
                p.storage && p.storage !== '—' ? `Память: ${p.storage}` : '',
                p.color   && p.color   !== '—' ? `Цвет: ${p.color}`   : ''
            ].filter(Boolean).join(' · ');

            const el = document.createElement('div');
            el.className = 'product-card';
            el.innerHTML = `
                <div class="product-image">
                    <img src="${p.image || 'https://placehold.co/400x300?text=No+Image'}" alt="${p.name}" loading="lazy">
                </div>
                <div class="product-info">
                    <div class="product-title">${p.name}</div>
                    <div class="product-price">${(p.price||0).toLocaleString()} ₽</div>
                    ${specs ? `<div class="product-specs">${specs}</div>` : ''}
                    <button class="buy-btn">Купить</button>
                </div>
            `;
            el.querySelector('.buy-btn').addEventListener('click', function() {
                sendOrder(p, this);
            });
            list.appendChild(el);
        });

    } catch(e) {
        console.error(e);
        document.getElementById('app').innerHTML = `
            <div class="nav-bar">
                <button class="back-btn" onclick="showCategories()">←</button>
                <h2>${categoryName}</h2>
            </div>
            <div class="empty">Ошибка: ${e.message}</div>
        `;
    }
}

window.showCategories = showCategories;
window.showProducts   = showProducts;

// ---- Modal ----
const modal = document.getElementById('customModal');
document.getElementById('customOrderBtn').onclick  = () => modal.classList.add('active');
document.getElementById('closeModalBtn').onclick   = () => modal.classList.remove('active');
document.getElementById('submitCustomBtn').onclick = async () => {
    const txt = document.getElementById('customComment').value.trim();
    if (!txt) { tg.showAlert('Напишите, что вы ищете'); return; }
    await sendCustomOrder(txt);
    modal.classList.remove('active');
    document.getElementById('customComment').value = '';
};

showCategories();
    </script>
</body>
</html>
