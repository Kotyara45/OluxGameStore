const APP_CONFIG = {
    SUPABASE_URL: 'https://yoxieszknznklpvnyvui.supabase.co',
    SUPABASE_KEY: 'sb_publishable_ZLbve8ADHIqc48h2YOQQUw_z8vox0s9',
    OWNER_EMAIL: 'nazarivanyuk562@gmail.com',
    PAYMENT_LINK: 'https://donatello.to/OluxGameStore'
};

const sb = supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_KEY);

const Store = {
    user: null,
    cart: JSON.parse(localStorage.getItem('olux_cart')) || []
};

document.addEventListener('DOMContentLoaded', async () => {
    fixLayoutStyles();
    await checkAuthSession();
    initializeAppUI();
    renderCart();
    initFilters();
});

function fixLayoutStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* Глибокий чорний фон для всього сайту */
        body, header, .filters, main, section, footer { 
            background-color: #000000 !important; 
            background: #000000 !important;
            border: none !important;
        }

        /* Біла назва магазину */
        .logo, .logo a { color: #ffffff !important; font-weight: 900; text-transform: uppercase; }

        /* БІЛІ КНОПКИ ЖАНРІВ */
        .filter-btn { 
            border: 1px solid #ffffff !important; 
            color: #ffffff !important; 
            background: transparent !important; 
            border-radius: 5px; 
            padding: 8px 20px; 
            margin: 5px;
            cursor: pointer;
            transition: 0.3s;
        }
        .filter-btn.active, .filter-btn:hover { 
            background: #ffffff !important; 
            color: #000000 !important; 
        }

        /* ЗБІЛЬШЕННЯ РОЗМІРУ ФОТО ІГОР */
        .game-card { 
            background: #0a0a0a !important; 
            border: 1px solid #222 !important; 
            padding: 0 !important; 
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .game-card img { 
            width: 100% !important; 
            height: 320px !important; /* Значно збільшена висота фото */
            object-fit: cover !important; 
            display: block;
        }
        .game-card-info { padding: 15px; }

        /* ФІКС КНОПКИ ВИЙТИ */
        #logout-btn {
            background: #e74c3c !important;
            border: none !important;
            color: white !important;
            padding: 6px 15px !important;
            border-radius: 4px;
            font-weight: bold;
        }

        /* КОШИК З БІЛИМ КОНТУРОМ */
        #cart-sidebar { 
            background: #000000 !important; 
            border-left: 1px solid #ffffff !important; 
        }
        .cart-header { border-bottom: 1px solid #333; padding-bottom: 10px; }
    `;
    document.head.appendChild(style);
}

async function checkAuthSession() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) Store.user = session.user;
}

function initializeAppUI() {
    const authBtn = document.getElementById('auth-section');
    const logoutBtn = document.getElementById('logout-btn');
    const adminBtn = document.getElementById('admin-panel-btn');

    const supportBtn = document.getElementById('support-btn');
    if (supportBtn) supportBtn.remove();

    if (Store.user) {
        if (authBtn) authBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';

        checkAdminAccess(adminBtn);
    }
}

async function checkAdminAccess(btn) {
    const { data } = await sb.from('admin_status').select('role').eq('user_email', Store.user.email).maybeSingle();
    if (Store.user.email === APP_CONFIG.OWNER_EMAIL || (data && data.role === 'admin')) {
        if (btn) btn.style.display = 'block';
    }
}

window.openDetails = function(btn) {
    const d = btn.closest('.game-card').dataset;
    const modal = document.getElementById('details-modal');
    const content = document.getElementById('modal-data');
    
    content.innerHTML = `
        <div style="display:flex; flex-wrap:wrap; background:#000; color:#fff;">
            <div style="flex:1; min-width:300px;">
                <img src="${d.img}" style="width:100%; height:450px; object-fit:cover;">
            </div>
            <div style="flex:1.2; padding:30px; position:relative;">
                <span onclick="closeModal()" style="position:absolute; top:10px; right:15px; cursor:pointer; font-size:30px;">&times;</span>
                <h2 style="font-size:28px; color:#fff;">${d.title}</h2>
                <div style="margin: 10px 0; font-size:14px; color:#888;">
                    <span>АВТОР: <b>${d.author || 'Rockstar Games'}</b></span> | 
                    <span>РІК: <b>${d.year || '2019'}</b></span>
                </div>
                <div style="color:#f1c40f; font-size:24px; font-weight:bold; margin:15px 0;">${d.price} грн</div>
                <p style="color:#bbb; line-height:1.5;">${d.desc}</p>
                <div style="background:#111; padding:15px; border-radius:8px; border:1px solid #333; margin:20px 0;">
                    <strong style="color:#e74c3c; font-size:11px;">СИСТЕМНІ ВИМОГИ:</strong><br>
                    <span style="font-size:13px;">${d.specs}</span>
                </div>
                <button onclick="addToCartFromModal('${d.title}', ${d.price}, '${d.img}')" 
                        style="width:100%; padding:15px; background:#e74c3c; border:none; color:#fff; font-weight:bold; cursor:pointer; border-radius:5px;">
                        ДОДАТИ В КОШИК
                </button>
            </div>
        </div>
    `;
    modal.classList.add('active');
    document.getElementById('overlay').classList.add('active');
};

window.processCheckout = function() {
    if (Store.cart.length === 0) return alert("Кошик порожній!");
    const total = Store.cart.reduce((s, i) => s + i.price, 0);
    if (confirm(`Разом до оплати: ${total} грн. Перейти до оплати?`)) {
        window.open(APP_CONFIG.PAYMENT_LINK, '_blank');
    }
};

window.addToCart = function(btn) {
    const card = btn.closest('.game-card');
    const item = { title: card.dataset.title, price: parseInt(card.dataset.price), img: card.dataset.img };
    if (Store.cart.find(i => i.title === item.title)) return;
    Store.cart.push(item);
    saveCart();
    renderCart();
    btn.innerText = "В КОШИКУ";
    btn.style.background = "#333";
};

function saveCart() {
    localStorage.setItem('olux_cart', JSON.stringify(Store.cart));
    document.getElementById('cart-count').innerText = Store.cart.length;
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    if (!container) return;
    
    if (Store.cart.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px; opacity:0.5;">Кошик порожній</p>';
        totalEl.innerText = "0";
        return;
    }

    let total = 0;
    container.innerHTML = Store.cart.map((item, idx) => {
        total += item.price;
        return `
            <div style="display:flex; align-items:center; border-bottom:1px solid #222; padding:10px 0;">
                <img src="${item.img}" style="width:50px; height:50px; object-fit:cover; border-radius:4px; margin-right:10px;">
                <div style="flex:1;">
                    <div style="font-weight:bold; font-size:13px;">${item.title}</div>
                    <div style="color:#f1c40f; font-size:12px;">${item.price} грн</div>
                </div>
                <button onclick="removeFromCart(${idx})" style="background:none; border:none; color:red; cursor:pointer;">&times;</button>
            </div>`;
    }).join('');
    totalEl.innerText = total;
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
    const auth = document.getElementById('auth-modal');
    if (auth) auth.style.display = 'none';
};

function initFilters() {
    const btns = document.querySelectorAll('.filter-btn');
    const cards = document.querySelectorAll('.game-card');
    btns.forEach(b => {
        b.addEventListener('click', () => {
            btns.forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            const g = b.dataset.genre;
            cards.forEach(c => {
                c.style.display = (g === 'all' || c.dataset.genre === g) ? 'flex' : 'none';
            });
        });
    });
}

window.toggleAuthModal = function() {
    document.getElementById('auth-modal').style.display = 'block';
    document.getElementById('overlay').classList.add('active');
};

window.addToCartFromModal = function(t, p, i) {
    if (Store.cart.find(item => item.title === t)) return alert("Вже у кошику");
    Store.cart.push({ title: t, price: p, img: i });
    saveCart();
    renderCart();
    closeModal();
    toggleCart();
};
