const SB_URL = 'https://yoxieszknznklpvnyvui.supabase.co';
const SB_KEY = 'sb_publishable_ZLbve8ADHIqc48h2YOQQUw_z8vox0s9';

const ROLES = {
    OWNER: 'nazarivanyuk562@gmail.com',
    ADMINS: ['admin@olux.com'], 
    MODERS: ['moder@olux.com']
};

let sbClient;
let cart = [];
let currentUser = null;

window.onload = () => {
    sbClient = supabase.createClient(SB_URL, SB_KEY);
    checkUser();
};

async function checkUser() {
    const { data: { user } } = await sbClient.auth.getUser();
    currentUser = user;
    if (user) {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('logout-btn').style.display = 'block';
        document.getElementById('history-btn').style.display = 'block';

        const isOwner = user.email === ROLES.OWNER;
        const isAdmin = ROLES.ADMINS.includes(user.email);
        const isModer = ROLES.MODERS.includes(user.email);

        if (isOwner || isAdmin || isModer) {
            const btn = document.getElementById('admin-panel-btn');
            btn.style.display = 'block';
            btn.innerText = isOwner ? "Власник 👑" : (isAdmin ? "Адмін 🛠" : "Модер 🛡");
        }
    }
}

function toggleAdminPanel() {
    if (!currentUser) return;
    const modal = document.getElementById('admin-modal');
    const tabs = document.getElementById('admin-tabs');
    const email = currentUser.email;

    tabs.innerHTML = '';
    modal.classList.add('active');
    document.getElementById('overlay').classList.add('active');

    if (email === ROLES.OWNER || ROLES.ADMINS.includes(email) || ROLES.MODERS.includes(email)) {
        tabs.innerHTML += `<button class="filter-btn" onclick="loadSection('support')">Підтримка</button>`;
    }
    if (email === ROLES.OWNER || ROLES.ADMINS.includes(email)) {
        tabs.innerHTML += `<button class="filter-btn" onclick="loadSection('orders')">Замовлення</button>`;
        tabs.innerHTML += `<button class="filter-btn" onclick="loadSection('add')">Додати гру</button>`;
    }
    if (email === ROLES.OWNER) {
        tabs.innerHTML += `<button class="filter-btn" style="background:gold; color:black" onclick="loadSection('staff')">Штат</button>`;
    }
    loadSection('support');
}

async function loadSection(s) {
    const cont = document.getElementById('admin-content');
    cont.innerHTML = '<p>Завантаження...</p>';

    if (s === 'orders') {
        const { data } = await sbClient.from('orders').select('*').order('created_at', {ascending: false});
        cont.innerHTML = `<h3>Замовлення</h3>` + (data && data.length ? data.map(o => `
            <div style="padding:10px; border-bottom:1px solid #eee;">
                <b>${o.user_email}</b> — <span style="color:gold">${o.total_price} грн</span><br>
                <small>${o.items_names}</small>
            </div>`).join('') : 'Замовлень немає.');
    } else if (s === 'add') {
        cont.innerHTML = `<h3>Додати гру</h3><input type="text" placeholder="Назва"><button class="buy-btn">ОК</button>`;
    } else if (s === 'staff') {
        cont.innerHTML = `<h3>Штат</h3><p>Власник: ${ROLES.OWNER}</p>`;
    } else {
        cont.innerHTML = `<h3>Підтримка</h3><p>Тікетів немає.</p>`;
    }
}

async function toggleHistoryModal() {
    if (!currentUser) return toggleAuthModal();
    const modal = document.getElementById('history-modal');
    const list = document.getElementById('history-list');
    modal.style.display = 'block';
    document.getElementById('overlay').classList.add('active');
    list.innerHTML = 'Завантаження...';

    const { data } = await sbClient.from('orders').select('*').eq('user_email', currentUser.email).order('created_at', {ascending: false});
    list.innerHTML = data && data.length ? data.map(o => `
        <div style="padding:15px; border-bottom:1px solid #eee;">
            <b>№${o.id.slice(0,5)}</b> — <span style="color:green">${o.total_price} грн</span><br>
            <small>${o.items_names}</small>
        </div>`).join('') : 'Історія порожня.';
}

function addToCart(btn) {
    const d = btn.closest('.game-card').dataset;
    cart.push({ title: d.title, price: parseInt(d.price), img: d.img });
    updateUI();
}

function updateUI() {
    document.getElementById('cart-count').innerText = cart.length;
    let total = 0;
    document.getElementById('cart-items').innerHTML = cart.map((item, i) => {
        total += item.price;
        return `<div class="cart-item" style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
            <img src="${item.img}" width="40">
            <div style="flex:1"><b>${item.title}</b><br>${item.price} грн</div>
            <span onclick="removeFromCart(${i})" style="color:red; cursor:pointer;">✕</span>
        </div>`;
    }).join('');
    document.getElementById('cart-total').innerText = total;
}

function removeFromCart(i) { cart.splice(i, 1); updateUI(); }

async function checkout() {
    if (!currentUser) return toggleAuthModal();
    if (cart.length === 0) return;
    const t = cart.reduce((s, i) => s + i.price, 0);
    const n = cart.map(i => i.title).join(', ');
    const { error } = await sbClient.from('orders').insert([{ user_email: currentUser.email, items_names: n, total_price: t }]);
    if (!error) window.location.href = 'https://donatello.to/OluxGameStore';
}

function openDetails(btn) {
    const d = btn.closest('.game-card').dataset;
    document.getElementById('modal-data').innerHTML = `
        <div class="modal-img-side"><img src="${d.img}" style="width:100%;"></div>
        <div class="modal-info-side">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h2 style="color:black">${d.title}</h2>
            <div style="color:gold; font-size:24px; font-weight:bold; margin:10px 0;">${d.price} грн</div>
            <p style="color:#444">${d.desc}</p>
            <button class="buy-btn" style="width:100%;" onclick="addToCartDirect('${d.title}', ${d.price}, '${d.img}')">У кошик</button>
        </div>`;
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function addToCartDirect(t, p, i) { cart.push({ title: t, price: p, img: i }); updateUI(); closeModal(); }
function toggleCart() { document.getElementById('cart-sidebar').classList.toggle('active'); document.getElementById('overlay').classList.toggle('active'); }
function closeModal() { document.querySelectorAll('.modal, .sidebar').forEach(m => m.classList.remove('active')); document.querySelectorAll('.modal-small').forEach(m => m.style.display = 'none'); document.getElementById('overlay').classList.remove('active'); }
function toggleAuthModal() { const m = document.getElementById('auth-modal'); m.style.display = m.style.display === 'block' ? 'none' : 'block'; document.getElementById('overlay').classList.add('active'); }
async function signIn() { const { error } = await sbClient.auth.signInWithPassword({ email: document.getElementById('auth-email').value, password: document.getElementById('auth-password').value }); if (error) alert(error.message); else location.reload(); }
async function signUp() { const { error } = await sbClient.auth.signUp({ email: document.getElementById('auth-email').value, password: document.getElementById('auth-password').value }); if (error) alert(error.message); else alert("OK"); }
async function signOut() { await sbClient.auth.signOut(); location.reload(); }

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.onclick = () => {
        if (!btn.dataset.genre) return;
        document.querySelector('.filter-btn.active').classList.remove('active');
        btn.classList.add('active');
        const g = btn.dataset.genre;
        document.querySelectorAll('.game-card').forEach(c => c.style.display = (g === 'all' || c.dataset.genre === g) ? 'block' : 'none');
    };
});
