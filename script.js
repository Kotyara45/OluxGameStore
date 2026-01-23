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
let favorites = JSON.parse(localStorage.getItem('olux_favs')) || [];

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
        
        injectSortAndFavorites();
        attachHeartsToCards();
        
        const observer = new MutationObserver(() => attachHeartsToCards());
        const target = document.querySelector('.games-grid') || document.querySelector('.catalog-grid') || document.body;
        if (target) observer.observe(target, { childList: true, subtree: true });

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
        <div style="padding: 25px; color: black; background: white; border-radius: 15px; width: 100%; box-sizing: border-box; max-height: 80vh; overflow-y: auto;">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h2 style="margin-bottom: 20px;">ПАНЕЛЬ КЕРУВАННЯ</h2>
            <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">${nav}</div>
            <div id="admin-view-port" style="background: #f1f1f1; padding: 20px; border-radius: 10px; min-height: 300px;"></div>
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
        view.innerHTML = `<h3>Тикети підтримки</h3>` + (data?.length ? data.map(t => `<div style="border:1px solid #ccc; padding:15px; margin-bottom:10px; background:#fff; border-radius:8px;"><b>${t.user_email}</b><div style="font-size:12px; color:#777; margin-bottom:5px;">${new Date(t.created_at).toLocaleString()}</div><p>${t.message}</p></div>`).join('') : "Тикетів немає");
    } else if (tab === 'add_game') {
        view.innerHTML = `
            <h3>Додати нову гру</h3>
            <input id="g-title" placeholder="Назва гри" style="width:100%; margin-bottom:10px; padding:12px; box-sizing: border-box;">
            <input id="g-price" type="number" placeholder="Ціна (грн)" style="width:100%; margin-bottom:10px; padding:12px; box-sizing: border-box;">
            <input id="g-img" placeholder="URL зображення" style="width:100%; margin-bottom:10px; padding:12px; box-sizing: border-box;">
            <input id="g-author" placeholder="Розробник" style="width:100%; margin-bottom:10px; padding:12px; box-sizing: border-box;">
            <input id="g-year" placeholder="Рік випуску" style="width:100%; margin-bottom:10px; padding:12px; box-sizing: border-box;">
            <textarea id="g-specs" placeholder="Системні вимоги" style="width:100%; margin-bottom:10px; padding:12px; box-sizing: border-box; height: 80px;"></textarea>
            <textarea id="g-desc" placeholder="Опис гри" style="width:100%; margin-bottom:10px; padding:12px; box-sizing: border-box; height: 80px;"></textarea>
            <select id="g-genre" style="width:100%; margin-bottom:15px; padding:12px; box-sizing: border-box;">
                <option value="Action">Action</option>
                <option value="RPG">RPG</option>
                <option value="Shooter">Shooter</option>
                <option value="Simulator">Simulator</option>
                <option value="Strategy">Strategy</option>
            </select>
            <button onclick="saveNewGame()" style="width:100%; padding:15px; background:green; color:white; border:none; cursor:pointer; font-weight:bold; border-radius: 8px;">ОПУБЛІКУВАТИ</button>`;
    } else if (tab === 'all_orders') {
        const { data } = await sbClient.from('orders').select('*').order('created_at', { ascending: false });
        view.innerHTML = `<h3>Історія замовлень</h3>` + (data?.length ? data.map(o => `<div style="border-bottom:1px solid #ccc; padding:10px 0;"><b>${o.user_email}</b><br><span style="color:#27ae60; font-weight:bold;">${o.total_price} грн</span><br><small>${o.items_names}</small><div style="font-size:10px; color:#999;">${new Date(o.created_at).toLocaleString()}</div></div>`).join('') : "Замовлень немає");
    } else if (tab === 'users') {
        view.innerHTML = `
            <h3>Керування правами</h3>
            <input id="u-email" placeholder="Email користувача" style="width:100%; margin-bottom:10px; padding:12px; box-sizing: border-box;">
            <select id="u-role" style="width:100%; margin-bottom:15px; padding:12px; box-sizing: border-box;">
                <option value="moderator">Модератор</option>
                <option value="admin">Адміністратор</option>
            </select>
            <button onclick="assignRole()" style="width:100%; padding:15px; background:#2980b9; color:white; border:none; cursor:pointer; font-weight:bold; border-radius: 8px;">ЗМІНИТИ ПРАВА</button>`;
    }
}

async function saveNewGame() {
    const game = {
        title: document.getElementById('g-title').value,
        price: parseFloat(document.getElementById('g-price').value),
        img: document.getElementById('g-img').value || 'https://via.placeholder.com/300x400',
        genre: document.getElementById('g-genre').value,
        author: document.getElementById('g-author').value || 'Невідомо',
        year: document.getElementById('g-year').value || '2024',
        specs: document.getElementById('g-specs').value || 'Мінімальні',
        desc: document.getElementById('g-desc').value || 'Немає опису'
    };
    const { error } = await sbClient.from('games').insert([game]);
    if (error) alert(error.message);
    else { alert("Гру додано до магазину!"); location.reload(); }
}

async function assignRole() {
    const email = document.getElementById('u-email').value;
    const role = document.getElementById('u-role').value;
    const { error } = await sbClient.from('admin_status').upsert([{ user_email: email, role: role }]);
    if (error) alert(error.message);
    else alert("Роль успішно оновлено для " + email);
}

function addToCartDirect(title, price, img) {
    if (cart.some(i => i.title === title)) return alert("Ця гра вже у кошику!");
    cart.push({ title, price, img });
    saveCart();
    closeModal();
    toggleCart(); 
}

function addToCart(btn) {
    const c = btn.closest('.game-card');
    const g = { 
        title: c.dataset.title, 
        price: parseFloat(c.dataset.price), 
        img: c.dataset.img 
    };
    if (cart.some(i => i.title === g.title)) return alert("Ця гра вже у кошику!");
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
                        <img src="${item.img}" style="width:85px; height:85px; border-radius:10px; object-fit:cover; flex-shrink:0;">
                        <div>
                            <div style="font-size:17px; font-weight:bold; color:#222; margin-bottom:5px;">${item.title}</div>
                            <div style="font-size:16px; color:#d4af37; font-weight:bold;">${item.price} грн</div>
                        </div>
                    </div>
                    <span onclick="removeFromCart(${i})" style="color:#ff4444; cursor:pointer; font-size:32px; padding:10px; font-weight:bold;">&times;</span>
                </div>`;
        }).join('') : '<div style="text-align:center; color:#888; margin-top:60px; font-size:20px;">Ваш кошик порожній</div>';
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
        alert("Помилка: " + error.message);
    }
}

function openDetails(btn) {
    const d = btn.closest('.game-card').dataset;
    const modalData = document.getElementById('modal-data');
    modalData.innerHTML = `
        <div style="display:flex; flex-wrap:wrap; background:white; border-radius:15px; overflow:hidden; width: 100%; max-width: 900px;">
            <div style="flex:1; min-width:300px;"><img src="${d.img}" style="width:100%; height:100%; object-fit:cover;"></div>
            <div style="flex:1.2; padding:35px; color:black; min-width:300px; box-sizing: border-box; position:relative;">
                <span class="close-btn-large" onclick="closeModal()" style="position:absolute; right:20px; top:10px; font-size:35px; cursor:pointer;">&times;</span>
                <h2 style="margin-top:0; font-size:32px; color:#111;">${d.title}</h2>
                <div style="font-size:28px; color:#d4af37; font-weight:bold; margin-bottom:20px;">${d.price} грн</div>
                <p style="margin-bottom:25px; color:#444; line-height:1.7; font-size:16px;">${d.desc}</p>
                <div style="background:#f9f9f9; padding:20px; border-radius:12px; margin-bottom:25px; font-size:14px; color:#333; border-left: 5px solid #d4af37;">
                    <div style="margin-bottom:8px;"><b>РОЗРОБНИК:</b> ${d.author}</div>
                    <div style="margin-bottom:8px;"><b>РІК ВИПУСКУ:</b> ${d.year}</div>
                    <div style="line-height:1.4;"><b>СИСТЕМНІ ВИМОГИ:</b><br>${d.specs}</div>
                </div>
                <button style="width:100%; padding:20px; background:#4a3427; color:white; border:none; cursor:pointer; font-weight:bold; border-radius:12px; font-size:18px; transition: 0.3s;" onclick="addToCartDirect('${d.title}', ${d.price}, '${d.img}')">ДОДАТИ В КОШИК</button>
            </div>
        </div>
    `;
    openMainModal();
}

function initFilters() {
    const filterContainer = document.querySelector('.filters');
    if (filterContainer) {
        filterContainer.style.display = "flex";
        filterContainer.style.flexWrap = "wrap";
        filterContainer.style.alignItems = "center";
        filterContainer.style.gap = "8px";
        filterContainer.style.marginBottom = "5px";
        filterContainer.style.padding = "10px 0";
    }
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if(!btn.dataset.genre) return;
        btn.onclick = () => {
            document.querySelector('.filter-btn.active')?.classList.remove('active');
            btn.classList.add('active');
            applyGlobalFilters();
        };
    });
}

function injectSortAndFavorites() {
    const filterRow = document.querySelector('.filters');
    if (!filterRow) return;

    if (document.getElementById('fav-sort-group')) return;

    const group = document.createElement('div');
    group.id = 'fav-sort-group';
    group.style.display = 'flex';
    group.style.alignItems = 'center';
    group.style.gap = '10px';
    group.style.marginLeft = 'auto';

    group.innerHTML = `
        <button id="favorites-trigger" onclick="toggleFavView()" style="padding:10px 15px; border-radius:8px; border:none; background:#2c3e50; color:white; font-weight:bold; cursor:pointer; display:flex; align-items:center; gap:5px; transition: 0.3s;">
            <span style="color:white !important; opacity:1 !important;">Обране ⭐</span>
            <span id="fav-count" style="color:white !important;">${favorites.length}</span>
        </button>
        <select id="main-sort-select" onchange="sortGames(this.value)" style="padding:10px; border-radius:8px; border:none; background:#2c3e50; color:white; font-weight:bold; cursor:pointer;">
            <option value="rating">Сортування</option>
            <option value="cheap">Ціна: низька</option>
            <option value="expensive">Ціна: висока</option>
            <option value="rating">За рейтингом</option>
        </select>
    `;
    filterRow.appendChild(group);
}

function applyGlobalFilters() {
    const activeGenre = document.querySelector('.filter-btn.active')?.dataset.genre || 'all';
    const favTrigger = document.getElementById('favorites-trigger');
    const isFavOnly = favTrigger ? favTrigger.classList.contains('active') : false;
    
    document.querySelectorAll('.game-card').forEach(card => {
        const matchesGenre = activeGenre === 'all' || card.dataset.genre === activeGenre;
        const matchesFav = !isFavOnly || favorites.includes(card.dataset.title);
        card.style.display = (matchesGenre && matchesFav) ? 'block' : 'none';
    });
}

function toggleFavView() {
    const btn = document.getElementById('favorites-trigger');
    if (!btn) return;
    
    const isActive = btn.classList.toggle('active');
    btn.style.background = isActive ? '#f1c40f' : '#2c3e50';
    btn.style.color = isActive ? 'black' : 'white';
    
    applyGlobalFilters();
}

function sortGames(criteria) {
    const container = document.querySelector('.games-grid') || document.querySelector('.catalog-grid');
    if (!container) return;
    const cards = Array.from(container.querySelectorAll('.game-card'));
    
    cards.sort((a, b) => {
        const pA = parseFloat(a.dataset.price);
        const pB = parseFloat(b.dataset.price);
        const yA = parseInt(a.dataset.year) || 0;
        const yB = parseInt(b.dataset.year) || 0;

        if (criteria === 'cheap') return pA - pB;
        if (criteria === 'expensive') return pB - pA;
        return yB - yA;
    });

    cards.forEach(card => container.appendChild(card));
}

function attachHeartsToCards() {
    const cards = document.querySelectorAll('.game-card');
    cards.forEach(card => {
        if (card.querySelector('.heart-btn')) return;
        const title = card.dataset.title;
        const isFav = favorites.includes(title);
        const heart = document.createElement('div');
        heart.className = 'heart-btn';
        heart.innerHTML = '❤';
        heart.style.cssText = `position:absolute; top:10px; right:10px; font-size:24px; cursor:pointer; z-index:10; transition:0.3s; color:${isFav ? '#f1c40f' : '#ccc'};`;
        heart.onclick = (e) => {
            e.stopPropagation();
            toggleHeart(title, heart);
        };
        card.style.position = 'relative';
        card.appendChild(heart);
    });
}

function toggleHeart(title, el) {
    if (favorites.includes(title)) {
        favorites = favorites.filter(t => t !== title);
        el.style.color = '#ccc';
    } else {
        favorites.push(title);
        el.style.color = '#f1c40f';
    }
    localStorage.setItem('olux_favs', JSON.stringify(favorites));
    const countEl = document.getElementById('fav-count');
    if (countEl) countEl.innerText = favorites.length;
    applyGlobalFilters();
}

function openMainModal() {
    const m = document.getElementById('details-modal');
    const o = document.getElementById('overlay');
    if (m && o) {
        m.classList.add('active');
        o.classList.add('active');
        m.style.zIndex = "10005";
        o.style.zIndex = "10004";
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
        s.style.zIndex = "10006";
        o.style.zIndex = "10005";
    }
}

function toggleAuthModal() {
    const m = document.getElementById('auth-modal');
    const o = document.getElementById('overlay');
    if (m && o) {
        m.style.display = 'block';
        m.style.zIndex = "10007"; 
        o.style.zIndex = "10006";
        o.classList.add('active');
    }
}
