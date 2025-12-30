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
    console.log("System initialization...");
    try {
        sbClient = supabase.createClient(CONFIG.SB_URL, CONFIG.SB_KEY);
        
        const { data: { session }, error: sessionError } = await sbClient.auth.getSession();
        if (sessionError) throw sessionError;
        
        currentUser = session ? session.user : null;

        sbClient.auth.onAuthStateChange(function(event, session) {
            console.log("Auth state change:", event);
            currentUser = session ? session.user : null;
            updateAuthUI();
        });

        await updateAuthUI();
        renderCart();
        initFilters();
    } catch (err) {
        console.error("Critical error during startup:", err.message);
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

    userRole = await fetchUserRole(currentUser.email);

    // Відображення кнопки підтримки ДЛЯ ВСІХ
    if (supportBtn) {
        supportBtn.style.display = 'block';
        supportBtn.innerText = "ПІДТРИМКА 🎧";
        supportBtn.style.background = "#3498db";
        supportBtn.style.marginRight = "10px";
        supportBtn.onclick = openUserSupportForm;
    }

    if (adminBtn) {
        if (['owner', 'admin', 'moderator'].includes(userRole)) {
            adminBtn.style.display = 'block';
            adminBtn.style.background = "#e74c3c";
            adminBtn.innerText = getRoleLabel(userRole);
            adminBtn.onclick = openManagementPanel;
        } else {
            adminBtn.style.display = 'none';
        }
    }
}

async function fetchUserRole(email) {
    if (email === CONFIG.OWNER_EMAIL) return 'owner';
    try {
        const { data, error } = await sbClient
            .from('admin_status')
            .select('role')
            .eq('user_email', email)
            .maybeSingle();
        return (data && data.role) ? data.role : 'user';
    } catch (e) {
        return 'user';
    }
}

function getRoleLabel(role) {
    const labels = {
        'owner': "ВЛАСНИК 👑",
        'admin': "АДМІНІСТРАТОР 🛠",
        'moderator': "МОДЕРАТОР 🛡"
    };
    return labels[role] || "ПЕРСОНАЛ";
}

function openUserSupportForm() {
    const modalData = document.getElementById('modal-data');
    const modal = document.getElementById('details-modal');
    
    modalData.innerHTML = `
        <div class="support-ui-container" style="padding: 40px; color: #2c3e50; background: #fff; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h2 style="font-size: 32px; border-bottom: 2px solid #3498db; padding-bottom: 15px; margin-bottom: 20px;">Центр Допомоги Olux</h2>
            <p style="font-size: 16px; color: #7f8c8d; margin-bottom: 30px;">Виникли запитання? Напишіть модераторам, і ми відповімо на вашу пошту.</p>
            
            <div class="form-group" style="margin-bottom: 20px;">
                <label style="display: block; font-weight: 700; margin-bottom: 10px;">Ваш акаунт:</label>
                <input type="text" value="${currentUser.email}" disabled style="width: 100%; padding: 15px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 10px; color: #495057;">
            </div>

            <div class="form-group" style="margin-bottom: 30px;">
                <label style="display: block; font-weight: 700; margin-bottom: 10px;">Текст повідомлення:</label>
                <textarea id="support-msg-field" placeholder="Я не отримав ключ / Потрібна допомога з оплатою..." style="width: 100%; height: 200px; padding: 15px; border: 2px solid #e9ecef; border-radius: 12px; font-size: 16px; resize: none; transition: border 0.3s;"></textarea>
            </div>

            <button onclick="handleTicketSubmission()" style="width: 100%; padding: 20px; background: #3498db; color: #fff; border: none; border-radius: 12px; font-size: 18px; font-weight: bold; cursor: pointer; transition: transform 0.2s, background 0.3s;">
                ВІДПРАВИТИ ЗАПИТ
            </button>
        </div>
    `;
    
    modal.classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

async function handleTicketSubmission() {
    const message = document.getElementById('support-msg-field').value;
    if (!message.trim() || message.length < 10) {
        return alert("Будь ласка, напишіть детальніше (мінімум 10 символів).");
    }

    const { error } = await sbClient.from('support_tickets').insert([
        { user_email: currentUser.email, message: message, created_at: new Date() }
    ]);

    if (error) {
        alert("Помилка відправки: " + error.message);
    } else {
        alert("Повідомлення успішно доставлено! Очікуйте відповідь.");
        closeModal();
    }
}

function openManagementPanel() {
    const modalData = document.getElementById('modal-data');
    const modal = document.getElementById('details-modal');

    let menuItems = `
        <div class="admin-nav" style="display: flex; gap: 15px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #eee; overflow-x: auto;">
            <button class="tab-btn" onclick="renderAdminSection('tickets')">ТИКЕТИ 🎧</button>
    `;

    if (userRole === 'admin' || userRole === 'owner') {
        menuItems += `
            <button class="tab-btn" onclick="renderAdminSection('catalog')">КАТАЛОГ ➕</button>
            <button class="tab-btn" onclick="renderAdminSection('orders')">ЗАМОВЛЕННЯ 📦</button>
        `;
    }

    if (userRole === 'owner') {
        menuItems += `<button class="tab-btn" onclick="renderAdminSection('users')">ДОСТУП 🔑</button>`;
    }

    menuItems += `</div><div id="admin-content-area" style="min-height: 400px;"></div>`;

    modalData.innerHTML = `
        <div class="admin-panel-ui" style="padding: 40px; color: #222; background: #fff; border-radius: 15px; min-width: 800px; max-width: 95vw;">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h1 style="margin-bottom: 25px; font-size: 28px;">Управління: ${getRoleLabel(userRole)}</h1>
            ${menuItems}
        </div>
    `;

    modal.classList.add('active');
    document.getElementById('overlay').classList.add('active');
    renderAdminSection('tickets');
}

async function renderAdminSection(section) {
    const area = document.getElementById('admin-content-area');
    area.innerHTML = `<div style="text-align: center; margin-top: 100px; font-size: 20px;">Завантаження...</div>`;

    if (section === 'tickets') {
        const { data, error } = await sbClient.from('support_tickets').select('*').order('created_at', { ascending: false });
        if (error) return area.innerHTML = "Помилка завантаження.";

        let list = `<h3>Повідомлення користувачів (${data.length})</h3><div style="margin-top: 20px;">`;
        data.forEach(t => {
            list += `
                <div style="background: #f8f9fa; border-left: 5px solid #3498db; padding: 20px; margin-bottom: 15px; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; font-size: 14px; color: #666; margin-bottom: 10px;">
                        <b>ВІД: ${t.user_email}</b>
                        <span>${new Date(t.created_at).toLocaleString()}</span>
                    </div>
                    <p style="font-size: 16px; color: #333; line-height: 1.5;">${t.message}</p>
                    <div style="margin-top: 15px; text-align: right;">
                        <a href="mailto:${t.user_email}?subject=Olux Store Support" style="padding: 10px 20px; background: #2c3e50; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px;">ВІДПОВІСТИ</a>
                    </div>
                </div>
            `;
        });
        area.innerHTML = list || "<p>Тикетів поки немає.</p>";

    } else if (section === 'catalog') {
        area.innerHTML = `
            <h3>Додати новий товар в магазин</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                <input id="f-title" placeholder="Назва гри" style="padding: 12px; border: 1px solid #ccc; border-radius: 8px;">
                <input id="f-price" type="number" placeholder="Ціна (грн)" style="padding: 12px; border: 1px solid #ccc; border-radius: 8px;">
                <input id="f-img" placeholder="URL картинки" style="padding: 12px; border: 1px solid #ccc; border-radius: 8px;">
                <input id="f-author" placeholder="Розробник" style="padding: 12px; border: 1px solid #ccc; border-radius: 8px;">
                <input id="f-year" placeholder="Рік випуску" style="padding: 12px; border: 1px solid #ccc; border-radius: 8px;">
                <select id="f-genre" style="padding: 12px; border: 1px solid #ccc; border-radius: 8px;">
                    <option value="action">Екшн</option>
                    <option value="rpg">RPG</option>
                    <option value="horror">Хорор</option>
                </select>
            </div>
            <textarea id="f-desc" placeholder="Детальний опис" style="width:100%; height:80px; margin-top:15px; padding:12px; border-radius:8px; border:1px solid #ccc;"></textarea>
            <textarea id="f-specs" placeholder="Системні вимоги" style="width:100%; height:80px; margin-top:15px; padding:12px; border-radius:8px; border:1px solid #ccc;"></textarea>
            <button onclick="executeAddGame()" style="width:100%; margin-top:20px; padding:15px; background:#27ae60; color:white; border:none; border-radius:10px; font-weight:bold; cursor:pointer;">ОПУБЛІКУВАТИ</button>
        `;
    } else if (section === 'orders') {
        const { data } = await sbClient.from('orders').select('*').order('created_at', { ascending: false });
        let table = `<h3>Історія всіх продажів</h3><div style="margin-top:20px; overflow-y: auto; max-height: 400px;">`;
        data.forEach(o => {
            table += `<div style="padding:10px; border-bottom:1px solid #eee;"><b>${o.user_email}</b> купив ${o.items_names} на суму ${o.total_price} грн</div>`;
        });
        area.innerHTML = table + "</div>";
    }
}

async function executeAddGame() {
    const payload = {
        title: document.getElementById('f-title').value,
        price: parseFloat(document.getElementById('f-price').value),
        img: document.getElementById('f-img').value,
        author: document.getElementById('f-author').value,
        year: document.getElementById('f-year').value,
        description: document.getElementById('f-desc').value,
        specs: document.getElementById('f-specs').value,
        genre: document.getElementById('f-genre').value
    };

    const { error } = await sbClient.from('games').insert([payload]);
    if (error) alert(error.message);
    else {
        alert("Гру додано!");
        location.reload();
    }
}

function openDetails(btn) {
    const d = btn.closest('.game-card').dataset;
    const modalData = document.getElementById('modal-data');
    modalData.innerHTML = `
        <div class="modal-img-side"><img src="${d.img}" style="width:100%; border-radius:15px; box-shadow: 0 5px 20px rgba(0,0,0,0.2);"></div>
        <div class="modal-info-side">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h2 style="color:#000; font-size:32px;">${d.title}</h2>
            <div style="color:#d4af37; font-size:28px; font-weight:bold; margin:15px 0;">${d.price} грн</div>
            <p style="color:#444; line-height: 1.6;">${d.desc || 'Опис відсутній для цього товару.'}</p>
            <div style="background:#f1f2f6; padding:20px; border-radius:12px; color:#2f3542; font-size:14px; margin:25px 0;">
                <p><b>Розробник:</b> ${d.author || 'Olux Store'}</p>
                <p><b>Рік випуску:</b> ${d.year || '2025'}</p>
                <p><b>Вимоги:</b> ${d.specs || 'Мінімальні'}</p>
            </div>
            <button class="buy-btn" style="width:100%; padding: 22px; font-size:20px; border-radius:12px;" onclick="addToCartDirect('${d.title}', ${d.price}, '${d.img}')">🛒 ДОДАТИ В КОШИК</button>
        </div>
    `;
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function addToCartDirect(title, price, img) {
    if (cart.some(item => item.title === title)) return alert("Товар вже у кошику!");
    cart.push({ title, price: parseFloat(price), img });
    saveCart();
    closeModal();
}

function addToCart(btn) {
    const card = btn.closest('.game-card');
    const item = { title: card.dataset.title, price: parseFloat(card.dataset.price), img: card.dataset.img };
    if (cart.some(i => i.title === item.title)) return alert("Вже у кошику!");
    cart.push(item);
    saveCart();
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
                <div class="cart-item" style="display:flex; align-items:center; gap:15px; margin-bottom:15px; background:#fff; padding:10px; border-radius:10px; color:black; border:1px solid #eee;">
                    <img src="${item.img}" width="40" height="55" style="border-radius:5px; object-fit:cover;">
                    <div style="flex:1;">
                        <b style="font-size:14px;">${item.title}</b><br>
                        <span style="color:#d4af37;">${item.price} грн</span>
                    </div>
                    <span onclick="removeFromCart(${i})" style="color:#e74c3c; cursor:pointer; font-weight:bold; font-size:20px;">&times;</span>
                </div>
            `;
        }).join('') : '<p style="text-align:center; color:#999; padding:20px;">Кошик порожній</p>';
    }
    if (total) total.innerText = sum;
}

function removeFromCart(i) {
    cart.splice(i, 1);
    saveCart();
}

async function checkout() {
    if (!currentUser) return toggleAuthModal();
    if (!cart.length) return alert("Ваш кошик порожній!");
    
    const itemsNames = cart.map(i => i.title).join(', ');
    const totalPrice = cart.reduce((s, i) => s + i.price, 0);
    
    const { error } = await sbClient.from('orders').insert([
        { user_email: currentUser.email, items_names: itemsNames, total_price: totalPrice }
    ]);
    
    if (!error) {
        cart = [];
        saveCart();
        window.location.href = CONFIG.DONATE_URL;
    }
}

async function signIn() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;
    const { error } = await sbClient.auth.signInWithPassword({ email, password: pass });
    if (error) alert("Помилка входу: " + error.message);
}

async function signUp() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;
    const { error } = await sbClient.auth.signUp({ email, password: pass });
    if (error) alert("Помилка реєстрації: " + error.message);
    else alert("Успішно! Підтвердіть імейл.");
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
    m.style.display = 'block';
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
