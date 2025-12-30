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
            if (isOwner) btn.innerText = "Власник 👑";
            else if (isAdmin) btn.innerText = "Адмін 🛠";
            else btn.innerText = "Модер 🛡";
        }
    } else {
        document.getElementById('auth-section').style.display = 'block';
        document.getElementById('logout-btn').style.display = 'none';
        document.getElementById('history-btn').style.display = 'none';
        document.getElementById('admin-panel-btn').style.display = 'none';
    }
}

async function signIn() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { data, error } = await sbClient.auth.signInWithPassword({ email, password });
    if (error) alert(error.message); else location.reload();
}

async function signUp() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { data, error } = await sbClient.auth.signUp({ email, password });
    if (error) alert(error.message); else alert("OK! Check email.");
}

async function signOut() {
    await sbClient.auth.signOut();
    location.reload();
}

function openDetails(btn) {
    const d = btn.closest('.game-card').dataset;
    const modalData = document.getElementById('modal-data');
    modalData.innerHTML = `
        <div class="modal-img-side">
            <img src="${d.img}" style="width:100%; border-radius:15px;">
        </div>
        <div class="modal-info-side">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h2 style="color:#333;">${d.title}</h2>
            <div style="color:#d4af37; font-size:26px; font-weight:800; margin-bottom:15px;">${d.price} грн</div>
            <p style="color:#555; line-height:1.6; margin-bottom:20px;">${d.desc}</p>
            <div style="background:#f9f9f9; padding:15px; border-radius:10px; margin-bottom:20px;">
                <p><b>Розробник:</b> ${d.author}</p>
                <p><b>Рік:</b> ${d.year}</p>
                <p><b>ПК:</b> ${d.specs}</p>
            </div>
            <button class="buy-btn" style="width:100%; padding:18px;" onclick="addToCartDirect('${d.title}', ${d.price}, '${d.img}')">КУПИТИ</button>
        </div>`;
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function toggleAdminPanel() {
    const modal = document.getElementById('admin-modal');
    const tabs = document.getElementById('admin-tabs');
    const email = currentUser.email;
    tabs.innerHTML = ''; 
    modal.classList.add('active');
    document.getElementById('overlay').classList.add('active');
    if (email === ROLES.OWNER || ROLES.ADMINS.includes(email) || ROLES.MODERS.includes(email)) tabs.innerHTML += `<button class="filter-btn" onclick="loadAdminSection('support')">Підтримка</button>`;
    if (email === ROLES.OWNER || ROLES.ADMINS.includes(email)) {
        tabs.innerHTML += `<button class="filter-btn" onclick="loadAdminSection('orders')">Замовлення</button>`;
        tabs.innerHTML += `<button class="filter-btn" onclick="loadAdminSection('add_game')">Додати гру</button>`;
    }
    if (email === ROLES.OWNER) tabs.innerHTML += `<button class="filter-btn" style="background:gold;" onclick="loadAdminSection('staff')">Штат</button>`;
    loadAdminSection('support'); 
}

async function loadAdminSection(section) {
    const content = document.getElementById('admin-content');
    content.innerHTML = '<p>Завантаження...</p>';
    if (section === 'orders') {
        const { data } = await sbClient.from('orders').select('*').order('created_at', {ascending: false});
        content.innerHTML = `<h3>Замовлення</h3>` + data.map(o => `<div><b>${o.user_email}</b>: ${o.total_price} грн<br><small>${o.items_names}</small></div>`).join('');
    } else if (section === 'add_game') {
        content.innerHTML = `<h3>Додати гру</h3><input type="text" id="n-t" placeholder="Назва"><button class="buy-btn">Додати</button>`;
    } else if (section === 'staff') {
        content.innerHTML = `<h3>Штат</h3><p>Власник: ${ROLES.OWNER}</p><p>Адміни: ${ROLES.ADMINS.join(', ')}</p>`;
    } else {
        content.innerHTML = `<h3>Підтримка</h3><p>Немає запитів.</p>`;
    }
}

async function toggleHistoryModal() {
    const modal = document.getElementById('history-modal');
    const list = document.getElementById('history-list');
    modal.style.display = 'block';
    document.getElementById('overlay').classList.add('active');
    const { data } = await sbClient.from('orders').select('*').eq('user_email', currentUser.email).order('created_at', { ascending: false });
    list.innerHTML = data && data.length ? data.map(o => `<div style="padding:10px; border-bottom:1px solid #eee;"><b>#${o.id.toString().slice(0,6)}</b> - ${o.total_price} грн</div>`).join('') : '<p>Порожньо</p>';
}

function addToCart(btn) {
    const d = btn.closest('.game-card').dataset;
    cart.push({ title: d.title, price: parseInt(d.price), img: d.img });
    updateUI();
}

function addToCartDirect(title, price, img) {
    cart.push({ title, price, img });
    updateUI();
    closeModal();
}

function updateUI() {
    document.getElementById('cart-count').innerText = cart.length;
    let total = 0;
    const itemsCont = document.getElementById('cart-items');
    itemsCont.innerHTML = cart.length ? cart.map((item, i) => {
        total += item.price;
        return `<div class="cart-item" style="display:flex; gap:10px; margin-bottom:10px;">
            <img src="${item.img}" width="40">
            <div style="flex:1;"><b>${item.title}</b><br>${item.price} грн</div>
            <span onclick="removeFromCart(${i})" style="color:red; cursor:pointer;">✕</span>
        </div>`;
    }).join('') : '<p>Порожньо</p>';
    document.getElementById('cart-total').innerText = total;
}

function removeFromCart(i) {
    cart.splice(i, 1);
    updateUI();
}

async function checkout() {
    if (!currentUser) return toggleAuthModal();
    if (!cart.length) return;
    const items = cart.map(i => i.title).join(', ');
    const total = cart.reduce((s, i) => s + i.price, 0);
    const { error } = await sbClient.from('orders').insert([{ user_email: currentUser.email, items_names: items, total_price: total }]);
    if (!error) window.location.href = 'https://donatello.to/OluxGameStore';
}

function toggleCart() {
    const s = document.getElementById('cart-sidebar');
    s.classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active', s.classList.contains('active'));
}

function toggleAuthModal() {
    const m = document.getElementById('auth-modal');
    m.style.display = m.style.display === 'block' ? 'none' : 'block';
    document.getElementById('overlay').classList.toggle('active', m.style.display === 'block');
}

function closeModal() {
    document.querySelectorAll('.modal, .sidebar').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.modal-small').forEach(m => m.style.display = 'none');
    document.getElementById('overlay').classList.remove('active');
}

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.onclick = () => {
        if (!btn.dataset.genre) return; 
        document.querySelector('.filter-btn.active').classList.remove('active');
        btn.classList.add('active');
        const genre = btn.dataset.genre;
        document.querySelectorAll('.game-card').forEach(card => {
            card.style.display = (genre === 'all' || card.dataset.genre === genre) ? 'block' : 'none';
        });
    };
});
