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

window.onload = async function() {
    try {
        sbClient = supabase.createClient(CONFIG.SB_URL, CONFIG.SB_KEY);
        
        const { data: { session } } = await sbClient.auth.getSession();
        currentUser = session?.user || null;

        sbClient.auth.onAuthStateChange((event, session) => {
            currentUser = session?.user || null;
            updateAuthUI();
        });

        document.addEventListener('click', function(e) {
            const btn = e.target.closest('#auth-section button');
            if (btn && !currentUser) {
                e.preventDefault();
                toggleAuthModal();
            }
        });

        await updateAuthUI();
        renderCart();
        initFilters();
    } catch (err) {
        console.error(err.message);
    }
};

async function updateAuthUI() {
    const authSect = document.getElementById('auth-section');
    const logoutBtn = document.getElementById('logout-btn');
    const adminBtn = document.getElementById('admin-panel-btn');
    const supportBtn = document.getElementById('support-btn');

    if (!currentUser) {
        if (authSect) authSect.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (adminBtn) adminBtn.style.display = 'none';
        if (supportBtn) supportBtn.style.display = 'none';
        return;
    }

    if (authSect) authSect.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'block';

    userRole = 'user';
    if (currentUser.email === CONFIG.OWNER_EMAIL) {
        userRole = 'owner';
    } else {
        const { data } = await sbClient
            .from('admin_status')
            .select('role')
            .eq('user_email', currentUser.email)
            .maybeSingle();
        if (data) userRole = data.role;
    }

    if (userRole === 'user') {
        if (supportBtn) {
            supportBtn.style.display = 'block';
            supportBtn.innerText = "ДОПОМОГА 🎧";
            supportBtn.onclick = openUserSupportForm;
        }
        if (adminBtn) adminBtn.style.display = 'none';
    } else {
        if (supportBtn) supportBtn.style.display = 'none';
        if (adminBtn) {
            adminBtn.style.display = 'block';
            adminBtn.innerText = userRole === 'owner' ? "ВЛАСНИК 👑" : (userRole === 'admin' ? "АДМІН 🛠" : "МОДЕР 🛡");
            adminBtn.onclick = openManagementPanel;
        }
    }
}

async function signIn() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { data, error } = await sbClient.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else closeModal();
}

async function signUp() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { error } = await sbClient.auth.signUp({ email, password });
    if (error) alert(error.message);
    else { alert("Лист надіслано!"); closeModal(); }
}

async function signOut() {
    await sbClient.auth.signOut();
    localStorage.removeItem('sb-' + CONFIG.SB_URL.split('//')[1].split('.')[0] + '-auth-token');
    location.reload();
}

function openUserSupportForm() {
    const modalData = document.getElementById('modal-data');
    modalData.innerHTML = `
        <div style="padding: 30px; color: black; background: white; border-radius: 15px;">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h2>Підтримка Olux</h2>
            <textarea id="support-text-input" placeholder="Опишіть вашу проблему..." style="width: 100%; height: 150px; padding: 10px; margin-top: 10px; border: 1px solid #ccc; border-radius: 8px; font-size:16px; width: 100%; box-sizing: border-box;"></textarea>
            <button onclick="submitTicketToDatabase()" style="width: 100%; margin-top: 15px; padding: 15px; background: #f1c40f; border: none; font-weight: bold; cursor: pointer; border-radius: 8px;">ВІДПРАВИТИ</button>
        </div>
    `;
    openMainModal();
}

async function submitTicketToDatabase() {
    const msg = document.getElementById('support-text-input').value.trim();
    if (msg.length < 5) return alert("Занадто коротко");
    const { error } = await sbClient.from('support_tickets').insert([{ user_email: currentUser.email, message: msg }]);
    if (error) alert(error.message);
    else { alert("Надіслано!"); closeModal(); }
}

function openManagementPanel() {
    const modalData = document.getElementById('modal-data');
    let nav = `<button class="adm-nav-item" onclick="switchAdminTab('tickets')">ТИКЕТИ</button>`;
    if (['admin', 'owner'].includes(userRole)) {
        nav += `<button class="adm-nav-item" onclick="switchAdminTab('add_game')">+ ГРА</button><button class="adm-nav-item" onclick="switchAdminTab('all_orders')">ПРОДАЖІ</button>`;
    }
    if (userRole === 'owner') nav += `<button class="adm-nav-item" onclick="switchAdminTab('users')">ПРАВА</button>`;
    modalData.innerHTML = `
        <div style="padding: 25px; color: black; background: white; border-radius: 15px; width: 100%; box-sizing: border-box;">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h2>АДМІН-ПАНЕЛЬ</h2>
            <div style="display: flex; gap: 5px; margin: 15px 0; flex-wrap: wrap;">${nav}</div>
            <div id="admin-view-port" style="background: #f9f9f9; padding: 15px; border-radius: 8px; min-height: 300px;"></div>
        </div>`;
    openMainModal();
    switchAdminTab('tickets');
}

async function switchAdminTab(tab) {
    const view = document.getElementById('admin-view-port');
    if (!view) return;
    view.innerHTML = "Завантаження...";
    if (tab === 'tickets') {
        const { data } = await sbClient.from('support_tickets').select('*').order('created_at', { ascending: false });
        view.innerHTML = data?.length ? data.map(t => `<div style="border:1px solid #ddd; padding:10px; margin-bottom:10px; background:#fff; border-radius:5px;"><b>${t.user_email}</b><p>${t.message}</p></div>`).join('') : "Порожньо";
    } else if (tab === 'add_game') {
        view.innerHTML = `
            <input id="g-title" placeholder="Назва" style="width:100%; margin-bottom:5px; padding:10px; box-sizing: border-box;">
            <input id="g-price" type="number" placeholder="Ціна" style="width:100%; margin-bottom:5px; padding:10px; box-sizing: border-box;">
            <input id="g-img" placeholder="Картинка URL" style="width:100%; margin-bottom:5px; padding:10px; box-sizing: border-box;">
            <button onclick="saveNewGame()" style="width:100%; padding:10px; background:green; color:white; border:none; cursor:pointer; font-weight:bold;">ЗБЕРЕГТИ</button>`;
    } else if (tab === 'all_orders') {
        const { data } = await sbClient.from('orders').select('*').order('created_at', { ascending: false });
        view.innerHTML = data?.length ? data.map(o => `<div style="border-bottom:1px solid #eee; padding:5px;">${o.user_email} - ${o.total_price} грн</div>`).join('') : "Порожньо";
    } else if (tab === 'users') {
        view.innerHTML = `
            <input id="u-email" placeholder="Email" style="width:100%; margin-bottom:5px; padding:10px; box-sizing: border-box;">
            <select id="u-role" style="width:100%; margin-bottom:10px; padding:10px; box-sizing: border-box;">
                <option value="moderator">Модератор</option>
                <option value="admin">Адмін</option>
            </select>
            <button onclick="assignRole()" style="width:100%; padding:10px; background:blue; color:white; border:none; cursor:pointer;">ЗМІНИТИ ПРАВА</button>`;
    }
}

async function saveNewGame() {
    const game = {
        title: document.getElementById('g-title').value,
        price: parseFloat(document.getElementById('g-price').value),
        img: document.getElementById('g-img').value || 'https://via.placeholder.com/150',
        genre: 'Action',
        author: 'Olux',
        year: '2024'
    };
    const { error } = await sbClient.from('games').insert([game]);
    if (error) alert(error.message);
    else { alert("Додано!"); location.reload(); }
}

async function assignRole() {
    const email = document.getElementById('u-email').value;
    const role = document.getElementById('u-role').value;
    const { error } = await sbClient.from('admin_status').upsert([{ user_email: email, role: role }]);
    if (error) alert(error.message);
    else alert("Права оновлено");
}

function addToCartDirect(title, price, img) {
    if (cart.some(i => i.title === title)) return alert("Вже у кошику!");
    cart.push({ title, price, img });
    saveCart();
    closeModal();
    toggleCart(); 
}

function addToCart(btn) {
    const c = btn.closest('.game-card');
    const g = { title: c.dataset.title, price: parseFloat(c.dataset.price), img: c.dataset.img };
    if (cart.some(i => i.title === g.title)) return alert("Вже у кошику!");
    cart.push(g);
    saveCart();
    toggleCart();
}

function saveCart() {
    localStorage.setItem('olux_cart', JSON.stringify(cart));
    renderCart();
}

function renderCart() {
    const count = document.getElementById('cart-count');
    const items = document.getElementById('cart-items');
    const total = document.getElementById('cart-total');
    
    if (count) count.innerText = cart.length;
    
    let sum = 0;
    if (items) {
        items.innerHTML = cart.length ? cart.map((item, i) => {
            sum += item.price;
            return `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; color:black; background:#fff; padding:15px; border-radius:12px; border:1px solid #ddd; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                    <div style="display:flex; align-items:center; gap:20px;">
                        <img src="${item.img}" style="width:90px; height:90px; border-radius:10px; object-fit:cover; flex-shrink:0;">
                        <div>
                            <div style="font-size:18px; font-weight:bold; color:#222; margin-bottom:5px;">${item.title}</div>
                            <div style="font-size:17px; color:#d4af37; font-weight:bold;">${item.price} грн</div>
                        </div>
                    </div>
                    <span onclick="removeFromCart(${i})" style="color:#ff4444; cursor:pointer; font-size:36px; padding:10px; font-weight:bold;">&times;</span>
                </div>`;
        }).join('') : '<div style="text-align:center; color:#888; margin-top:60px; font-size:20px;">Ваш кошик ще порожній</div>';
    }
    if (total) total.innerText = sum;
}

function removeFromCart(i) {
    cart.splice(i, 1);
    saveCart();
}

async function checkout() {
    if (!currentUser) {
        closeModal();
        toggleAuthModal();
        return;
    }
    if (!cart.length) {
        alert("Кошик порожній!");
        return;
    }
    
    const { error } = await sbClient.from('orders').insert([{
        user_email: currentUser.email,
        items_names: cart.map(i => i.title).join(', '),
        total_price: cart.reduce((s, i) => s + i.price, 0)
    }]);

    if (!error) {
        cart = [];
        saveCart();
        window.location.href = CONFIG.DONATE_URL;
    } else {
        alert(error.message);
    }
}

function openDetails(btn) {
    const d = btn.closest('.game-card').dataset;
    const modalData = document.getElementById('modal-data');
    modalData.innerHTML = `
        <div style="display:flex; flex-wrap:wrap; background:white; border-radius:15px; overflow:hidden; width: 100%;">
            <div style="flex:1; min-width:300px;"><img src="${d.img}" style="width:100%; height:100%; object-fit:cover;"></div>
            <div style="flex:1.2; padding:30px; color:black; min-width:300px; box-sizing: border-box;">
                <span class="close-btn-large" onclick="closeModal()">&times;</span>
                <h2 style="margin-top:0;">${d.title}</h2>
                <div style="font-size:26px; color:#d4af37; font-weight:bold; margin-bottom:15px;">${d.price} грн</div>
                <p style="margin-bottom:25px; color:#555; line-height:1.6;">${d.desc}</p>
                <button style="width:100%; padding:18px; background:#4a3427; color:white; border:none; cursor:pointer; font-weight:bold; border-radius:10px; font-size:16px;" onclick="addToCartDirect('${d.title}', ${d.price}, '${d.img}')">ДОДАТИ В КОШИК</button>
            </div>
        </div>
    `;
    openMainModal();
}

function initFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if(!btn.dataset.genre) return;
        btn.onclick = () => {
            document.querySelectorAll('.game-card').forEach(card => {
                card.style.display = (btn.dataset.genre === 'all' || card.dataset.genre === btn.dataset.genre) ? 'block' : 'none';
            });
        };
    });
}

function openMainModal() {
    const m = document.getElementById('details-modal');
    const o = document.getElementById('overlay');
    if (m && o) {
        m.classList.add('active');
        o.classList.add('active');
        m.style.zIndex = "10002";
        o.style.zIndex = "10001";
    }
}

function closeModal() {
    document.querySelectorAll('.modal, .sidebar').forEach(m => m.classList.remove('active'));
    const am = document.getElementById('auth-modal');
    if (am) am.style.display = 'none';
    const o = document.getElementById('overlay');
    if (o) {
        o.classList.remove('active');
        o.style.zIndex = "";
    }
}

function toggleCart() {
    const s = document.getElementById('cart-sidebar');
    const o = document.getElementById('overlay');
    if (!s || !o) return;
    
    if (s.classList.contains('active')) {
        s.classList.remove('active');
        o.classList.remove('active');
        o.style.zIndex = "";
    } else {
        s.classList.add('active');
        o.classList.add('active');
        s.style.zIndex = "10002";
        o.style.zIndex = "10001";
    }
}

function toggleAuthModal() {
    const m = document.getElementById('auth-modal');
    const o = document.getElementById('overlay');
    if (m && o) {
        m.style.display = 'block';
        m.style.zIndex = "10003"; 
        o.style.zIndex = "10002";
        o.classList.add('active');
    }
}
