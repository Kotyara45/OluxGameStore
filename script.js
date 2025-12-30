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

window.onload = async () => {
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
};

async function updateAuthUI() {
    const authSection = document.getElementById('auth-section');
    const logoutButton = document.getElementById('logout-btn');
    const historyButton = document.getElementById('history-btn');
    const adminPanelButton = document.getElementById('admin-panel-btn');

    if (!currentUser) {
        if (authSection) authSection.style.display = 'block';
        if (logoutButton) logoutButton.style.display = 'none';
        if (historyButton) historyButton.style.display = 'none';
        if (adminPanelButton) adminPanelButton.style.display = 'none';
        return;
    }

    if (authSection) authSection.style.display = 'none';
    if (logoutButton) logoutButton.style.display = 'block';
    if (historyButton) historyButton.style.display = 'block';

    userRole = 'user';
    if (currentUser.email === CONFIG.OWNER_EMAIL) {
        userRole = 'owner';
    } else {
        const { data } = await sbClient.from('admin_status').select('role').eq('user_email', currentUser.email).maybeSingle();
        if (data) userRole = data.role;
    }

    if (adminPanelButton && (userRole === 'owner' || userRole === 'admin' || userRole === 'moderator')) {
        adminPanelButton.style.display = 'block';
        adminPanelButton.innerText = userRole === 'owner' ? "Власник 👑" : (userRole === 'admin' ? "Адмін 🛠" : "Модер 🛡");
        adminPanelButton.onclick = openAdminModal;
    }
}

function openAdminModal() {
    const modalData = document.getElementById('modal-data');
    const detailsModal = document.getElementById('details-modal');
    if (!modalData || !detailsModal) return;

    let navigationButtons = `<button class="filter-btn active" onclick="showAdminTab('support')">Підтримка 🎧</button>`;
    if (userRole === 'owner' || userRole === 'admin') {
        navigationButtons += `<button class="filter-btn" onclick="showAdminTab('add-game')">Додати гру ➕</button>`;
        navigationButtons += `<button class="filter-btn" onclick="showAdminTab('all-orders')">Замовлення 📦</button>`;
    }
    if (userRole === 'owner') {
        navigationButtons += `<button class="filter-btn" onclick="showAdminTab('manage-users')">Права 🔑</button>`;
    }

    modalData.innerHTML = `
        <div class="modal-info-side" style="width: 100%; padding: 30px; overflow-y: auto; max-height: 90vh;">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h2 style="color:black; margin-bottom: 20px;">Керування магазином (${userRole})</h2>
            <div style="display: flex; gap: 10px; margin-bottom: 25px; flex-wrap: wrap;">${navigationButtons}</div>
            <div id="admin-tab-content" style="border-top: 1px solid #ddd; padding-top:20px;"></div>
        </div>`;
    
    detailsModal.classList.add('active');
    document.getElementById('overlay').classList.add('active');
    showAdminTab('support');
}

async function showAdminTab(tabName) {
    const contentArea = document.getElementById('admin-tab-content');
    contentArea.innerHTML = '<p style="color:black;">Завантаження...</p>';
    
    if (tabName === 'add-game') {
        contentArea.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <input type="text" id="new-g-title" placeholder="Назва гри">
                <input type="number" id="new-g-price" placeholder="Ціна грн">
                <input type="text" id="new-g-img" placeholder="URL Фото">
                <input type="text" id="new-g-author" placeholder="Автор">
                <input type="text" id="new-g-year" placeholder="Рік виходу">
                <select id="new-g-genre">
                    <option value="action">Екшн</option><option value="rpg">RPG</option><option value="horror">Хорор</option>
                </select>
            </div>
            <textarea id="new-g-desc" placeholder="Опис" style="width:100%; margin-top:10px; height:60px;"></textarea>
            <textarea id="new-g-specs" placeholder="Вимоги" style="width:100%; margin-top:10px; height:60px;"></textarea>
            <button class="buy-btn" style="width:100%; margin-top:15px;" onclick="processGameUpload()">ОПУБЛІКУВАТИ</button>`;
    } else if (tabName === 'support') {
        const { data } = await sbClient.from('support_tickets').select('*').order('created_at', { ascending: false });
        contentArea.innerHTML = `<h3>Запити</h3>` + (data || []).map(t => `
            <div style="background:#f9f9f9; padding:10px; margin-bottom:10px; border-radius:8px; color:black; border-left:4px solid gold;">
                <b>${t.user_email}</b><p>${t.message}</p>
                <a href="mailto:${t.user_email}" style="font-size:12px;">Відповісти</a>
            </div>`).join('') || 'Немає запитів';
    } else if (tabName === 'all-orders') {
        const { data } = await sbClient.from('orders').select('*').order('created_at', { ascending: false });
        contentArea.innerHTML = (data || []).map(o => `<div style="color:black; font-size:12px; border-bottom:1px solid #eee; padding:5px;"><b>${o.user_email}</b>: ${o.total_price} грн<br>${o.items_names}</div>`).join('');
    } else if (tabName === 'manage-users') {
        contentArea.innerHTML = `
            <input type="email" id="new-user-email" placeholder="Email"><br>
            <select id="new-user-role"><option value="moderator">Модер</option><option value="admin">Адмін</option></select><br>
            <button class="buy-btn" onclick="processRoleAssignment()">НАДАТИ ПРАВА</button>`;
    }
}

async function processGameUpload() {
    const game = {
        title: document.getElementById('new-g-title').value,
        price: parseFloat(document.getElementById('new-g-price').value),
        img: document.getElementById('new-g-img').value,
        author: document.getElementById('new-g-author').value,
        year: document.getElementById('new-g-year').value,
        description: document.getElementById('new-g-desc').value,
        specs: document.getElementById('new-g-specs').value,
        genre: document.getElementById('new-g-genre').value
    };
    const { error } = await sbClient.from('games').insert([game]);
    if (error) alert(error.message); else { alert("Додано!"); closeModal(); }
}

async function processRoleAssignment() {
    const email = document.getElementById('new-user-email').value;
    const role = document.getElementById('new-user-role').value;
    const { error } = await sbClient.from('admin_status').upsert([{ user_email: email, role: role }]);
    if (error) alert(error.message); else alert("Готово!");
}

function openUserSupport() {
    if (!currentUser) return toggleAuthModal();
    const modalData = document.getElementById('modal-data');
    modalData.innerHTML = `
        <div class="modal-info-side" style="width:100%; padding:30px;">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h2 style="color:black;">Підтримка</h2>
            <textarea id="user-support-msg" style="width:100%; height:150px; margin-top:20px;"></textarea>
            <button class="buy-btn" style="width:100%; margin-top:15px;" onclick="submitTicket()">ВІДПРАВИТИ</button>
        </div>`;
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

async function submitTicket() {
    const msg = document.getElementById('user-support-msg').value;
    const { error } = await sbClient.from('support_tickets').insert([{ user_email: currentUser.email, message: msg }]);
    if (error) alert(error.message); else { alert("Надіслано!"); closeModal(); }
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
            <div style="background:#f4f4f4; padding:10px; border-radius:10px; color:black; font-size:13px; margin:10px 0;">
                <p><b>Автор:</b> ${d.author}</p><p><b>Рік:</b> ${d.year}</p><p><b>Вимоги:</b> ${d.specs}</p>
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

function addToCart(btn) {
    const card = btn.closest('.game-card');
    const game = { title: card.dataset.title, price: parseFloat(card.dataset.price) || 0, img: card.dataset.img };
    if (cart.some(item => item.title === game.title)) return alert("Вже у кошику!");
    cart.push(game);
    saveAndRenderCart();
}

function saveAndRenderCart() { localStorage.setItem('olux_cart', JSON.stringify(cart)); renderCart(); }

function renderCart() {
    const countEl = document.getElementById('cart-count');
    const itemsCont = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    if (countEl) countEl.innerText = cart.length;
    let total = 0;
    if (itemsCont) {
        itemsCont.innerHTML = cart.length ? cart.map((item, i) => {
            total += item.price;
            return `<div style="display:flex;gap:10px;margin-bottom:10px;align-items:center;color:black;">
                <img src="${item.img}" width="40" height="50">
                <div style="flex:1;"><b>${item.title}</b><br>${item.price} грн</div>
                <span onclick="removeFromCart(${i})" style="color:red;cursor:pointer;">✕</span>
            </div>`;
        }).join('') : 'Порожньо';
    }
    if (totalEl) totalEl.innerText = total;
}

function removeFromCart(i) { cart.splice(i, 1); saveAndRenderCart(); }

async function checkout() {
    if (!currentUser) return toggleAuthModal();
    if (!cart.length) return alert("Порожньо!");
    const items = cart.map(i => i.title).join(', ');
    const total = cart.reduce((s, i) => s + i.price, 0);
    const { error } = await sbClient.from('orders').insert([{ user_email: currentUser.email, items_names: items, total_price: total }]);
    if (!error) { cart = []; saveAndRenderCart(); window.location.href = CONFIG.DONATE_URL; }
}

async function toggleHistoryModal() {
    if (!currentUser) return;
    const modal = document.getElementById('history-modal');
    const list = document.getElementById('history-list');
    modal.style.display = 'block';
    document.getElementById('overlay').classList.add('active');
    list.innerHTML = 'Завантаження...';
    const { data } = await sbClient.from('orders').select('*').eq('user_email', currentUser.email).order('created_at', { ascending: false });
    list.innerHTML = data && data.length ? data.map(o => `<div style="padding:10px;border-bottom:1px solid #eee;color:black;"><b>#${o.id.toString().slice(0,6)}</b> - ${o.total_price} грн<br><small>${o.items_names}</small></div>`).join('') : 'Порожньо';
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

async function signOut() { await sbClient.auth.signOut(); location.reload(); }

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
