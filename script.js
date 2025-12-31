const APP_CONFIG = {
    SUPABASE_URL: 'https://yoxieszknznklpvnyvui.supabase.co',
    SUPABASE_KEY: 'sb_publishable_ZLbve8ADHIqc48h2YOQQUw_z8vox0s9',
    OWNER_EMAIL: 'nazarivanyuk562@gmail.com',
    PAYMENT_LINK: 'https://www.donatello.to/OluxGameStore',
    CURRENCY: 'грн'
};

const sb = supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_KEY);

const Store = {
    user: null,
    profile: null,
    cart: JSON.parse(localStorage.getItem('olux_cart')) || [],
    isModalOpen: false,
    activeFilter: 'all',
    wishlist: JSON.parse(localStorage.getItem('olux_wishlist')) || []
};

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuthSession();
    initializeAppUI();
    bindGlobalEvents();
    syncCartWithUI();
    initFilters();
    setupSearch();
    loadAnalytics();
});

async function checkAuthSession() {
    try {
        const { data: { session }, error } = await sb.auth.getSession();
        if (error) throw error;
        if (session) {
            Store.user = session.user;
            await fetchUserProfile();
        }
    } catch (err) {
        console.error(err.message);
    }
}

async function fetchUserProfile() {
    if (!Store.user) return;
    const { data, error } = await sb.from('profiles').select('*').eq('id', Store.user.id).maybeSingle();
    if (!error && data) Store.profile = data;
}

function initializeAppUI() {
    const authSect = document.getElementById('auth-section');
    const logoutBtn = document.getElementById('logout-btn');
    const adminBtn = document.getElementById('admin-panel-btn');
    const supportBtn = document.getElementById('support-btn');

    if (Store.user) {
        if (authSect) authSect.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (supportBtn) {
            supportBtn.style.display = 'block';
            supportBtn.onclick = openUserSupportForm;
        }
        checkAdminRights(adminBtn);
    } else {
        if (authSect) authSect.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (adminBtn) adminBtn.style.display = 'none';
        if (supportBtn) supportBtn.style.display = 'none';
    }
}

async function checkAdminRights(btn) {
    if (!Store.user) return;
    const { data } = await sb.from('admin_status').select('role').eq('user_email', Store.user.email).maybeSingle();
    if (Store.user.email === APP_CONFIG.OWNER_EMAIL || (data && (data.role === 'admin' || data.role === 'moderator'))) {
        if (btn) btn.style.display = 'block';
    }
}

function bindGlobalEvents() {
    document.getElementById('overlay').addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => { if (e.key === "Escape") closeModal(); });
    window.addEventListener('scroll', handleHeaderScroll);
}

function handleHeaderScroll() {
    const header = document.querySelector('header');
    if (window.scrollY > 50) header.style.boxShadow = "0 5px 20px rgba(0,0,0,0.5)";
    else header.style.boxShadow = "none";
}

window.signIn = async function() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;
    if (!validateEmail(email)) return alert("Email error");
    const { error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error) alert(error.message); else location.reload();
};

window.signUp = async function() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;
    if (pass.length < 6) return alert("Min 6 chars");
    const { error } = await sb.auth.signUp({ email, password: pass });
    if (error) alert(error.message); else alert("Check your email!");
};

window.signOut = async function() {
    await sb.auth.signOut();
    localStorage.removeItem('olux_cart');
    location.reload();
};

window.addToCart = function(element) {
    const card = element.closest('.game-card');
    const gameData = {
        id: btoa(card.dataset.title),
        title: card.dataset.title,
        price: parseFloat(card.dataset.price),
        img: card.dataset.img,
        timestamp: Date.now()
    };
    if (Store.cart.find(item => item.title === gameData.title)) return alert("Already in cart");
    Store.cart.push(gameData);
    updateCartStorage();
    animateButton(element);
    renderCart();
};

function updateCartStorage() {
    localStorage.setItem('olux_cart', JSON.stringify(Store.cart));
    document.getElementById('cart-count').innerText = Store.cart.length;
}

function syncCartWithUI() {
    document.getElementById('cart-count').innerText = Store.cart.length;
    renderCart();
}

window.removeFromCart = function(index) {
    Store.cart.splice(index, 1);
    updateCartStorage();
    renderCart();
};

function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    if (!container) return;
    if (Store.cart.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:20px;">Порожньо</div>';
        totalEl.innerText = "0";
        return;
    }
    let total = 0;
    container.innerHTML = Store.cart.map((item, idx) => {
        total += item.price;
        return `
            <div class="cart-item-row" style="display:flex;align-items:center;margin-bottom:10px;background:#2c2f36;padding:10px;border-radius:8px;">
                <img src="${item.img}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;margin-right:10px;">
                <div style="flex:1;font-size:13px;">${item.title}</div>
                <div style="color:#f1c40f;margin-right:10px;">${item.price}</div>
                <button onclick="removeFromCart(${idx})" style="background:none;border:none;color:red;cursor:pointer;">&times;</button>
            </div>`;
    }).join('');
    totalEl.innerText = total;
}

window.toggleCart = function() {
    document.getElementById('cart-sidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
};

window.processCheckout = async function() {
    if (Store.cart.length === 0) return alert("Cart empty");
    if (!Store.user) return toggleAuthModal();
    const total = Store.cart.reduce((s, i) => s + i.price, 0);
    const titles = Store.cart.map(i => i.title).join(', ');
    const { error } = await sb.from('orders').insert([{
        user_id: Store.user.id,
        items: titles,
        total_price: total,
        status: 'pending'
    }]);
    if (confirm(`Сума: ${total} грн. Перейти до оплати?`)) {
        window.open(APP_CONFIG.PAYMENT_LINK, '_blank');
    }
};

window.openDetails = function(button) {
    const d = button.closest('.game-card').dataset;
    const modalData = document.getElementById('modal-data');
    modalData.innerHTML = `
        <div style="display:flex;flex-wrap:wrap;color:white;">
            <div style="flex:1;min-width:250px;"><img src="${d.img}" style="width:100%;height:100%;object-fit:cover;"></div>
            <div style="flex:1.2;padding:30px;min-width:250px;">
                <h2 style="color:#e74c3c;">${d.title}</h2>
                <p style="color:#f1c40f;font-size:24px;font-weight:bold;">${d.price} грн</p>
                <p style="font-size:14px;line-height:1.6;">${d.desc}</p>
                <div style="background:#0f1115;padding:10px;border-radius:5px;margin:15px 0;font-size:12px;">
                    <b>Вимоги:</b> ${d.specs}
                </div>
                <button onclick="addToCartFromModal('${d.title}', ${d.price}, '${d.img}')" style="width:100%;padding:15px;background:#e74c3c;border:none;color:white;font-weight:bold;cursor:pointer;border-radius:5px;">КУПИТИ ЗАРАЗ</button>
            </div>
        </div>`;
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
};

window.addToCartFromModal = function(t, p, i) {
    if (Store.cart.find(item => item.title === t)) return alert("Already in cart");
    Store.cart.push({ title: t, price: p, img: i });
    updateCartStorage();
    closeModal();
    toggleCart();
};

window.openUserSupportForm = function() {
    const modalData = document.getElementById('modal-data');
    modalData.innerHTML = `
        <div style="padding:30px;">
            <h3>Підтримка Olux</h3>
            <select id="t-cat" style="width:100%;padding:10px;margin-bottom:10px;background:#1a1d24;color:white;border:1px solid #444;">
                <option value="pay">Оплата</option>
                <option value="key">Ключ</option>
                <option value="tech">Технічне</option>
            </select>
            <textarea id="t-msg" style="width:100%;height:100px;background:#1a1d24;color:white;border:1px solid #444;padding:10px;"></textarea>
            <button onclick="submitTicket()" style="width:100%;padding:10px;margin-top:10px;background:#3498db;border:none;color:white;cursor:pointer;">ВІДПРАВИТИ</button>
        </div>`;
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
};

window.submitTicket = async function() {
    const msg = document.getElementById('t-msg').value;
    const cat = document.getElementById('t-cat').value;
    if (!Store.user || msg.length < 5) return alert("Error");
    await sb.from('support_tickets').insert([{ user_id: Store.user.id, category: cat, message: msg }]);
    alert("Надіслано!");
    closeModal();
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

function setupSearch() {
    const searchInput = document.createElement('input');
    searchInput.type = "text";
    searchInput.placeholder = "Пошук ігор...";
    searchInput.className = "dark-input search-bar";
    searchInput.style.margin = "20px auto";
    searchInput.style.display = "block";
    searchInput.style.width = "300px";
    document.querySelector('.filters').prepend(searchInput);
    
    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        document.querySelectorAll('.game-card').forEach(c => {
            const t = c.dataset.title.toLowerCase();
            c.style.display = t.includes(val) ? 'flex' : 'none';
        });
    });
}

function animateButton(btn) {
    const oldText = btn.innerText;
    btn.innerText = "✓";
    btn.style.background = "#27ae60";
    setTimeout(() => { btn.innerText = oldText; btn.style.background = ""; }, 1500);
}

function validateEmail(e) { return /^\S+@\S+\.\S+$/.test(e); }

window.toggleAuthModal = function() {
    document.getElementById('auth-modal').style.display = 'block';
    document.getElementById('overlay').classList.add('active');
};

window.closeModal = function() {
    document.querySelectorAll('.modal, .sidebar').forEach(m => m.classList.remove('active'));
    document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('overlay').classList.remove('active');
};

function loadAnalytics() {
    console.log("Analytics v1.0.4 loaded");
}

window.addToWishlist = function(title) {
    if (Store.wishlist.includes(title)) return;
    Store.wishlist.push(title);
    localStorage.setItem('olux_wishlist', JSON.stringify(Store.wishlist));
};

function updatePriceDynamic() {
    const prices = document.querySelectorAll('.price');
    prices.forEach(p => {
        const val = parseInt(p.innerText);
        if (val > 1000) p.style.color = "#ff4757";
    });
}

window.onresize = () => { if (window.innerWidth > 1000) closeModal(); };

function initLazyLoading() {
    const images = document.querySelectorAll('.card-img');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const bg = entry.target.style.backgroundImage;
                if (bg) entry.target.style.opacity = 1;
                observer.unobserve(entry.target);
            }
        });
    });
    images.forEach(img => { img.style.opacity = 0; img.style.transition = "0.5s"; observer.observe(img); });
}
initLazyLoading();
updatePriceDynamic();

window.showNotification = function(msg) {
    const note = document.createElement('div');
    note.innerText = msg;
    note.style.position = "fixed";
    note.style.bottom = "20px";
    note.style.right = "20px";
    note.style.background = "#e74c3c";
    note.style.padding = "10px 20px";
    note.style.borderRadius = "5px";
    note.style.zIndex = "9999";
    document.body.appendChild(note);
    setTimeout(() => note.remove(), 3000);
};

(function checkSystemIntegrity() {
    if (!document.getElementById('catalog-grid')) console.error("Catalog missing");
})();
