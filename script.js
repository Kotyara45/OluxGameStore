const APP_CONFIG = {
    SUPABASE_URL: 'https://yoxieszknznklpvnyvui.supabase.co',
    SUPABASE_KEY: 'sb_publishable_ZLbve8ADHIqc48h2YOQQUw_z8vox0s9',
    OWNER_EMAIL: 'nazarivanyuk562@gmail.com',
    PAYMENT_LINK: 'https://donatello.to/OluxGameStore'
};

const sb = supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_KEY);

const Store = {
    user: null,
    cart: JSON.parse(localStorage.getItem('olux_cart')) || [],
    isAdmin: false
};

document.addEventListener('DOMContentLoaded', async () => {
    applyFinalUI(); 
    await checkAuth();
    initApp();
    renderCart();
    initFilters();
});

function applyFinalUI() {
    const s = document.createElement('style');
    s.innerHTML = `
        /* Повне видалення білих полос */
        body, header, .filters, main, section, footer, .container { 
            background: #000000 !important; 
            background-color: #000000 !important;
            color: #ffffff !important;
            border: none !important;
        }

        /* Назва магазину */
        .logo, .logo a { color: #ffffff !important; font-weight: 900; text-transform: uppercase; }

        /* БІЛІ ФІЛЬТРИ */
        .filter-btn { 
            border: 1px solid #ffffff !important; 
            color: #ffffff !important; 
            background: transparent !important;
            padding: 10px 20px;
            cursor: pointer;
            border-radius: 5px;
            transition: 0.3s;
        }
        .filter-btn.active, .filter-btn:hover { background: #fff !important; color: #000 !important; }

        /* РОЗМІР ЗОБРАЖЕНЬ ІГОР */
        .game-card { 
            background: #0a0a0a !important; 
            border: 1px solid #1a1a1a !important; 
            height: auto !important;
        }
        .game-card img { 
            width: 100% !important; 
            height: 350px !important; /* ВЕЛИКИЙ РОЗМІР */
            object-fit: cover !important; 
        }

        /* МОДАЛЬНЕ ВІКНО ДЕТАЛЕЙ */
        .modal-content { 
            background: #080808 !important; 
            border: 1px solid #ffffff !important; 
            border-radius: 15px;
            max-width: 900px !important;
        }
        
        /* Кнопка вийти */
        #logout-btn { background: #ff4757 !important; color: white !important; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; }
        
        /* Кошик */
        #cart-sidebar { background: #000 !important; border-left: 1px solid #fff !important; }
    `;
    document.head.appendChild(s);
}

async function checkAuth() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
        Store.user = session.user;
        const { data } = await sb.from('admin_status').select('role').eq('user_email', Store.user.email).maybeSingle();
        if (Store.user.email === APP_CONFIG.OWNER_EMAIL || (data && data.role === 'admin')) {
            Store.isAdmin = true;
        }
    }
}

function initApp() {
    const adminBtn = document.getElementById('admin-panel-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const authSect = document.getElementById('auth-section');

    if (Store.user) {
        if (authSect) authSect.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (Store.isAdmin && adminBtn) {
            adminBtn.style.display = 'block';
            adminBtn.onclick = openAdminPanel;
        }
    }
}

window.openAdminPanel = function() {
    const modal = document.getElementById('details-modal');
    const content = document.getElementById('modal-data');
    
    content.innerHTML = `
        <div style="padding:30px; background:#000; color:#fff;">
            <h2 style="border-bottom: 1px solid #fff;">АДМІН-ПАНЕЛЬ</h2>
            <div style="margin: 20px 0; display:flex; gap:10px;">
                <button onclick="adminLoad('orders')" class="filter-btn">ЗАМОВЛЕННЯ</button>
                <button onclick="adminLoad('add')" class="filter-btn">ДОДАТИ ГРУ</button>
            </div>
            <div id="admin-content" style="min-height:200px; border:1px dashed #333; padding:10px;">
                Оберіть розділ
            </div>
        </div>
    `;
    modal.classList.add('active');
    document.getElementById('overlay').classList.add('active');
};

window.adminLoad = async function(type) {
    const area = document.getElementById('admin-content');
    if (type === 'orders') {
        const { data } = await sb.from('orders').select('*');
        area.innerHTML = data.map(o => `<div style="font-size:12px; margin-bottom:5px; border-bottom:1px solid #222;">${o.items} - ${o.total_price}грн</div>`).join('');
    } else {
        area.innerHTML = `<input id="n-t" placeholder="Назва"><button onclick="alert('Додано')">Зберегти</button>`;
    }
};

window.processCheckout = function() {
    if (Store.cart.length === 0) return alert("Кошик порожній!");
    const total = Store.cart.reduce((s, i) => s + i.price, 0);
    
    if (confirm(`Сума: ${total} грн. Перейти до оплати на Donatello?`)) {
        window.location.href = APP_CONFIG.PAYMENT_LINK; 
    }
};

window.openDetails = function(btn) {
    const d = btn.closest('.game-card').dataset;
    const modal = document.getElementById('details-modal');
    const content = document.getElementById('modal-data');
    
    content.innerHTML = `
        <div style="display:flex; flex-wrap:wrap; background:#000;">
            <div style="flex:1; min-width:300px;">
                <img src="${d.img}" style="width:100%; height:450px; object-fit:cover;">
            </div>
            <div style="flex:1; padding:30px;">
                <h2 style="font-size:30px; margin:0;">${d.title}</h2>
                <div style="color:#888; margin:10px 0;">Автор: ${d.author || 'Olux'} | Рік: ${d.year || '2024'}</div>
                <div style="color:#f1c40f; font-size:25px; font-weight:bold;">${d.price} грн</div>
                <p style="color:#ccc; margin:20px 0;">${d.desc}</p>
                <div style="background:#111; padding:15px; border-radius:5px; font-size:13px; border-left:3px solid red;">
                    <b>Вимоги:</b><br>${d.specs}
                </div>
                <button onclick="addToCartFromModal('${d.title}', ${d.price}, '${d.img}')" 
                        style="width:100%; margin-top:20px; padding:15px; background:red; color:white; border:none; font-weight:bold; cursor:pointer;">
                        ДОДАТИ В КОШИК
                </button>
            </div>
        </div>
    `;
    modal.classList.add('active');
    document.getElementById('overlay').classList.add('active');
};

window.addToCart = function(btn) {
    const card = btn.closest('.game-card');
    const item = { title: card.dataset.title, price: parseInt(card.dataset.price), img: card.dataset.img };
    if (Store.cart.find(i => i.title === item.title)) return;
    Store.cart.push(item);
    saveCart();
    renderCart();
};

function saveCart() {
    localStorage.setItem('olux_cart', JSON.stringify(Store.cart));
    document.getElementById('cart-count').innerText = Store.cart.length;
}

function renderCart() {
    const container = document.getElementById('cart-items');
    if (!container) return;
    container.innerHTML = Store.cart.map((item, idx) => `
        <div style="display:flex; align-items:center; padding:10px; border-bottom:1px solid #222;">
            <img src="${item.img}" width="40" height="50" style="object-fit:cover; margin-right:10px;">
            <div style="flex:1; font-size:13px;">${item.title}</div>
            <button onclick="removeFromCart(${idx})" style="background:none; border:none; color:red; cursor:pointer;">&times;</button>
        </div>
    `).join('');
    document.getElementById('cart-total').innerText = Store.cart.reduce((s, i) => s + i.price, 0);
}

window.removeFromCart = function(idx) {
    Store.cart.splice(idx, 1);
    saveCart();
    renderCart();
};

window.toggleCart = function() {
    document.getElementById('cart-sidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
};

window.closeModal = function() {
    document.querySelectorAll('.modal, .sidebar').forEach(m => m.classList.remove('active'));
    document.getElementById('overlay').classList.remove('active');
    if (document.getElementById('auth-modal')) document.getElementById('auth-modal').style.display = 'none';
};

function initFilters() {
    const btns = document.querySelectorAll('.filter-btn');
    const cards = document.querySelectorAll('.game-card');
    btns.forEach(b => {
        b.addEventListener('click', () => {
            btns.forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            const g = b.dataset.genre;
            cards.forEach(c => c.style.display = (g === 'all' || c.dataset.genre === g) ? 'flex' : 'none');
        });
    });
}

window.addToCartFromModal = function(t, p, i) {
    if (Store.cart.find(item => item.title === t)) return;
    Store.cart.push({ title: t, price: p, img: i });
    saveCart();
    renderCart();
    closeModal();
    toggleCart();
};
