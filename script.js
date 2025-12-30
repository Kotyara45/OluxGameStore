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

window.onload = async () => {
    sbClient = supabase.createClient(SB_URL, SB_KEY);
    
    sbClient.auth.onAuthStateChange((event, session) => {
        currentUser = session ? session.user : null;
        updateAuthUI();
    });

    await checkUser();
};

async function checkUser() {
    const { data: { user } } = await sbClient.auth.getUser();
    currentUser = user;
    updateAuthUI();
}

function updateAuthUI() {
    const authSect = document.getElementById('auth-section');
    const logoutBtn = document.getElementById('logout-btn');
    const histBtn = document.getElementById('history-btn');
    const adminBtn = document.getElementById('admin-panel-btn');

    if (currentUser) {
        if(authSect) authSect.style.display = 'none';
        if(logoutBtn) logoutBtn.style.display = 'block';
        if(histBtn) histBtn.style.display = 'block';

        const isOwner = currentUser.email === ROLES.OWNER;
        const isAdmin = ROLES.ADMINS.includes(currentUser.email);
        const isModer = ROLES.MODERS.includes(currentUser.email);

        if (isOwner || isAdmin || isModer) {
            if(adminBtn) {
                adminBtn.style.display = 'block';
                adminBtn.innerText = isOwner ? "Власник 👑" : (isAdmin ? "Адмін 🛠" : "Модер 🛡");
            }
        }
    } else {
        if(authSect) authSect.style.display = 'block';
        if(logoutBtn) logoutBtn.style.display = 'none';
        if(histBtn) histBtn.style.display = 'none';
        if(adminBtn) adminBtn.style.display = 'none';
    }
}

async function signIn() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { error } = await sbClient.auth.signInWithPassword({ email, password });
    if (error) alert("Помилка: " + error.message);
}

async function signUp() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { error } = await sbClient.auth.signUp({ email, password });
    if (error) alert(error.message); else alert("Перевірте пошту!");
}

async function signOut() {
    await sbClient.auth.signOut();
    currentUser = null;
    updateAuthUI();
}

function openDetails(btn) {
    const d = btn.closest('.game-card').dataset;
    const modalData = document.getElementById('modal-data');
    if(!modalData) return;
    modalData.innerHTML = `
        <div class="modal-img-side"><img src="${d.img}" style="width:100%; border-radius:15px;"></div>
        <div class="modal-info-side">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h2 style="color:black;">${d.title}</h2>
            <div style="color:#d4af37; font-size:24px; font-weight:bold; margin: 10px 0;">${d.price} грн</div>
            <p style="color:#333;">${d.desc}</p>
            <div style="background:#f4f4f4; padding:10px; border-radius:10px; margin: 15px 0; font-size:14px; color:black;">
                <p><b>Розробник:</b> ${d.author}</p>
                <p><b>Рік:</b> ${d.year}</p>
                <p><b>ПК:</b> ${d.specs}</p>
            </div>
            <button class="buy-btn" style="width:100%;" onclick="addToCartDirect('${d.title}', ${d.price}, '${d.img}')">У КОШИК</button>
        </div>`;
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function toggleAdminPanel() {
    if (!currentUser) return;
    const modal = document.getElementById('admin-modal');
    const tabs = document.getElementById('admin-tabs');
    if(!modal || !tabs) return;
    tabs.innerHTML = ''; 
    modal.classList.add('active');
    document.getElementById('overlay').classList.add('active');
    
    const email = currentUser.email;
    if (email === ROLES.OWNER || ROLES.ADMINS.includes(email) || ROLES.MODERS.includes(email)) 
        tabs.innerHTML += `<button class="filter-btn" onclick="loadAdminSection('support')">Підтримка</button>`;
    if (email === ROLES.OWNER || ROLES.ADMINS.includes(email)) {
        tabs.innerHTML += `<button class="filter-btn" onclick="loadAdminSection('orders')">Замовлення</button>`;
        tabs.innerHTML += `<button class="filter-btn" onclick="loadAdminSection('add_game')">Додати гру</button>`;
    }
    if (email === ROLES.OWNER) 
        tabs.innerHTML += `<button class="filter-btn" style="background:gold; color:black;" onclick="loadAdminSection('staff')">Штат</button>`;
    
    loadAdminSection('support'); 
}

async function loadAdminSection(section) {
    const content = document.getElementById('admin-content');
    if(!content) return;
    content.innerHTML = '<p>Завантаження...</p>';
    if (section === 'orders') {
        const { data } = await sbClient.from('orders').select('*').order('created_at', {ascending: false});
        content.innerHTML = `<h3 style="color:black;">Замовлення</h3>` + (data || []).map(o => `<div style="padding:10px; border-bottom:1px solid #ddd; color:black;"><b>${o.user_email}</b>: ${o.total_price} грн<br><small>${o.items_names}</small></div>`).join('');
    } else if (section === 'add_game') {
        content.innerHTML = `<h3 style="color:black;">Додати гру</h3><input type="text" id="n-t" placeholder="Назва" style="width:100%; padding:8px; margin-bottom:10px;"><button class="buy-btn" onclick="alert('Збережено!')">Зберегти</button>`;
    } else if (section === 'staff') {
        content.innerHTML = `<h3 style="color:black;">Штат</h3><p style="color:black;">Власник: ${ROLES.OWNER}</p>`;
    } else {
        content.innerHTML = `<h3 style="color:black;">Підтримка</h3><p style="color:black;">Запитів немає.</p>`;
    }
}

async function toggleHistoryModal() {
    if (!currentUser) return;
    const modal = document.getElementById('history-modal');
    const list = document.getElementById('history-list');
    if(!modal || !list) return;
    modal.style.display = 'block';
    document.getElementById('overlay').classList.add('active');
    const { data } = await sbClient.from('orders').select('*').eq('user_email', currentUser.email).order('created_at', { ascending: false });
    list.innerHTML = data && data.length ? data.map(o => `<div style="padding:10px; border-bottom:1px solid #eee; color:black;"><b>#${o.id.toString().slice(0,6)}</b> - ${o.total_price} грн<br><small>${o.items_names}</small></div>`).join('') : '<p style="color:black;">Історія порожня</p>';
}

function addToCart(btn) {
    const d = btn.closest('.game-card').dataset;
    const exists = cart.find(item => item.title === d.title);
    if (exists) return alert("Ця гра вже є у кошику!");
    cart.push({ title: d.title, price: parseInt(d.price), img: d.img });
    updateUI();
}

function addToCartDirect(title, price, img) {
    const exists = cart.find(item => item.title === title);
    if (exists) {
        alert("Ця гра вже є у кошику!");
        closeModal();
        return;
    }
    cart.push({ title, price, img });
    updateUI();
    closeModal();
}

function updateUI() {
    const countEl = document.getElementById('cart-count');
    const itemsCont = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    if(countEl) countEl.innerText = cart.length;
    let total = 0;
    if(itemsCont) {
        itemsCont.innerHTML = cart.length ? cart.map((item, i) => {
            total += item.price;
            return `<div class="cart-item" style="display:flex; gap:10px; margin-bottom:10px; align-items:center;">
                <img src="${item.img}" width="40" height="50" style="object-fit:cover; border-radius:5px;">
                <div style="flex:1; color:black;"><b>${item.title}</b><br>${item.price} грн</div>
                <span onclick="removeFromCart(${i})" style="color:red; cursor:pointer; font-weight:bold; padding:5px;">✕</span>
            </div>`;
        }).join('') : '<p style="text-align:center; color:gray; padding-top:20px;">Порожньо</p>';
    }
    if(totalEl) totalEl.innerText = total;
}

function removeFromCart(i) {
    cart.splice(i, 1);
    updateUI();
}

async function checkout() {
    if (!currentUser) { alert("Увійдіть в акаунт!"); toggleAuthModal(); return; }
    if (!cart.length) return;
    const items = cart.map(i => i.title).join(', ');
    const total = cart.reduce((s, i) => s + i.price, 0);
    const { error } = await sbClient.from('orders').insert([{ user_email: currentUser.email, items_names: items, total_price: total }]);
    if (!error) {
        window.location.href = 'https://donatello.to/OluxGameStore';
    } else {
        alert("Помилка БД: " + error.message);
    }
}

function toggleCart() {
    const s = document.getElementById('cart-sidebar');
    if(!s) return;
    const active = s.classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active', active);
}

function toggleAuthModal() {
    const m = document.getElementById('auth-modal');
    if(!m) return;
    const isDisp = m.style.display === 'block';
    m.style.display = isDisp ? 'none' : 'block';
    document.getElementById('overlay').classList.toggle('active', !isDisp);
}

function closeModal() {
    document.querySelectorAll('.modal, .sidebar').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.modal-small').forEach(m => m.style.display = 'none');
    const ov = document.getElementById('overlay');
    if(ov) ov.classList.remove('active');
}

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.onclick = () => {
        const genre = btn.dataset.genre;
        if (!genre) return; 
        const activeBtn = document.querySelector('.filter-btn.active');
        if(activeBtn) activeBtn.classList.remove('active');
        btn.classList.add('active');
        document.querySelectorAll('.game-card').forEach(card => {
            card.style.display = (genre === 'all' || card.dataset.genre === genre) ? 'block' : 'none';
        });
    };
});
