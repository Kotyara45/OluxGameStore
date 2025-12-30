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
        cont.innerHTML = `<h3>Список замовлень</h3>` + (data.length ? data.map(o => `
            <div style="padding:10px; border-bottom:1px solid #eee;">
                <b>${o.user_email}</b> — <span style="color:gold">${o.total_price} грн</span><br>
                <small>${o.items_names}</small>
            </div>`).join('') : 'Замовлень немає.');
    } else if (s === 'add') {
        cont.innerHTML = `<h3>Нова гра</h3><input type="text" placeholder="Назва" style="width:100%; padding:10px; margin-bottom:10px;"><button class="buy-btn">Опублікувати</button>`;
    } else if (s === 'staff') {
        cont.innerHTML = `<h3>Персонал</h3><p>Власник: ${ROLES.OWNER}</p><p>Адміни: ${ROLES.ADMINS.join(', ')}</p>`;
    } else {
        cont.innerHTML = `<h3>Підтримка</h3><p>Активних тікетів немає.</p>`;
    }
}

async function toggleHistoryModal() {
    if (!currentUser) return toggleAuthModal();
    const modal = document.getElementById('history-modal');
    const list = document.getElementById('history-list');
    modal.style.display = 'block';
    document.getElementById('overlay').classList.add('active');
    list.innerHTML = 'Шукаємо дані...';

    const { data } = await sbClient.from('orders').select('*').eq('user_email', currentUser.email).order('created_at', {ascending: false});
    list.innerHTML = data && data.length ? data.map(o => `
        <div style="padding:15px; border-bottom:1px solid #eee;">
            <b>Замовлення #${o.id.slice(0,5)}</b><br>
            <span style="color:green; font-weight:bold;">${o.total_price} грн</span><br>
            <small style="color:#666">${o.items_names}</small>
        </div>`).join('') : 'Ви ще не робили замовлень.';
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
        return `<div class="cart-item" style="display:flex; align-items:center; gap:10px; margin-bottom:15px;">
            <img src="${item.img}" width="50" style="border-radius:10px;">
            <div style="flex:1"><b>${item.title}</b><br>${item.price} грн</div>
            <span onclick="removeFromCart(${i})" style="color:red; cursor:pointer; font-weight:bold;">✕</span>
        </div>`;
    }).join('');
    document.getElementById('cart-total').innerText = total;
}

function removeFromCart(i) { cart.splice(i, 1); updateUI(); }

async function checkout() {
    if (!currentUser) return toggleAuthModal();
    if (cart.length === 0) return alert("Кошик порожній!");
    const t = cart.reduce((s, i) => s + i.price, 0);
    const n = cart.map(i => i.title).join(', ');

    const { error } = await sbClient.from('orders').insert([{ user_email: currentUser.email, items_names: n, total_price: t }]);
    if (!error) window.location.href = 'https://donatello.to/OluxGameStore';
}

function openDetails(btn) {
    const d = btn.closest('.game-card').dataset;
    document.getElementById('modal-data').innerHTML = `
        <div class="modal-img-side"><img src="${d.img}" style="width:100%; border-radius:20px;"></div>
        <div class="modal-info-side">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h2 style="color:black">${d.title}</h2>
            <div style="color:gold; font-size:24px; font-weight:bold; margin:10px 0;">${d.price} грн</div>
            <p style="color:#444">${d.desc}</p>
            <ul style="list-style:none; padding:0; margin:20px 0; color:#666; font-size:14px;">
                <li><b>Студія:</b> ${d.author}</li>
                <li><b>Рік:</b> ${d.year}</li>
                <li><b>ПК:</b> ${d.specs}</li>
            </ul>
            <button class="buy-btn" style="width:100%; padding:15px;" onclick="addToCartDirect('${d.title}', ${d.price}, '${d.img}')">Додати у кошик</button>
        </div>`;
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function addToCartDirect(t, p, i) {
    cart.push({ title: t, price: p, img: i });
    updateUI();
    closeModal();
}

function toggleCart() {
    const s = document.getElementById('cart-sidebar');
    s.classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active', s.classList.contains('active'));
}

function closeModal() {
    document.querySelectorAll('.modal, .sidebar').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.modal-small').forEach(m => m.style.display = 'none');
    document.getElementById('overlay').classList.remove('active');
}

function toggleAuthModal() {
    const m = document.getElementById('auth-modal');
    m.style.display = m.style.display === 'block' ? 'none' : 'block';
    document.getElementById('overlay').classList.add('active');
}

async function signIn() {
    const e = document.getElementById('auth-email').value;
    const p = document.getElementById('auth-password').value;
    const { error } = await sbClient.auth.signInWithPassword({ email: e, password: p });
    if (error) alert(error.message); else location.reload();
}

async function signUp() {
    const e = document.getElementById('auth-email').value;
    const p = document.getElementById('auth-password').value;
    const { error } = await sbClient.auth.signUp({ email: e, password: p });
    if (error) alert(error.message); else alert("Перевірте пошту!");
}

async function signOut() { await sbClient.auth.signOut(); location.reload(); }

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.onclick = () => {
        if (!btn.dataset.genre) return;
        document.querySelector('.filter-btn.active').classList.remove('active');
        btn.classList.add('active');
        const g = btn.dataset.genre;
        document.querySelectorAll('.game-card').forEach(c => {
            c.style.display = (g === 'all' || c.dataset.genre === g) ? 'block' : 'none';
        });
    };
});
