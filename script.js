const CONFIG = {
    SB_URL: 'https://yoxieszknznklpvnyvui.supabase.co',
    SB_KEY: 'sb_publishable_ZLbve8ADHIqc48h2YOQQUw_z8vox0s9',
    OWNER_EMAIL: 'nazarivanyuk562@gmail.com',
    DONATE_URL: 'https://donatello.to/OluxGameStore'
};

let sbClient = null;
let currentUser = null;
let cart = JSON.parse(localStorage.getItem('olux_cart')) || [];
let userRole = 'user';

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

    userRole = 'user';
    if (currentUser.email === CONFIG.OWNER_EMAIL) {
        userRole = 'owner';
    } else {
        const { data } = await sbClient.from('admin_status').select('role').eq('user_email', currentUser.email).maybeSingle();
        if (data) userRole = data.role;
    }

    if ((userRole === 'owner' || userRole === 'admin' || userRole === 'moderator') && adminBtn) {
        adminBtn.style.display = 'block';
        adminBtn.innerText = userRole === 'owner' ? "Власник 👑" : (userRole === 'admin' ? "Адмін 🛠" : "Модер 🛡");
        adminBtn.onclick = openAdminModal;
    }
}

function openAdminModal() {
    const modalData = document.getElementById('modal-data');
    const modal = document.getElementById('details-modal');
    if (!modalData || !modal) return;

    modalData.innerHTML = `
        <div class="modal-info-side" style="width: 100%; padding: 30px;">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h2 style="color:black; margin-bottom: 20px;">Панель керування: ${userRole.toUpperCase()}</h2>
            
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button class="filter-btn active" onclick="showAdminTab('add')">Додати гру</button>
                <button class="filter-btn" onclick="showAdminTab('orders')">Замовлення</button>
                ${userRole === 'owner' ? '<button class="filter-btn" onclick="showAdminTab('users')">Права</button>' : ''}
            </div>

            <div id="admin-tab-content">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <input type="text" id="g-title" placeholder="Назва гри" style="padding:10px; border-radius:8px; border:1px solid #ccc;">
                    <input type="number" id="g-price" placeholder="Ціна (грн)" style="padding:10px; border-radius:8px; border:1px solid #ccc;">
                    <input type="text" id="g-img" placeholder="URL Фото" style="padding:10px; border-radius:8px; border:1px solid #ccc;">
                    <input type="text" id="g-author" placeholder="Автор" style="padding:10px; border-radius:8px; border:1px solid #ccc;">
                    <input type="text" id="g-year" placeholder="Рік" style="padding:10px; border-radius:8px; border:1px solid #ccc;">
                    <select id="g-genre" style="padding:10px; border-radius:8px; border:1px solid #ccc;">
                        <option value="action">Action</option>
                        <option value="rpg">RPG</option>
                        <option value="horror">Horror</option>
                    </select>
                </div>
                <textarea id="g-desc" placeholder="Опис гри" style="width:100%; margin-top:15px; height:80px; padding:10px; border-radius:8px;"></textarea>
                <textarea id="g-specs" placeholder="Мінімальні вимоги (ОЗП, Відеокарта...)" style="width:100%; margin-top:10px; height:80px; padding:10px; border-radius:8px;"></textarea>
                <button class="buy-btn" style="width:100%; margin-top:20px;" onclick="saveNewGame()">ОПУБЛІКУВАТИ НА САЙТ</button>
            </div>
        </div>`;
    
    modal.classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

async function showAdminTab(tab) {
    const content = document.getElementById('admin-tab-content');
    if (tab === 'add') return openAdminModal();
    
    content.innerHTML = '<p style="color:black;">Завантаження...</p>';
    
    if (tab === 'orders') {
        const { data } = await sbClient.from('orders').select('*').order('created_at', { ascending: false });
        content.innerHTML = (data || []).map(o => `
            <div style="background:#f4f4f4; padding:10px; margin-bottom:10px; border-radius:8px; color:black;">
                <b>${o.user_email}</b> - ${o.total_price} грн<br><small>${o.items_names}</small>
            </div>`).join('') || '<p style="color:black;">Замовлень немає</p>';
    }

    if (tab === 'users') {
        content.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:10px;">
                <input type="email" id="u-email" placeholder="Email користувача" style="padding:10px;">
                <select id="u-role" style="padding:10px;">
                    <option value="admin">Адмін</option>
                    <option value="moderator">Модератор</option>
                </select>
                <button class="buy-btn" onclick="setRole()">НАДАТИ ПРАВА</button>
            </div>`;
    }
}

async function saveNewGame() {
    const game = {
        title: document.getElementById('g-title').value,
        price: document.getElementById('g-price').value,
        img: document.getElementById('g-img').value,
        author: document.getElementById('g-author').value,
        year: document.getElementById('g-year').value,
        description: document.getElementById('g-desc').value,
        specs: document.getElementById('g-specs').value,
        genre: document.getElementById('g-genre').value
    };
    const { error } = await sbClient.from('games').insert([game]);
    if (error) alert(error.message); else alert("Гру успішно додано!");
}

async function setRole() {
    const email = document.getElementById('u-email').value;
    const role = document.getElementById('u-role').value;
    const { error } = await sbClient.from('admin_status').upsert([{ user_email: email, role: role }]);
    if (error) alert(error.message); else alert("Права оновлено!");
}

async function toggleHistoryModal() {
    if (!currentUser) return;
    const modal = document.getElementById('history-modal');
    const list = document.getElementById('history-list');
    modal.style.display = 'block';
    document.getElementById('overlay').classList.add('active');
    list.innerHTML = 'Завантаження...';
    const { data } = await sbClient.from('orders').select('*').eq('user_email', currentUser.email).order('created_at', { ascending: false });
    list.innerHTML = data && data.length ? data.map(o => `
        <div style="padding:15px; border-bottom:1px solid #eee; color:black; background:white; margin-bottom:8px; border-radius:8px;">
            <div style="display:flex; justify-content:space-between;"><b>#${o.id.toString().slice(0,6)}</b> <span>${o.total_price} грн</span></div>
            <small style="color:gray;">${o.items_names}</small>
        </div>`).join('') : 'Порожньо';
}

function addToCart(btn) {
    const card = btn.closest('.game-card');
    const game = { title: card.dataset.title, price: parseFloat(card.dataset.price) || 0, img: card.dataset.img };
    if (cart.some(item => item.title === game.title)) return alert("Вже у кошику!");
    cart.push(game);
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
            return `<div class="cart-item" style="display:flex;gap:10px;margin-bottom:10px;align-items:center;color:black;">
                <img src="${item.img}" width="40" height="50" style="object-fit:cover;">
                <div style="flex:1;"><b>${item.title}</b><br>${item.price} грн</div>
                <span onclick="removeFromCart(${i})" style="color:red;cursor:pointer;">✕</span>
            </div>`;
        }).join('') : '<p style="text-align:center;color:gray;padding-top:20px;">Кошик порожній</p>';
    }
    if (totalEl) totalEl.innerText = total;
}

function removeFromCart(i) {
    cart.splice(i, 1);
    saveAndRenderCart();
}

async function checkout() {
    if (!currentUser) return toggleAuthModal();
    if (!cart.length) return alert("Кошик порожній!");
    const items = cart.map(i => i.title).join(', ');
    const total = cart.reduce((s, i) => s + i.price, 0);
    const { error } = await sbClient.from('orders').insert([{ user_email: currentUser.email, items_names: items, total_price: total }]);
    if (!error) {
        cart = [];
        saveAndRenderCart();
        window.location.href = CONFIG.DONATE_URL;
    } else {
        alert("Помилка: " + error.message);
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
            <div style="background:#f4f4f4; padding:10px; border-radius:10px; margin:15px 0; color:black; font-size:14px;">
                <p><b>Автор:</b> ${d.author}</p>
                <p><b>Рік:</b> ${d.year}</p>
                <p><b>Вимоги:</b> ${d.specs}</p>
            </div>
            <button class="buy-btn" style="width:100%;" onclick="addToCartDirect('${d.title}', ${d.price}, '${d.img}')">У КОШИК</button>
        </div>`;
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function addToCartDirect(title, price, img) {
    if (cart.some(item => item.title === title)) return alert("Вже у кошику!");
    cart.push({ title, price: parseFloat(price) || 0, img });
    saveAndRenderCart();
    closeModal();
}

async function signIn() {
    const email = document.getElementById('auth-email')?.value;
    const password = document.getElementById('auth-password')?.value;
    const { error } = await sbClient.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
}

async function signUp() {
    const email = document.getElementById('auth-email')?.value;
    const password = document.getElementById('auth-password')?.value;
    const { error } = await sbClient.auth.signUp({ email, password });
    if (error) alert(error.message); else alert("Перевірте пошту!");
}

async function signOut() {
    await sbClient.auth.signOut();
    location.reload();
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
