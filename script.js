const CONFIG = {
    SB_URL: 'https://yoxieszknznklpvnyvui.supabase.co',
    SB_KEY: 'sb_publishable_ZLbve8ADHIqc48h2YOQQUw_z8vox0s9',
    OWNER_EMAIL: 'nazarivanyuk562@gmail.com',
    DONATE_URL: 'https://donatello.to/OluxGameStore'
};

const sb = supabase.createClient(CONFIG.SB_URL, CONFIG.SB_KEY);
let currentUser = null;
let isSignUp = false;
let cart = JSON.parse(localStorage.getItem('olux_cart')) || [];

window.onload = async () => {
    const { data: { session } } = await sb.auth.getSession();
    currentUser = session?.user;
    
    updateAuthUI();
    loadGames();
    renderCart();
    initFilters();

    sb.auth.onAuthStateChange((_event, session) => {
        currentUser = session?.user;
        updateAuthUI();
    });
};

function openAuthModal() {
    document.getElementById('auth-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function toggleAuthMode() {
    isSignUp = !isSignUp;
    document.getElementById('auth-title').innerText = isSignUp ? "РЕЄСТРАЦІЯ" : "ВХІД";
    document.getElementById('auth-switch').innerText = isSignUp ? "Вже є акаунт? Увійти" : "Немає акаунту? Реєстрація";
}

async function handleAuth() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (!email || !password) return alert("Заповніть поля!");

    if (isSignUp) {
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) alert("Помилка реєстрації: " + error.message);
        else alert("Перевірте пошту для підтвердження!");
    } else {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) alert("Помилка входу: " + error.message);
        else closeModal();
    }
}

async function signOut() {
    await sb.auth.signOut();
    location.reload();
}

async function updateAuthUI() {
    const adminBtn = document.getElementById('admin-panel-btn');
    const authSect = document.getElementById('auth-buttons');
    const logoutBtn = document.getElementById('logout-btn');

    if (currentUser) {
        authSect.style.display = 'none';
        logoutBtn.style.display = 'block';

        const { data } = await sb.from('admin_status').select('role').eq('user_email', currentUser.email).maybeSingle();
        
        if (currentUser.email === CONFIG.OWNER_EMAIL || (data && (data.role === 'admin' || data.role === 'owner'))) {
            adminBtn.style.display = 'block';
            adminBtn.innerText = currentUser.email === CONFIG.OWNER_EMAIL ? "ВЛАСНИК 👑" : "АДМІН 🛠";
            adminBtn.onclick = openAdminPanel;
        }
    } else {
        authSect.style.display = 'block';
        logoutBtn.style.display = 'none';
        adminBtn.style.display = 'none';
    }
}

async function loadGames() {
    const { data, error } = await sb.from('games').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error("Error loading games:", error);
        return;
    }
    
    const grid = document.getElementById('catalog-grid');
    grid.innerHTML = data.map(g => `
        <div class="game-card" data-genre="${g.genre}">
            <div class="card-img" style="background-image: url('${g.img}')"></div>
            <h3>${g.title}</h3>
            <p class="price">${g.price} грн</p>
            <div class="btn-group">
                <button class="info-btn" onclick='viewDetails(${JSON.stringify(g).replace(/'/g, "&apos;")})'>Деталі</button>
                <button class="buy-btn" onclick="addToCart('${g.title}', ${g.price}, '${g.img}')">Купити</button>
            </div>
        </div>
    `).join('');
}

function viewDetails(g) {
    const modalData = document.getElementById('modal-data');
    modalData.innerHTML = `
        <div style="display:flex; flex-wrap:wrap; background:#000;">
            <div style="flex:1; min-width:300px; height:550px;">
                <img src="${g.img}" style="width:100%; height:100%; object-fit:cover;">
            </div>
            <div style="flex:1.2; padding:50px; position:relative;">
                <span class="close-btn-large" onclick="closeModal()">&times;</span>
                <h2 style="font-size:36px; margin:0 0 15px 0;">${g.title}</h2>
                <div style="color:var(--gold); font-size:32px; font-weight:bold; margin-bottom:25px;">${g.price} грн</div>
                <p style="color:#ccc; line-height:1.8; margin-bottom:30px; font-size:16px;">${g.description || 'Опис скоро буде...'}</p>
                <div style="background:#0a0a0a; padding:20px; border-radius:15px; border:1px solid #222; font-size:14px; color:#999; margin-bottom:30px;">
                    <p><b>Жанр:</b> ${g.genre}</p>
                    <p><b>Видавець:</b> OluxStore Premium</p>
                </div>
                <button class="buy-btn" style="width:100%; padding:20px; font-size:20px;" onclick="addToCart('${g.title}', ${g.price}, '${g.img}')">ДОДАТИ В КОШИК</button>
            </div>
        </div>
    `;
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function openAdminPanel() {
    const modalData = document.getElementById('modal-data');
    modalData.innerHTML = `
        <div style="padding: 50px; background: #000; min-height: 600px;">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h2 style="margin-bottom:30px; border-bottom:1px solid #222; padding-bottom:15px; text-transform:uppercase;">Керування OluxGameStore</h2>
            <div style="display:flex; gap:15px; margin-bottom:30px;">
                <button class="filter-btn" onclick="switchAdminTab('add')">Додати нову гру</button>
                <button class="filter-btn" onclick="switchAdminTab('orders')">Переглянути замовлення</button>
            </div>
            <div id="admin-view" style="background:#050505; padding:30px; border-radius:25px; border:1px solid #1a1a1a;"></div>
        </div>
    `;
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
    switchAdminTab('add');
}

async function switchAdminTab(tab) {
    const view = document.getElementById('admin-view');
    view.innerHTML = '<p style="text-align:center;">Завантаження...</p>';

    if (tab === 'add') {
        view.innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                <input id="g-t" placeholder="Назва гри" style="background:#111; border:1px solid #333; color:white; padding:15px; border-radius:12px;">
                <input id="g-p" type="number" placeholder="Ціна (грн)" style="background:#111; border:1px solid #333; color:white; padding:15px; border-radius:12px;">
                <input id="g-i" placeholder="URL Зображення" style="background:#111; border:1px solid #333; color:white; padding:15px; border-radius:12px;">
                <input id="g-g" placeholder="Жанр (Action, RPG...)" style="background:#111; border:1px solid #333; color:white; padding:15px; border-radius:12px;">
            </div>
            <textarea id="g-d" placeholder="Повний опис гри..." style="width:100%; background:#111; border:1px solid #333; color:white; padding:15px; border-radius:12px; height:120px; margin-top:20px;"></textarea>
            <button class="buy-btn" style="width:100%; margin-top:25px; padding:18px;" onclick="saveGame()">ОПУБЛІКУВАТИ ГРУ НА САЙТ</button>
        `;
    } else if (tab === 'orders') {
        const { data, error } = await sb.from('orders').select('*').order('created_at', { ascending: false });
        if (error || !data.length) {
            view.innerHTML = '<p style="color:#555; text-align:center;">Замовлень ще немає.</p>';
            return;
        }
        view.innerHTML = data.map(o => `
            <div style="padding:20px; border-bottom:1px solid #222; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong style="color:white;">${o.user_email}</strong><br>
                    <small style="color:#666;">${o.items_names}</small>
                </div>
                <div style="text-align:right;">
                    <span style="color:var(--gold); font-weight:bold; font-size:18px;">${o.total_price} грн</span><br>
                    <small style="color:#444;">${new Date(o.created_at).toLocaleDateString()}</small>
                </div>
            </div>
        `).join('');
    }
}

async function saveGame() {
    const title = document.getElementById('g-t').value;
    const price = parseInt(document.getElementById('g-p').value);
    const img = document.getElementById('g-i').value;
    const genre = document.getElementById('g-g').value;
    const description = document.getElementById('g-d').value;

    if (!title || !price || !img) return alert("Заповніть основні поля!");

    const { error } = await sb.from('games').insert([{ title, price, img, genre, description }]);
    
    if (error) alert("Помилка: " + error.message);
    else {
        alert("Гру успішно додано!");
        location.reload();
    }
}

function addToCart(title, price, img) {
    if (cart.some(item => item.title === title)) return alert("Ця гра вже у кошику!");
    cart.push({ title, price, img });
    saveCart();
    renderCart();
    alert(`Гру "${title}" додано до кошика!`);
}

function renderCart() {
    const itemsCont = document.getElementById('cart-items');
    const totalCont = document.getElementById('cart-total');
    let total = 0;

    itemsCont.innerHTML = cart.map((item, index) => {
        total += item.price;
        return `
            <div style="display:flex; align-items:center; gap:15px; margin-bottom:20px; background:#0a0a0a; padding:15px; border-radius:15px; border:1px solid #1a1a1a;">
                <img src="${item.img}" width="60" height="70" style="object-fit:cover; border-radius:8px;">
                <div style="flex:1">
                    <div style="font-weight:bold; font-size:16px;">${item.title}</div>
                    <div style="color:var(--gold);">${item.price} грн</div>
                </div>
                <span onclick="removeFromCart(${index})" style="color:#ff4444; cursor:pointer; font-size:24px;">&times;</span>
            </div>
        `;
    }).join('');

    totalCont.innerText = total;
    document.getElementById('cart-count').innerText = cart.length;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    renderCart();
}

function saveCart() {
    localStorage.setItem('olux_cart', JSON.stringify(cart));
}

function toggleCart() {
    document.getElementById('cart-sidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
}

async function checkout() {
    if (!currentUser) return alert("Увійдіть в акаунт для замовлення!");
    if (cart.length === 0) return alert("Кошик порожній!");

    const itemsNames = cart.map(i => i.title).join(", ");
    const totalPrice = cart.reduce((sum, i) => sum + i.price, 0);

    const { error } = await sb.from('orders').insert([{
        user_email: currentUser.email,
        items_names: itemsNames,
        total_price: totalPrice
    }]);

    if (!error) {
        window.location.href = CONFIG.DONATE_URL;
        cart = [];
        saveCart();
    } else {
        alert("Помилка замовлення: " + error.message);
    }
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    document.getElementById('cart-sidebar').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
}

function initFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelector('.filter-btn.active').classList.remove('active');
            btn.classList.add('active');
            const genre = btn.dataset.genre;
            document.querySelectorAll('.game-card').forEach(card => {
                if (genre === 'all' || card.dataset.genre === genre) card.style.display = 'block';
                else card.style.display = 'none';
            });
        };
    });
}
