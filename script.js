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
    injectAdvancedStyles(); 
    await checkAuthSession();
    initializeAppUI();
    renderCart();
    initFilters();
    bindGlobalEvents();
});

function injectAdvancedStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* Глибокий чорний фон без смуг */
        body, header, main, section, footer, .filters, .container { 
            background-color: #000000 !important; 
            background: #000000 !important;
            color: #ffffff !important;
            border: none !important;
        }

        /* Біла назва магазину */
        .logo, .logo a { 
            color: #ffffff !important; 
            font-size: 26px; 
            font-weight: 900; 
            text-decoration: none;
            letter-spacing: 1px;
        }

        /* Білі фільтри */
        .filter-btn { 
            border: 1px solid #ffffff !important; 
            color: #ffffff !important; 
            background: transparent !important; 
            border-radius: 4px; 
            padding: 10px 22px; 
            font-weight: 600;
            cursor: pointer;
            transition: 0.3s ease;
        }
        .filter-btn.active, .filter-btn:hover { 
            background: #ffffff !important; 
            color: #000000 !important; 
        }

        /* РОЗМІРИ ЗОБРАЖЕНЬ ІГОР (CSS FIX) */
        .game-card { 
            background: #0a0a0a !important; 
            border: 1px solid #1a1a1a !important; 
            transition: 0.3s;
            display: flex;
            flex-direction: column;
            height: 100%;
        }
        .game-card:hover { border-color: #ffffff; }
        
        .game-card img { 
            width: 100% !important; 
            height: 350px !important; /* Фіксована велика висота */
            object-fit: cover !important; 
            border-bottom: 1px solid #1a1a1a;
        }

        /* Кнопка Вийти */
        #logout-btn {
            background: #e74c3c !important;
            color: #fff !important;
            border: none !important;
            padding: 8px 18px !important;
            border-radius: 4px;
            font-weight: bold;
            cursor: pointer;
        }

        /* Кошик з білим контуром */
        #cart-sidebar { 
            background: #000000 !important; 
            border-left: 2px solid #ffffff !important; 
            box-shadow: -5px 0 20px rgba(255,255,255,0.05);
        }

        /* Модальне вікно */
        .modal-content { 
            background: #050505 !important; 
            border: 1px solid #ffffff !important; 
            color: #ffffff;
        }
    `;
    document.head.appendChild(style);
}

async function checkAuthSession() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
        Store.user = session.user;
        const { data } = await sb.from('admin_status')
            .select('role')
            .eq('user_email', Store.user.email)
            .maybeSingle();

        if (Store.user.email === APP_CONFIG.OWNER_EMAIL || (data && data.role === 'admin')) {
            Store.isAdmin = true;
        }
    }
}

function initializeAppUI() {
    const authSect = document.getElementById('auth-section');
    const logoutBtn = document.getElementById('logout-btn');
    const adminBtn = document.getElementById('admin-panel-btn');
    
    const supportBtn = document.getElementById('support-btn');
    if (supportBtn) supportBtn.remove();

    if (Store.user) {
        if (authSect) authSect.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (Store.isAdmin && adminBtn) adminBtn.style.display = 'block';
    }
}

window.openAdminPanel = async function() {
    if (!Store.isAdmin) return alert("Доступ заборонено");
    
    const modal = document.getElementById('details-modal');
    const content = document.getElementById('modal-data');
    
    content.innerHTML = `
        <div style="padding:40px; background:#000;">
            <h2 style="color:#fff; border-bottom:1px solid #fff; padding-bottom:10px;">АДМІН ПАНЕЛЬ OLUX</h2>
            <div style="display:flex; gap:10px; margin:20px 0;">
                <button onclick="showAdminTab('orders')" class="filter-btn">ЗАМОВЛЕННЯ</button>
                <button onclick="showAdminTab('add-game')" class="filter-btn">ДОДАТИ ГРУ</button>
                <button onclick="closeModal()" class="filter-btn" style="border-color:red; color:red;">ЗАКРИТИ</button>
            </div>
            <div id="admin-view-area" style="margin-top:20px;">
                <p>Виберіть розділ для керування.</p>
            </div>
        </div>
    `;
    modal.classList.add('active');
    document.getElementById('overlay').classList.add('active');
};

window.showAdminTab = async function(tab) {
    const area = document.getElementById('admin-view-area');
    if (tab === 'orders') {
        area.innerHTML = "<p>Завантаження замовлень...</p>";
        const { data } = await sb.from('orders').select('*').order('created_at', { ascending: false });
        area.innerHTML = data.length ? data.map(o => `
            <div style="border:1px solid #333; padding:10px; margin-bottom:5px; font-size:12px;">
                <b>ID:</b> ${o.id.slice(0,8)} | <b>Email:</b> ${o.user_email || 'Гість'} <br>
                <b>Товари:</b> ${o.items} | <b>Сума:</b> ${o.total_price} грн
            </div>
        `).join('') : "Замовлень немає.";
    } else if (tab === 'add-game') {
        area.innerHTML = `
            <div style="display:grid; gap:10px;">
                <input id="new-t" placeholder="Назва" style="padding:8px; background:#111; border:1px solid #fff; color:#fff;">
                <input id="new-p" placeholder="Ціна" style="padding:8px; background:#111; border:1px solid #fff; color:#fff;">
                <input id="new-i" placeholder="URL Фото" style="padding:8px; background:#111; border:1px solid #fff; color:#fff;">
                <button onclick="saveNewGame()" style="background:#fff; color:#000; border:none; padding:10px; font-weight:bold; cursor:pointer;">ЗБЕРЕГТИ</button>
            </div>
        `;
    }
};

window.processCheckout = function() {
    if (Store.cart.length === 0) return alert("Кошик порожній!");
    
    const total = Store.cart.reduce((sum, item) => sum + item.price, 0);
    const titles = Store.cart.map(i => i.title).join(', ');
    
    console.log("Оформлення замовлення:", titles, "на суму:", total);

    if (confirm(`Підтвердити замовлення на суму ${total} грн?\nПісля підтвердження відкриється сторінка оплати Donatello.`)) {
        window.open(APP_CONFIG.PAYMENT_LINK, '_blank');
        
        if (Store.user) {
            sb.from('orders').insert([{
                user_id: Store.user.id,
                user_email: Store.user.email,
                items: titles,
                total_price: total,
                status: 'redirected_to_payment'
            }]).then(() => console.log("Замовлення зареєстровано"));
        }
    }
};

window.openDetails = function(btn) {
    const d = btn.closest('.game-card').dataset;
    const modal = document.getElementById('details-modal');
    const content = document.getElementById('modal-data');
    
    content.innerHTML = `
        <div style="display:flex; flex-wrap:wrap; background:#000;">
            <div style="flex:1; min-width:300px;">
                <img src="${d.img}" style="width:100%; height:100%; object-fit:cover;">
            </div>
            <div style="flex:1.2; padding:40px; position:relative;">
                <span onclick="closeModal()" style="position:absolute; top:15px; right:20px; cursor:pointer; font-size:32px; color:#fff;">&times;</span>
                <h2 style="font-size:35px; color:#fff; margin:0;">${d.title}</h2>
                <div style="margin: 15px 0; color:#888; font-size:14px;">
                    АВТОР: <b style="color:#fff;">${d.author || 'Не вказано'}</b> | 
                    РІК: <b style="color:#fff;">${d.year || '2023'}</b>
                </div>
                <div style="font-size:30px; color:#f1c40f; font-weight:900; margin:20px 0;">${d.price} грн</div>
                <p style="color:#ccc; line-height:1.7; font-size:15px;">${d.desc}</p>
                <div style="background:#111; padding:20px; border-radius:8px; border:1px solid #333; margin:25px 0;">
                    <span style="color:#e74c3c; font-size:12px; font-weight:bold; text-transform:uppercase;">Системні вимоги:</span><br>
                    <p style="font-size:13px; margin:10px 0 0 0; color:#fff;">${d.specs}</p>
                </div>
                <button onclick="addToCartFromModal('${d.title}', ${d.price}, '${d.img}')" 
                        style="width:100%; padding:20px; background:#e74c3c; border:none; color:#fff; font-weight:bold; border-radius:5px; cursor:pointer; font-size:16px;">
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
    const item = { 
        title: card.dataset.title, 
        price: parseInt(card.dataset.price), 
        img: card.dataset.img 
    };
    if (Store.cart.find(i => i.title === item.title)) return;
    Store.cart.push(item);
    saveCart();
    renderCart();
    btn.innerText = "У КОШИКУ";
    btn.style.background = "#222";
};

function saveCart() {
    localStorage.setItem('olux_cart', JSON.stringify(Store.cart));
    const badge = document.getElementById('cart-count');
    if (badge) badge.innerText = Store.cart.length;
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    if (!container) return;
    
    if (Store.cart.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:50px; opacity:0.3;">Кошик порожній</div>';
        if (totalEl) totalEl.innerText = "0";
        return;
    }

    let total = 0;
    container.innerHTML = Store.cart.map((item, idx) => {
        total += item.price;
        return `
            <div style="display:flex; align-items:center; padding:15px 0; border-bottom:1px solid #1a1a1a;">
                <img src="${item.img}" style="width:50px; height:60px; object-fit:cover; border-radius:4px; margin-right:15px; border:1px solid #333;">
                <div style="flex:1;">
                    <div style="font-weight:bold; font-size:14px; color:#fff;">${item.title}</div>
                    <div style="color:#f1c40f; font-size:13px;">${item.price} грн</div>
                </div>
                <button onclick="removeFromCart(${idx})" style="background:none; border:none; color:#ff4d4d; font-size:20px; cursor:pointer;">&times;</button>
            </div>`;
    }).join('');
    if (totalEl) totalEl.innerText = total;
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

function bindGlobalEvents() {
    document.getElementById('overlay').addEventListener('click', closeModal);
    window.addEventListener('keydown', (e) => { if (e.key === "Escape") closeModal(); });
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

window.signOut = async function() {
    await sb.auth.signOut();
    localStorage.removeItem('olux_cart');
    location.reload();
};
