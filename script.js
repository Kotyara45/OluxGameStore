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
    applyGlobalStyles(); 
    await checkAuthSession();
    initializeAppUI();
    renderCart();
    initFilters();
});

function applyGlobalStyles() {
    document.body.style.backgroundColor = "#000000";
    document.body.style.color = "#ffffff";
    
    const style = document.createElement('style');
    style.innerHTML = `
        .logo { color: #ffffff !important; font-weight: 800; font-size: 24px; text-transform: uppercase; }
        .filter-btn { border: 1px solid #ffffff !important; color: #ffffff !important; background: transparent; border-radius: 20px; padding: 8px 20px; transition: 0.3s; }
        .filter-btn.active, .filter-btn:hover { background: #ffffff !important; color: #000000 !important; }
        
        #cart-sidebar { background: #0a0a0a !important; border-left: 1px solid #ffffff !important; }
        .cart-item { border-bottom: 1px solid #333; padding: 15px 0; display: flex; align-items: center; }
        
        .game-card { background: #111 !important; border-radius: 15px; overflow: hidden; transition: 0.3s; border: 1px solid #222; }
        .game-card:hover { transform: translateY(-5px); border-color: #e74c3c; }
        .game-card img { width: 100%; height: 280px; object-fit: cover; } /* Збільшені ави */
        
        #logout-btn { 
            background: transparent !important; 
            border: 1px solid #ff4d4d !important; 
            color: #ff4d4d !important; 
            padding: 5px 15px; 
            border-radius: 5px; 
            cursor: pointer;
            font-size: 14px;
        }
        #logout-btn:hover { background: #ff4d4d !important; color: #fff !important; }

        .modal-content { background: #0a0a0a !important; border: 1px solid #ffffff !important; border-radius: 20px; overflow: hidden; }
        .info-label { color: #888; font-size: 12px; text-transform: uppercase; margin-right: 5px; }
        .info-value { color: #fff; font-weight: bold; margin-right: 15px; }
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
    
    // Видаляємо кнопку допомоги з DOM
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
        <div style="display:flex; flex-wrap:wrap;">
            <div style="flex:1; min-width:300px;">
                <img src="${d.img}" style="width:100%; height:100%; object-fit:cover;">
            </div>
            <div style="flex:1.2; padding:40px; position:relative;">
                <span onclick="closeModal()" style="position:absolute; top:20px; right:20px; cursor:pointer; font-size:30px;">&times;</span>
                <h2 style="font-size:32px; margin-bottom:10px;">${d.title}</h2>
                
                <div style="margin-bottom:20px; display:flex;">
                    <span class="info-label">Автор:</span> <span class="info-value">${d.author || 'Rockstar Games'}</span>
                    <span class="info-label">Рік:</span> <span class="info-value">${d.year || '2019'}</span>
                </div>

                <div style="color:#f1c40f; font-size:28px; font-weight:bold; margin-bottom:20px;">${d.price} грн</div>
                
                <p style="color:#ccc; line-height:1.6; margin-bottom:25px;">${d.desc}</p>
                
                <div style="background:#1a1a1a; padding:15px; border-radius:10px; border-left:4px solid #e74c3c; margin-bottom:25px;">
                    <strong style="font-size:11px; color:#e74c3c;">СИСТЕМНІ ВИМОГИ:</strong><br>
                    <span style="font-size:13px; color:#eee;">${d.specs}</span>
                </div>
                
                <button onclick="addToCartFromModal('${d.title}', ${d.price}, '${d.img}')" 
                        style="width:100%; padding:18px; background:#e74c3c; border:none; color:#fff; font-weight:bold; border-radius:10px; cursor:pointer;">
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
    if (confirm(`Сума до сплати: ${total} грн. Перейти до оплати на Donatello?`)) {
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
    btn.innerText = "У КОШИКУ";
    btn.style.background = "#222";
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
        container.innerHTML = '<p style="text-align:center; opacity:0.5; margin-top:50px;">Ваш кошик чекає на ігри...</p>';
        totalEl.innerText = "0";
        return;
    }

    let total = 0;
    container.innerHTML = Store.cart.map((item, idx) => {
        total += item.price;
        return `
            <div class="cart-item">
                <img src="${item.img}" style="width:60px; height:60px; object-fit:cover; border-radius:5px; margin-right:15px; border:1px solid #333;">
                <div style="flex:1;">
                    <div style="font-weight:bold; font-size:14px;">${item.title}</div>
                    <div style="color:#f1c40f;">${item.price} грн</div>
                </div>
                <button onclick="removeFromCart(${idx})" style="background:none; border:none; color:#ff4d4d; font-size:20px; cursor:pointer;">&times;</button>
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
