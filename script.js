const SB_URL = 'https://yoxieszknznklpvnyvui.supabase.co';
const SB_KEY = 'sb_publishable_ZLbve8ADHIqc48h2YOQQUw_z8vox0s9';

let sbClient;
let cart = [];
let currentUser = null;

const OWNER_EMAIL = 'nazarivanyuk562@gmail.com';

window.onload = async () => {
    try {
        sbClient = supabase.createClient(SB_URL, SB_KEY);
        
        const { data: { session } } = await sbClient.auth.getSession();
        currentUser = session ? session.user : null;
        
        await updateAuthUI();

        sbClient.auth.onAuthStateChange(async (event, session) => {
            currentUser = session ? session.user : null;
            await updateAuthUI();
        });
    } catch (e) {
        console.error("Supabase Error:", e);
    }
};

async function updateAuthUI() {
    const authSect = document.getElementById('auth-section');
    const logoutBtn = document.getElementById('logout-btn');
    const histBtn = document.getElementById('history-btn');
    const adminBtn = document.getElementById('admin-panel-btn');

    if (!authSect || !logoutBtn) return;

    if (currentUser) {
        authSect.style.display = 'none';
        logoutBtn.style.display = 'block';
        histBtn.style.display = 'block';

        if (currentUser.email === OWNER_EMAIL) {
            adminBtn.style.display = 'block';
            adminBtn.innerText = "Власник 👑";
        } else {
            const { data } = await sbClient.from('admin_status').select('role').eq('user_email', currentUser.email).maybeSingle();
            if (data && (data.role === 'owner' || data.role === 'admin')) {
                adminBtn.style.display = 'block';
                adminBtn.innerText = data.role === 'owner' ? "Власник 👑" : "Адмін 🛠";
            }
        }
    } else {
        authSect.style.display = 'block';
        logoutBtn.style.display = 'none';
        histBtn.style.display = 'none';
        adminBtn.style.display = 'none';
    }
}

async function signIn() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { error } = await sbClient.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
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
    localStorage.clear();
    location.reload();
}

function toggleAuthModal() {
    const m = document.getElementById('auth-modal');
    m.style.display = (m.style.display === 'block') ? 'none' : 'block';
    document.getElementById('overlay').classList.add('active');
}

async function toggleHistoryModal() {
    const modal = document.getElementById('history-modal');
    const list = document.getElementById('history-list');
    if (!currentUser) return;

    modal.style.display = 'block';
    document.getElementById('overlay').classList.add('active');
    list.innerHTML = '<p style="color:black;">Завантаження...</p>';

    const { data, error } = await sbClient.from('orders').select('*').eq('user_email', currentUser.email).order('created_at', { ascending: false });
    
    if (error) {
        list.innerHTML = '<p style="color:red;">Помилка доступу до бази</p>';
    } else {
        list.innerHTML = data && data.length ? data.map(o => `
            <div style="padding:10px; border-bottom:1px solid #eee; color:black; background:#f9f9f9; margin-bottom:5px; border-radius:5px;">
                <b>Замовлення #${o.id.toString().slice(0,6)}</b><br>
                <span>${o.items_names}</span><br>
                <b>Сума: ${o.total_price} грн</b>
            </div>`).join('') : '<p style="color:black;">Історія порожня</p>';
    }
}

function addToCart(btn) {
    const d = btn.closest('.game-card').dataset;
    if (cart.find(i => i.title === d.title)) return;
    cart.push({ title: d.title, price: parseInt(d.price) || 0, img: d.img });
    updateUI();
}

function addToCartDirect(title, price, img) {
    if (cart.find(i => i.title === title)) return;
    cart.push({ title, price: parseInt(price) || 0, img });
    updateUI();
    closeModal();
}

function updateUI() {
    const countEl = document.getElementById('cart-count');
    const itemsCont = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    if (countEl) countEl.innerText = cart.length;
    let total = 0;
    if (itemsCont) {
        itemsCont.innerHTML = cart.length ? cart.map((item, i) => {
            total += item.price;
            return `<div class="cart-item" style="display:flex; gap:10px; margin-bottom:10px; align-items:center;">
                <img src="${item.img}" width="40" height="50" style="object-fit:cover; border-radius:5px;">
                <div style="flex:1; color:black;"><b>${item.title}</b><br>${item.price} грн</div>
                <span onclick="removeFromCart(${i})" style="color:red; cursor:pointer;">✕</span>
            </div>`;
        }).join('') : '<p style="text-align:center; color:gray; padding-top:20px;">Порожньо</p>';
    }
    if (totalEl) totalEl.innerText = total;
}

function removeFromCart(i) {
    cart.splice(i, 1);
    updateUI();
}

async function checkout() {
    if (!currentUser) { alert("Увійдіть!"); return; }
    if (!cart.length) return;
    const items = cart.map(i => i.title).join(', ');
    const total = cart.reduce((s, i) => s + i.price, 0);
    await sbClient.from('orders').insert([{ user_email: currentUser.email, items_names: items, total_price: total }]);
    window.location.href = 'https://donatello.to/OluxGameStore';
}

function toggleCart() {
    const s = document.getElementById('cart-sidebar');
    const active = s.classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active', active);
}

function closeModal() {
    document.querySelectorAll('.modal, .sidebar').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.modal-small').forEach(m => m.style.display = 'none');
    document.getElementById('overlay').classList.remove('active');
}

function toggleAdminPanel() {
    const modal = document.getElementById('admin-modal');
    modal.classList.add('active');
    document.getElementById('overlay').classList.add('active');
    loadAdminSection('orders');
}

async function loadAdminSection(section) {
    const content = document.getElementById('admin-content');
    content.innerHTML = '<p>Завантаження...</p>';
    const { data } = await sbClient.from('orders').select('*').order('created_at', { ascending: false });
    content.innerHTML = `<h3 style="color:black;">Всі замовлення</h3>` + (data || []).map(o => `
        <div style="padding:10px; border-bottom:1px solid #ddd; color:black;">
            <b>${o.user_email}</b>: ${o.total_price} грн<br><small>${o.items_names}</small>
        </div>`).join('');
}

function openDetails(btn) {
    const d = btn.closest('.game-card').dataset;
    const modalData = document.getElementById('modal-data');
    modalData.innerHTML = `
        <div class="modal-img-side"><img src="${d.img}" style="width:100%; border-radius:15px;"></div>
        <div class="modal-info-side">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h2 style="color:black;">${d.title}</h2>
            <div style="color:#d4af37; font-size:24px; font-weight:bold; margin: 10px 0;">${d.price} грн</div>
            <p style="color:#333;">${d.desc}</p>
            <div style="background:#f4f4f4; padding:10px; border-radius:10px; margin: 15px 0; color:black;">
                <p><b>ПК:</b> ${d.specs}</p>
            </div>
            <button class="buy-btn" style="width:100%;" onclick="addToCartDirect('${d.title}', ${d.price}, '${d.img}')">У КОШИК</button>
        </div>`;
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.onclick = () => {
        const genre = btn.dataset.genre;
        if (!genre) return;
        document.querySelector('.filter-btn.active')?.classList.remove('active');
        btn.classList.add('active');
        document.querySelectorAll('.game-card').forEach(card => {
            card.style.display = (genre === 'all' || card.dataset.genre === genre) ? 'block' : 'none';
        });
    };
});
