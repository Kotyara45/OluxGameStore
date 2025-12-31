const CONFIG = {
    SB_URL: 'https://yoxieszknznklpvnyvui.supabase.co',
    SB_KEY: 'sb_publishable_ZLbve8ADHIqc48h2YOQQUw_z8vox0s9',
    OWNER_EMAIL: 'nazarivanyuk562@gmail.com'
};

let sbClient = null;
let currentUser = null;
let cart = JSON.parse(localStorage.getItem('olux_cart')) || [];
let userRole = 'user';
-
window.onload = async function() {
    try {
        sbClient = supabase.createClient(CONFIG.SB_URL, CONFIG.SB_KEY);
        const { data: { session } } = await sbClient.auth.getSession();
        currentUser = session ? session.user : null;

        sbClient.auth.onAuthStateChange(async (event, session) => {
            currentUser = session ? session.user : null;
            await updateAuthUI();
        });

        await updateAuthUI();
        renderCart();
        initFilters();
    } catch (err) {
        console.error("Критична помилка завантаження:", err);
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

    authSect.style.display = 'none';
    logoutBtn.style.display = 'block';

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

    supportBtn.style.display = 'inline-block';
    supportBtn.onclick = openUserSupportForm;

    if (['owner', 'admin', 'moderator'].includes(userRole)) {
        adminBtn.style.display = 'inline-block';
        adminBtn.innerText = userRole === 'owner' ? "ВЛАСНИК 👑" : (userRole === 'admin' ? "АДМІНІСТРАТОР 🛠" : "МОДЕРАТОР 🛡");
        adminBtn.onclick = openManagementPanel;
    } else {
        adminBtn.style.display = 'none';
    }
}

function openManagementPanel() {
    const modalData = document.getElementById('modal-data');
    let tabs = `<button class="filter-btn" onclick="switchTab('tickets')">ЗАПИТИ 🎧</button>`;
    
    if (userRole === 'admin' || userRole === 'owner') {
        tabs += `<button class="filter-btn" onclick="switchTab('add_game')">ДОДАТИ ГРУ ➕</button>`;
    }
    if (userRole === 'owner') {
        tabs += `<button class="filter-btn" onclick="switchTab('access')">ПРАВА 🔑</button>`;
    }

    modalData.innerHTML = `
        <div style="padding: 30px; background: #fff; min-height: 550px; color: #333;">
            <span onclick="closeModal()" style="float:right; cursor:pointer; font-size:35px;">&times;</span>
            <h1 style="color: #e74c3c; margin-bottom:20px;">Olux Control Panel</h1>
            <div style="display: flex; gap: 10px; margin-bottom: 25px;">${tabs}</div>
            <div id="admin-viewport" style="background: #fdfdfd; padding: 20px; border-radius: 12px; border: 1px solid #eee; box-shadow: inset 0 2px 5px rgba(0,0,0,0.02);"></div>
        </div>
    `;
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
    switchTab('tickets');
}

async function switchTab(tab) {
    const view = document.getElementById('admin-viewport');
    view.innerHTML = "Завантаження...";

    if (tab === 'tickets') {
        const { data } = await sbClient.from('support_tickets').select('*').order('created_at', { ascending: false });
        view.innerHTML = `<h3>Поточні тикети</h3>` + (data || []).map(t => `
            <div style="background:white; padding:15px; margin-bottom:10px; border-radius:8px; border-left:4px solid #3498db; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <b>${t.user_email}</b> <small style="color:#999;">${new Date(t.created_at).toLocaleString()}</small>
                <p style="margin: 10px 0;">${t.message}</p>
                <a href="mailto:${t.user_email}" style="color:#3498db; font-weight:bold; text-decoration:none;">→ Відповісти поштою</a>
            </div>
        `).join('') || "Запитів немає.";

    } else if (tab === 'add_game') {
        // ДОДАНО ВСІ ЖАНРИ ЯКІ У ТЕБЕ Є
        view.innerHTML = `
            <h3>Додати новий товар у каталог</h3>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                <input id="ng-t" placeholder="Назва гри" style="padding:10px;">
                <input id="ng-p" type="number" placeholder="Ціна (грн)" style="padding:10px;">
                <input id="ng-i" placeholder="URL картинки" style="padding:10px;">
                <input id="ng-a" placeholder="Студія/Автор" style="padding:10px;">
                <input id="ng-y" placeholder="Рік випуску" style="padding:10px;">
                <select id="ng-g" style="padding:10px;">
                    <option value="Action">Action</option>
                    <option value="RPG">RPG</option>
                    <option value="Shooter">Shooter</option>
                    <option value="Simulator">Simulator</option>
                </select>
            </div>
            <textarea id="ng-d" placeholder="Короткий опис" style="width:100%; height:80px; margin-top:15px; padding:10px;"></textarea>
            <textarea id="ng-s" placeholder="Системні вимоги" style="width:100%; height:50px; margin-top:10px; padding:10px;"></textarea>
            <button onclick="saveNewGame()" style="width:100%; margin-top:20px; background:#27ae60; color:white; padding:15px; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">ЗБЕРЕГТИ В КАТАЛОГ</button>
        `;

    } else if (tab === 'access') {
        view.innerHTML = `
            <h3>Управління доступом (Тільки Власник)</h3>
            <div style="background:white; padding:20px; border-radius:10px; border:1px solid #ddd; margin-bottom:20px;">
                <input id="adm-e" placeholder="Email користувача" style="width:100%; padding:10px; margin-bottom:10px;">
                <select id="adm-r" style="width:100%; padding:10px; margin-bottom:15px;">
                    <option value="moderator">Модератор (Тикети)</option>
                    <option value="admin">Адміністратор (Каталог + Тикети)</option>
                </select>
                <button onclick="saveAccess()" style="width:100%; background:#2c3e50; color:white; padding:12px; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">ПІДТВЕРДИТИ ДОСТУП</button>
            </div>
            <div id="staff-list-container">Завантаження...</div>
        `;
        loadStaffList();
    }
}

async function saveAccess() {
    const email = document.getElementById('adm-e').value.trim();
    const role = document.getElementById('adm-r').value;
    if (!email) return alert("Вкажіть пошту!");

    const { error } = await sbClient
        .from('admin_status')
        .upsert([{ user_email: email, role: role }], { onConflict: 'user_email' });

    if (error) {
        alert("Помилка Supabase: " + error.message);
    } else {
        alert("Користувачу " + email + " надано роль " + role);
        document.getElementById('adm-e').value = '';
        loadStaffList();
    }
}

async function loadStaffList() {
    const container = document.getElementById('staff-list-container');
    const { data, error } = await sbClient.from('admin_status').select('*');
    if (error) return container.innerHTML = "Помилка завантаження списку";
    
    container.innerHTML = `<h4>Діючий персонал:</h4>` + data.map(u => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid #eee; background:#fff;">
            <span><b style="color:#e74c3c;">${u.user_email}</b> — ${u.role}</span>
            <button onclick="deleteAccess('${u.user_email}')" style="background:none; border:none; color:red; cursor:pointer; font-weight:bold;">ВИДАЛИТИ</button>
        </div>
    `).join('');
}

async function deleteAccess(email) {
    if (!confirm("Видалити доступ для " + email + "?")) return;
    const { error } = await sbClient.from('admin_status').delete().eq('user_email', email);
    if (error) alert(error.message); else loadStaffList();
}

function openUserSupportForm() {
    const modalData = document.getElementById('modal-data');
    modalData.innerHTML = `
        <div style="padding: 40px; color: #222; background: #fff; border-radius: 20px;">
            <h2 style="color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 15px;">Технічна підтримка Olux</h2>
            <p>Ваш Email: <b>${currentUser.email}</b></p>
            <textarea id="support-msg-body" placeholder="Опишіть ваше запитання або проблему..." style="width: 100%; height: 200px; margin-top:20px; padding: 15px; border-radius: 12px; border: 2px solid #eee; resize:none; font-family: inherit;"></textarea>
            <button onclick="submitUserTicket()" style="width: 100%; padding: 18px; background: #3498db; color: white; border: none; border-radius: 12px; font-weight: bold; margin-top: 20px; cursor: pointer; font-size: 16px;">ВІДПРАВИТИ ЗАПИТ</button>
        </div>
    `;
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

async function submitUserTicket() {
    const msg = document.getElementById('support-msg-body').value;
    if (msg.trim().length < 5) return alert("Повідомлення занадто коротке!");
    const { error } = await sbClient.from('support_tickets').insert([{ 
        user_email: currentUser.email, 
        message: msg, 
        created_at: new Date() 
    }]);
    if (error) alert(error.message); 
    else { alert("Дякуємо! Ваше звернення надіслано."); closeModal(); }
}

function addToCart(btn) {
    const d = btn.closest('.game-card').dataset;
    if (cart.some(x => x.title === d.title)) return alert("Ця гра вже у кошику!");
    cart.push({ title: d.title, price: parseInt(d.price), img: d.img });
    localStorage.setItem('olux_cart', JSON.stringify(cart));
    renderCart();
    alert("Додано!");
}

function renderCart() {
    const list = document.getElementById('cart-items');
    document.getElementById('cart-count').innerText = cart.length;
    let sum = 0;
    if (cart.length === 0) {
        list.innerHTML = "<p style='text-align:center; padding-top:40px;'>Ваш кошик ще порожній.</p>";
    } else {
        list.innerHTML = cart.map((item, i) => {
            sum += item.price;
            return `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; background:#f9f9f9; padding:10px; border-radius:10px;">
                    <img src="${item.img}" style="width:40px; border-radius:5px;">
                    <span style="font-weight:bold; flex:1; margin-left:10px;">${item.title}</span>
                    <b style="margin-right:15px;">${item.price} грн</b>
                    <span onclick="removeFromCart(${i})" style="color:red; cursor:pointer; font-weight:bold; font-size:22px;">&times;</span>
                </div>`;
        }).join('');
    }
    document.getElementById('cart-total').innerText = sum;
}

function removeFromCart(i) {
    cart.splice(i, 1);
    localStorage.setItem('olux_cart', JSON.stringify(cart));
    renderCart();
}

async function signIn() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;
    const { error } = await sbClient.auth.signInWithPassword({ email, password: pass });
    if (error) alert("Помилка входу: " + error.message); else closeModal();
}

async function signUp() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;
    const { error } = await sbClient.auth.signUp({ email, password: pass });
    if (error) alert("Помилка реєстрації: " + error.message); else alert("Підтвердіть пошту!");
}

function signOut() { sbClient.auth.signOut().then(() => location.reload()); }
function toggleAuthModal() { document.getElementById('auth-modal').style.display = 'block'; document.getElementById('overlay').classList.add('active'); }
function toggleCart() { document.getElementById('cart-sidebar').classList.toggle('active'); document.getElementById('overlay').classList.toggle('active'); }
function closeModal() {
    document.getElementById('details-modal').classList.remove('active');
    document.getElementById('cart-sidebar').classList.remove('active');
    document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('overlay').classList.remove('active');
}

function initFilters() {
    document.querySelectorAll('.filters .filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelector('.filter-btn.active').classList.remove('active');
            btn.classList.add('active');
            const genre = btn.dataset.genre;
            document.querySelectorAll('.game-card').forEach(card => {
                card.style.display = (genre === 'all' || card.dataset.genre === genre) ? 'block' : 'none';
            });
        };
    });
}

function openDetails(btn) {
    const d = btn.closest('.game-card').dataset;
    const modalData = document.getElementById('modal-data');
    modalData.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:30px; color:black; padding:20px;">
            <img src="${d.img}" style="width:100%; border-radius:15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
            <div>
                <span onclick="closeModal()" style="float:right; cursor:pointer; font-size:35px;">&times;</span>
                <h1 style="margin-top:0;">${d.title}</h1>
                <p style="font-size:28px; color:#d4af37; font-weight:bold;">${d.price} грн</p>
                <div style="margin:20px 0; line-height:1.6; color:#555;">${d.desc}</div>
                <div style="background:#f4f4f4; padding:15px; border-radius:12px; font-size:14px; margin-bottom:25px;">
                    <b>Системні вимоги:</b><br>${d.specs}
                </div>
                <button class="buy-btn" style="width:100%; padding:18px; font-size:18px;" onclick="addToCart(this)">КУПИТИ ЗАРАЗ</button>
            </div>
        </div>
    `;
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}
