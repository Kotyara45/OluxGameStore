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
    
    if (error) {
        alert("Помилка входу: " + error.message);
    } else {
        closeModal();
    }
}

async function signUp() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { error } = await sbClient.auth.signUp({ email, password });
    
    if (error) alert("Помилка: " + error.message);
    else {
        alert("Реєстрація успішна! Перевірте вашу пошту для підтвердження.");
        closeModal();
    }
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
            <p>Ваш email: <b>${currentUser.email}</b></p>
            <textarea id="support-text-input" placeholder="Опишіть вашу проблему..." style="width: 100%; height: 150px; padding: 10px; margin-top: 10px; resize: none; border: 1px solid #ccc; border-radius: 8px;"></textarea>
            <button onclick="submitTicketToDatabase()" style="width: 100%; margin-top: 15px; padding: 15px; background: #f1c40f; border: none; font-weight: bold; cursor: pointer; border-radius: 8px;">ВІДПРАВИТИ</button>
        </div>
    `;
    openMainModal();
}

async function submitTicketToDatabase() {
    const msg = document.getElementById('support-text-input').value.trim();
    if (msg.length < 5) return alert("Повідомлення занадто коротке");

    const { error } = await sbClient.from('support_tickets').insert([{ 
        user_email: currentUser.email, 
        message: msg 
    }]);

    if (error) alert("Помилка: " + error.message);
    else {
        alert("Ваше звернення надіслано!");
        closeModal();
    }
}

function openManagementPanel() {
    const modalData = document.getElementById('modal-data');
    let nav = `<button class="adm-nav-item" onclick="switchAdminTab('tickets')">ТИКЕТИ</button>`;
    
    if (['admin', 'owner'].includes(userRole)) {
        nav += `
            <button class="adm-nav-item" onclick="switchAdminTab('add_game')">+ ГРА</button>
            <button class="adm-nav-item" onclick="switchAdminTab('all_orders')">ПРОДАЖІ</button>
        `;
    }
    if (userRole === 'owner') nav += `<button class="adm-nav-item" onclick="switchAdminTab('users')">ПРАВА</button>`;

    modalData.innerHTML = `
        <div style="padding: 25px; color: black; background: white; min-height: 500px;">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h2 style="border-bottom: 2px solid #333;">АДМІН-ПАНЕЛЬ [${userRole.toUpperCase()}]</h2>
            <div style="display: flex; gap: 5px; margin: 15px 0;">${nav}</div>
            <div id="admin-view-port" style="background: #f9f9f9; padding: 15px; border-radius: 8px; min-height: 300px;"></div>
        </div>
    `;
    openMainModal();
    switchAdminTab('tickets');
}

async function switchAdminTab(tab) {
    const view = document.getElementById('admin-view-port');
    view.innerHTML = "Завантаження...";

    if (tab === 'tickets') {
        const { data } = await sbClient.from('support_tickets').select('*').order('created_at', { ascending: false });
        view.innerHTML = `<h3>Звернення користувачів</h3>` + (data?.length ? data.map(t => `
            <div style="border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; background: white; border-radius: 5px;">
                <div style="display:flex; justify-content:space-between; font-size:12px; color:#666;">
                    <span>${t.user_email}</span>
                    <span>${new Date(t.created_at).toLocaleDateString()}</span>
                </div>
                <p style="margin: 5px 0;">${t.message}</p>
                <a href="mailto:${t.user_email}" style="color: blue; font-size: 12px;">Відповісти Email</a>
            </div>
        `).join('') : "<p>Тикетів немає</p>");
    } 
    
    else if (tab === 'add_game') {
        view.innerHTML = `
            <h3>Додати нову гру</h3>
            <input id="g-title" placeholder="Назва" style="width:100%; margin-bottom:5px; padding:8px;">
            <input id="g-price" type="number" placeholder="Ціна (грн)" style="width:100%; margin-bottom:5px; padding:8px;">
            <input id="g-img" placeholder="Картинка (URL)" style="width:100%; margin-bottom:5px; padding:8px;">
            <select id="g-genre" style="width:100%; margin-bottom:10px; padding:8px;">
                <option value="Action">Action</option>
                <option value="RPG">RPG</option>
                <option value="Shooter">Shooter</option>
                <option value="Simulator">Simulator</option>
            </select>
            <button onclick="saveNewGame()" style="width:100%; padding:10px; background:green; color:white; border:none; border-radius:5px; cursor:pointer;">ЗБЕРЕГТИ</button>
        `;
    }

    else if (tab === 'all_orders') {
        const { data } = await sbClient.from('orders').select('*').order('created_at', { ascending: false });
        view.innerHTML = `<h3>Історія продажів</h3>` + (data?.length ? data.map(o => `
            <div style="font-size:13px; border-bottom:1px solid #ccc; padding:8px 0;">
                <b>${o.user_email}</b> купив на <span style="color:green;">${o.total_price} грн</span><br>
                <small style="color:#555;">${o.items_names}</small>
            </div>
        `).join('') : "<p>Продажів ще не було</p>");
    }

    else if (tab === 'users') {
        view.innerHTML = `
            <h3>Керування правами</h3>
            <input id="u-email" placeholder="Email користувача" style="width:100%; margin-bottom:5px; padding:8px;">
            <select id="u-role" style="width:100%; margin-bottom:10px; padding:8px;">
                <option value="moderator">Модератор</option>
                <option value="admin">Адміністратор</option>
            </select>
            <button onclick="assignRole()" style="width:100%; padding:10px; background:#3498db; color:white; border:none; border-radius:5px; cursor:pointer;">ПРИЗНАЧИТИ РОЛЬ</button>
        `;
    }
}

async function saveNewGame() {
    const game = {
        title: document.getElementById('g-title').value,
        price: parseFloat(document.getElementById('g-price').value),
        img: document.getElementById('g-img').value,
        genre: document.getElementById('g-genre').value,
        author: 'Olux Store',
        year: '2024'
    };
    const { error } = await sbClient.from('games').insert([game]);
    if (error) alert(error.message);
    else { alert("Гру успішно додано!"); location.reload(); }
}

async function assignRole() {
    const email = document.getElementById('u-email').value;
    const role = document.getElementById('u-role').value;
    const { error } = await sbClient.from('admin_status').upsert([{ user_email: email, role: role }]);
    alert(error ? error.message : `Роль ${role} призначено для ${email}`);
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
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; color:black; border-bottom:1px solid #eee; padding-bottom:5px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${item.img}" style="width:40px; height:40px; border-radius:5px; object-fit:cover;">
                        <div>
                            <div style="font-size:14px; font-weight:bold;">${item.title}</div>
                            <div style="font-size:12px; color:#888;">${item.price} грн</div>
                        </div>
                    </div>
                    <span onclick="removeFromCart(${i})" style="color:red; cursor:pointer; font-size:20px; font-weight:bold;">&times;</span>
                </div>`;
        }).join('') : '<p style="text-align:center; color:#999;">Кошик порожній</p>';
    }
    if (total) total.innerText = sum;
}

function removeFromCart(i) {
    cart.splice(i, 1);
    saveCart();
}

async function checkout() {
    if (!currentUser) return toggleAuthModal();
    if (!cart.length) return alert("Кошик порожній!");
    
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
        alert("Помилка замовлення: " + error.message);
    }
}

function openDetails(btn) {
    const d = btn.closest('.game-card').dataset;
    const modalData = document.getElementById('modal-data');
    
    modalData.innerHTML = `
        <div class="modal-img-side"><img src="${d.img}" style="width:100%; height:100%; object-fit:cover;"></div>
        <div class="modal-info-side">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h2 style="color:black; margin-top:0;">${d.title}</h2>
            <div class="modal-price">${d.price} грн</div>
            <p style="color:#555; line-height: 1.5;">${d.desc}</p>
            <ul class="modal-specs">
                <li><b>Розробник:</b> ${d.author}</li>
                <li><b>Рік:</b> ${d.year}</li>
                <li><b>Вимоги:</b> ${d.specs}</li>
            </ul>
            <button class="modal-buy-btn" onclick="addToCartDirect('${d.title}', ${d.price}, '${d.img}')">ДОДАТИ В КОШИК</button>
        </div>
    `;
    openMainModal();
}

function initFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if(btn.id) return;
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

function openMainModal() {
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function closeModal() {
    document.querySelectorAll('.modal, .sidebar').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.modal-small').forEach(m => m.style.display = 'none');
    document.getElementById('overlay').classList.remove('active');
}

function toggleCart() {
    const s = document.getElementById('cart-sidebar');
    const isActive = s.classList.contains('active');
    
    if (isActive) {
        s.classList.remove('active');
        document.getElementById('overlay').classList.remove('active');
    } else {
        s.classList.add('active');
        document.getElementById('overlay').classList.add('active');
    }
}

function toggleAuthModal() {
    const m = document.getElementById('auth-modal');
    m.style.display = 'block';
    document.getElementById('overlay').classList.add('active');
}
