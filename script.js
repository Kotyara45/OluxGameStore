const SB_URL = 'https://yoxieszknznklpvnyvui.supabase.co';
const SB_KEY = 'sb_publishable_ZLbve8ADHIqc48h2YOQQUw_z8vox0s9';

let sbClient;
let cart = [];
let currentUser = null;

window.onload = async () => {
    try {
        sbClient = supabase.createClient(SB_URL, SB_KEY);

        sbClient.auth.onAuthStateChange(async (event, session) => {
            currentUser = session ? session.user : null;
            await updateAuthUI();
        });

        const { data: { session } } = await sbClient.auth.getSession();
        currentUser = session ? session.user : null;
        await updateAuthUI();
    } catch (e) {
        console.error("Помилка ініціалізації:", e);
    }
};

async function updateAuthUI() {
    const authSect = document.getElementById('auth-section');
    const logoutBtn = document.getElementById('logout-btn');
    const histBtn = document.getElementById('history-btn');
    const adminBtn = document.getElementById('admin-panel-btn');

    if (currentUser) {
        if (authSect) authSect.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (histBtn) histBtn.style.display = 'block';

        try {
            const { data: roleData, error } = await sbClient
                .from('admin_status')
                .select('role')
                .eq('user_email', currentUser.email)
                .maybeSingle();

            if (roleData && adminBtn) {
                adminBtn.style.display = 'block';
                adminBtn.innerText = roleData.role === 'owner' ? "Власник 👑" : "Адмін 🛠";
            } else if (currentUser.email === 'nazarivanyuk562@gmail.com' && adminBtn) {
                // Запасний варіант, якщо база не відповіла
                adminBtn.style.display = 'block';
                adminBtn.innerText = "Власник 👑";
            }
        } catch (e) {
            console.warn("Не вдалося завантажити роль, використовую локальну перевірку.");
            if (currentUser.email === 'nazarivanyuk562@gmail.com' && adminBtn) {
                adminBtn.style.display = 'block';
                adminBtn.innerText = "Власник 👑";
            }
        }
    } else {
        if (authSect) authSect.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (histBtn) histBtn.style.display = 'none';
        if (adminBtn) adminBtn.style.display = 'none';
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
    localStorage.clear(); // Очищуємо кеш
    location.reload();
}

async function toggleHistoryModal() {
    const modal = document.getElementById('history-modal');
    const list = document.getElementById('history-list');
    const overlay = document.getElementById('overlay');

    if (!currentUser) return;

    modal.style.display = 'block';
    overlay.classList.add('active');
    list.innerHTML = '<p style="color:black;">Завантаження...</p>';

    const { data, error } = await sbClient
        .from('orders')
        .select('*')
        .eq('user_email', currentUser.email)
        .order('created_at', { ascending: false });

    if (error) {
        list.innerHTML = `<p style="color:red;">Помилка: ${error.message}</p>`;
    } else {
        list.innerHTML = data && data.length ? data.map(o => `
            <div style="padding:10px; border-bottom:1px solid #eee; color:black;">
                <b>Замовлення #${o.id.toString().slice(0,8)}</b> - ${o.total_price} грн<br>
                <small>${o.items_names}</small>
            </div>`).join('') : '<p style="color:black;">Історія порожня</p>';
    }
}

function addToCart(btn) {
    const d = btn.closest('.game-card').dataset;
    const price = parseInt(d.price) || 0;
    if (cart.find(i => i.title === d.title)) return;
    cart.push({ title: d.title, price: price, img: d.img });
    updateUI();
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
    if (!currentUser) { alert("Увійдіть в акаунт!"); return; }
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

function toggleAuthModal() {
    const m = document.getElementById('auth-modal');
    m.style.display = m.style.display === 'block' ? 'none' : 'block';
    document.getElementById('overlay').classList.add('active');
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
    content.innerHTML = `<h3 style="color:black;">Усі замовлення</h3>` + (data || []).map(o => `
        <div style="padding:10px; border-bottom:1px solid #ddd; color:black;">
            <b>${o.user_email}</b>: ${o.total_price} грн<br><small>${o.items_names}</small>
        </div>`).join('');
}
