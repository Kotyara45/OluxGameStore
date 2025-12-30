const CONFIG = {
    SB_URL: 'https://yoxieszknznklpvnyvui.supabase.co',
    SB_KEY: 'sb_publishable_ZLbve8ADHIqc48h2YOQQUw_z8vox0s9',
    OWNER_EMAIL: 'nazarivanyuk562@gmail.com',
    DONATE_URL: 'https://donatello.to/OluxGameStore'
};

let sbClient = null;
let currentUser = null;
let cart = JSON.parse(localStorage.getItem('olux_cart')) || [];

window.addEventListener('DOMContentLoaded', async () => {
    try {
        sbClient = supabase.createClient(CONFIG.SB_URL, CONFIG.SB_KEY);
        
        const { data: { session } } = await sbClient.auth.getSession();
        currentUser = session ? session.user : null;

        sbClient.auth.onAuthStateChange((event, session) => {
            currentUser = session ? session.user : null;
            updateAuthUI();
        });

        updateAuthUI();
        renderCart();
        initFilters();
    } catch (err) {
        console.error(err);
    }
});

async function updateAuthUI() {
    const authSect = document.getElementById('auth-section');
    const logoutBtn = document.getElementById('logout-btn');
    const histBtn = document.getElementById('history-btn');
    const adminBtn = document.getElementById('admin-panel-btn');

    if (!currentUser) {
        if (authSect) authSect.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (histBtn) histBtn.style.display = 'none';
        if (adminBtn) adminBtn.style.display = 'none';
        return;
    }

    if (authSect) authSect.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'block';
    if (histBtn) histBtn.style.display = 'block';

    let isPrivileged = (currentUser.email === CONFIG.OWNER_EMAIL);

    if (!isPrivileged) {
        const { data } = await sbClient.from('admin_status').select('role').eq('user_email', currentUser.email).maybeSingle();
        if (data && (data.role === 'owner' || data.role === 'admin')) isPrivileged = true;
    }

    if (isPrivileged && adminBtn) {
        adminBtn.style.display = 'block';
        adminBtn.innerText = currentUser.email === CONFIG.OWNER_EMAIL ? "Власник 👑" : "Адмін 🛠";
    }
}

async function signIn() {
    const email = document.getElementById('auth-email')?.value;
    const password = document.getElementById('auth-password')?.value;
    if (!email || !password) return alert("Введіть дані!");
    const { error } = await sbClient.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
}

async function signUp() {
    const email = document.getElementById('auth-email')?.value;
    const password = document.getElementById('auth-password')?.value;
    if (!email || !password) return alert("Введіть дані!");
    const { error } = await sbClient.auth.signUp({ email, password });
    if (error) alert(error.message); else alert("Перевірте пошту!");
}

async function signOut() {
    await sbClient.auth.signOut();
    localStorage.removeItem('olux_cart');
    location.reload();
}

function addToCart(btn) {
    const card = btn.closest('.game-card');
    const game = {
        title: card.dataset.title,
        price: parseFloat(card.dataset.price) || 0,
        img: card.dataset.img
    };
    if (cart.some(item => item.title === game.title)) return alert("Вже у кошику!");
    cart.push(game);
    saveAndRenderCart();
}

function addToCartDirect(title, price, img) {
    if (cart.some(item => item.title === title)) return alert("Вже у кошику!");
    cart.push({ title, price: parseFloat(price) || 0, img });
    saveAndRenderCart();
    closeModal();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveAndRenderCart();
}

function saveAndRenderCart() {
    localStorage.setItem('olux_cart', JSON.stringify(cart));
    renderCart();
}

function renderCart() {
    const countEl = document.getElementById('cart-count');
    const itemsCont = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    if (countEl) countEl.innerText = cart.length;
    let total = 0;
    if (itemsCont) {
        itemsCont.innerHTML = cart.length ? cart.map((item, i) => {
            total += item.price;
            return `<div class="cart-item" style="display:flex; gap:10px; margin-bottom:10px; align-items:center;">
                <img src="${item.img}" width="40" height="50" style="object-fit:cover;">
                <div style="flex:1; color:black;"><b>${item.title}</b><br>${item.price} грн</div>
                <span onclick="removeFromCart(${i})" style="color:red; cursor:pointer;">✕</span>
            </div>`;
        }).join('') : '<p style="text-align:center; color:gray;">Порожньо</p>';
    }
    if (totalEl) totalEl.innerText = total;
}

async function checkout() {
    if (!currentUser) { alert("Увійдіть в акаунт!"); toggleAuthModal(); return; }
    if (!cart.length) return alert("Кошик порожній!");

    const itemsSummary = cart.map(i => i.title).join(', ');
    const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);

    const { error } = await sbClient.from('orders').insert([{
        user_email: currentUser.email,
        items_names: itemsSummary,
        total_price: totalPrice
    }]);

    if (!error) {
        cart = [];
        saveAndRenderCart();
        window.location.href = CONFIG.DONATE_URL;
    } else {
        alert("Помилка бази: " + error.message);
    }
}

function openDetails(btn) {
    const d = btn.closest('.game-card').dataset;
    const modalData = document.getElementById('modal-data');
    modalData.innerHTML = `
        <div class="modal-img-side"><img src="${d.img}" style="width:100%; border-radius:15px;"></div>
        <div class="modal-info-side">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h2 style="color:black;">${d.title}</h2>
            <div style="color:#d4af37; font-size:24px; font-weight:bold; margin:10px 0;">${d.price} грн</div>
            <p style="color:#333;">${d.desc}</p>
            <button class="buy-btn" style="width:100%;" onclick="addToCartDirect('${d.title}', ${d.price}, '${d.img}')">У КОШИК</button>
        </div>`;
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

async function toggleHistoryModal() {
    if (!currentUser) return;
    const modal = document.getElementById('history-modal');
    const list = document.getElementById('history-list');
    modal.style.display = 'block';
    document.getElementById('overlay').classList.add('active');
    list.innerHTML = 'Завантаження...';
    const { data } = await sbClient.from('orders').select('*').eq('user_email', currentUser.email).order('created_at', { ascending: false });
    list.innerHTML = data && data.length ? data.map(o => `<div style="padding:10px; border-bottom:1px solid #eee; color:black;"><b>#${o.id.toString().slice(0,6)}</b> - ${o.total_price} грн<br><small>${o.items_names}</small></div>`).join('') : 'Порожньо';
}

function toggleAdminPanel() {
    const modal = document.getElementById('admin-modal');
    modal.classList.add('active');
    document.getElementById('overlay').classList.add('active');
    loadAdminSection('orders');
}

async function loadAdminSection(section) {
    const content = document.getElementById('admin-content');
    const { data } = await sbClient.from('orders').select('*').order('created_at', { ascending: false });
    content.innerHTML = `<h3 style="color:black;">Замовлення</h3>` + (data || []).map(o => `<div style="padding:10px; border-bottom:1px solid #ddd; color:black;"><b>${o.user_email}</b>: ${o.total_price} грн<br><small>${o.items_names}</small></div>`).join('');
}

function closeModal() {
    document.querySelectorAll('.modal, .sidebar').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.modal-small').forEach(m => m.style.display = 'none');
    document.getElementById('overlay').classList.remove('active');
}

function toggleCart() {
    const s = document.getElementById('cart-sidebar');
    const active = s.classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active', active);
}

function toggleAuthModal() {
    const m = document.getElementById('auth-modal');
    m.style.display = (m.style.display === 'block') ? 'none' : 'block';
    document.getElementById('overlay').classList.add('active');
}

function initFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            const genre = btn.dataset.genre;
            document.querySelector('.filter-btn.active')?.classList.remove('active');
            btn.classList.add('active');
            document.querySelectorAll('.game-card').forEach(card => {
                card.style.display = (genre === 'all' || card.dataset.genre === genre) ? 'block' : 'none';
            });
        };
    });
}
