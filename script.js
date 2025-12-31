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
        
        const { data: { session }, error: sessionError } = await sbClient.auth.getSession();
        if (sessionError) throw sessionError;
        
        currentUser = session ? session.user : null;

        sbClient.auth.onAuthStateChange(function(event, session) {
            currentUser = session ? session.user : null;
            updateAuthUI();
        });

        await updateAuthUI();
        renderCart();
        initFilters();
    } catch (err) {
        console.error("Initialization Failed:", err.message);
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
            if (userRole === 'owner') adminBtn.innerText = "ВЛАСНИК 👑";
            else if (userRole === 'admin') adminBtn.innerText = "АДМІНІСТРАТОР 🛠";
            else adminBtn.innerText = "МОДЕРАТОР 🛡";
            adminBtn.onclick = openManagementPanel;
        }
    }
}

function openUserSupportForm() {
    const modalData = document.getElementById('modal-data');
    const modal = document.getElementById('details-modal');
    
    modalData.innerHTML = `
        <div style="padding: 40px; color: black; background: white; border-radius: 15px;">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h2 style="font-size: 28px; margin-bottom: 10px;">Служба підтримки Olux</h2>
            <p style="color: #666; margin-bottom: 25px;">Опишіть вашу проблему, і модератори допоможуть вам.</p>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; font-weight: bold; margin-bottom: 8px;">Ваш акаунт:</label>
                <input type="text" value="${currentUser.email}" disabled style="width: 100%; padding: 12px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 8px;">
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display: block; font-weight: bold; margin-bottom: 8px;">Повідомлення:</label>
                <textarea id="support-text-input" placeholder="Опишіть проблему тут..." style="width: 100%; height: 180px; padding: 15px; border: 2px solid #ddd; border-radius: 10px; font-family: inherit; resize: none;"></textarea>
            </div>

            <button onclick="submitTicketToDatabase()" style="width: 100%; padding: 18px; background: #f1c40f; color: black; font-weight: bold; font-size: 18px; border: none; border-radius: 12px; cursor: pointer;">
                ВІДПРАВИТИ ЗАПИТ
            </button>
        </div>
    `;
    
    modal.classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

async function submitTicketToDatabase() {
    const message = document.getElementById('support-text-input').value;
    
    if (!message.trim() || message.length < 5) {
        alert("Будь ласка, введіть змістовне повідомлення.");
        return;
    }

    const { error } = await sbClient.from('support_tickets').insert([
        { 
            user_email: currentUser.email, 
            message: message,
            created_at: new Date()
        }
    ]);

    if (error) {
        alert("Помилка: " + error.message);
    } else {
        alert("Дякуємо! Ваше звернення надіслано.");
        closeModal();
    }
}

function openManagementPanel() {
    const modalData = document.getElementById('modal-data');
    const modal = document.getElementById('details-modal');

    let navButtons = `<button class="adm-nav-item" onclick="switchAdminTab('tickets')">ТИКЕТИ 🎧</button>`;
    
    if (userRole === 'admin' || userRole === 'owner') {
        navButtons += `
            <button class="adm-nav-item" onclick="switchAdminTab('add_game')">НОВА ГРА ➕</button>
            <button class="adm-nav-item" onclick="switchAdminTab('all_orders')">ЗАМОВЛЕННЯ 📦</button>
        `;
    }
    
    if (userRole === 'owner') {
        navButtons += `<button class="adm-nav-item" onclick="switchAdminTab('users')">ПРАВА 🔑</button>`;
    }

    modalData.innerHTML = `
        <div style="padding: 30px; color: black; background: #fff; min-height: 600px;">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h1 style="margin-bottom: 20px; font-size: 26px; border-bottom: 3px solid #333; padding-bottom: 10px;">
                ПАНЕЛЬ УПРАВЛІННЯ [${userRole.toUpperCase()}]
            </h1>
            
            <div style="display: flex; gap: 10px; margin-bottom: 30px; flex-wrap: wrap;">
                ${navButtons}
            </div>

            <div id="admin-view-port" style="background: #f9f9f9; border: 1px solid #ddd; border-radius: 12px; padding: 25px; min-height: 400px;">
                <p style="text-align: center; color: #999;">Оберіть розділ меню для початку роботи.</p>
            </div>
        </div>
    `;

    modal.classList.add('active');
    document.getElementById('overlay').classList.add('active');
    switchAdminTab('tickets');
}

async function switchAdminTab(tab) {
    const view = document.getElementById('admin-view-port');
    view.innerHTML = `<div style="text-align: center; padding: 50px;">Завантаження...</div>`;

    if (tab === 'tickets') {
        const { data, error } = await sbClient.from('support_tickets').select('*').order('created_at', { ascending: false });
        
        let html = `<h2 style="margin-bottom: 20px;">Звернення користувачів</h2>`;
        if (data && data.length > 0) {
            data.forEach(item => {
                html += `
                    <div style="background: white; border: 1px solid #ccc; padding: 20px; margin-bottom: 15px; border-radius: 10px; border-left: 6px solid #f1c40f;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <strong style="color: #2c3e50; font-size: 16px;">${item.user_email}</strong>
                            <span style="font-size: 12px; color: #888;">${new Date(item.created_at).toLocaleString()}</span>
                        </div>
                        <p style="font-size: 15px; line-height: 1.6; color: #444; background: #fdfdfd; padding: 10px; border-radius: 5px;">${item.message}</p>
                        <div style="margin-top: 15px; text-align: right;">
                            <a href="mailto:${item.user_email}?subject=Olux Store Support" style="padding: 8px 20px; background: #2c3e50; color: white; text-decoration: none; border-radius: 6px; font-size: 13px;">ВІДПОВІСТИ НА EMAIL</a>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<p style="color: #666;">Повідомлень поки немає.</p>`;
        }
        view.innerHTML = html;

    } else if (tab === 'add_game') {
        view.innerHTML = `
            <h2 style="margin-bottom: 20px;">Додати нову гру</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">Назва:</label>
                    <input type="text" id="g-title" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px;">
                </div>
                <div>
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">Ціна (грн):</label>
                    <input type="number" id="g-price" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px;">
                </div>
                <div>
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">Картинка (URL):</label>
                    <input type="text" id="g-img" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px;">
                </div>
                <div>
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">Автор:</label>
                    <input type="text" id="g-author" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px;">
                </div>
                <div>
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">Рік:</label>
                    <input type="text" id="g-year" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px;">
                </div>
                <div>
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">Жанр:</label>
                    <select id="g-genre" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px;">
                        <option value="action">Екшн</option>
                        <option value="rpg">RPG</option>
                        <option value="horror">Хорор</option>
                    </select>
                </div>
            </div>
            <div style="margin-top: 20px;">
                <label style="display:block; margin-bottom:5px; font-weight:bold;">Опис:</label>
                <textarea id="g-desc" style="width:100%; height:80px; padding:10px; border:1px solid #ccc; border-radius:6px;"></textarea>
            </div>
            <div style="margin-top: 10px;">
                <label style="display:block; margin-bottom:5px; font-weight:bold;">Вимоги:</label>
                <textarea id="g-specs" style="width:100%; height:80px; padding:10px; border:1px solid #ccc; border-radius:6px;"></textarea>
            </div>
            <button onclick="saveNewGame()" style="width:100%; margin-top:20px; padding:15px; background:#27ae60; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">ЗБЕРЕГТИ В БАЗУ</button>
        `;

    } else if (tab === 'all_orders') {
        const { data } = await sbClient.from('orders').select('*').order('created_at', { ascending: false });
        let html = `<h2>Історія всіх продажів</h2>`;
        if (data && data.length > 0) {
            data.forEach(order => {
                html += `
                    <div style="background: white; border: 1px solid #eee; padding: 12px; margin-bottom: 8px; border-radius: 8px;">
                        <strong>${order.user_email}</strong> — <span style="color:#27ae60;">${order.total_price} грн</span><br>
                        <small style="color:#777;">Товари: ${order.items_names}</small>
                    </div>
                `;
            });
        } else {
            html += `<p>Продажів ще не було.</p>`;
        }
        view.innerHTML = html;

    } else if (tab === 'users') {
        view.innerHTML = `
            <h2>Призначення ролей</h2>
            <div style="background: white; padding: 20px; border-radius: 10px; border: 1px solid #ddd;">
                <div style="margin-bottom: 15px;">
                    <label style="display:block; margin-bottom:5px;">Email користувача:</label>
                    <input type="email" id="u-email" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display:block; margin-bottom:5px;">Роль:</label>
                    <select id="u-role" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px;">
                        <option value="moderator">Модератор (Тільки тикети)</option>
                        <option value="admin">Адміністратор (Товари + Тикети)</option>
                    </select>
                </div>
                <button onclick="assignRole()" style="width:100%; padding:12px; background:#2980b9; color:white; border:none; border-radius:6px; cursor:pointer;">ОНОВИТИ ПРАВА</button>
            </div>
        `;
    }
}

async function saveNewGame() {
    const gameData = {
        title: document.getElementById('g-title').value,
        price: parseFloat(document.getElementById('g-price').value),
        img: document.getElementById('g-img').value,
        author: document.getElementById('g-author').value,
        year: document.getElementById('g-year').value,
        description: document.getElementById('g-desc').value,
        specs: document.getElementById('g-specs').value,
        genre: document.getElementById('g-genre').value
    };

    const { error } = await sbClient.from('games').insert([gameData]);
    if (error) alert("Помилка: " + error.message);
    else {
        alert("Гру додано!");
        closeModal();
        location.reload();
    }
}

async function assignRole() {
    const email = document.getElementById('u-email').value;
    const role = document.getElementById('u-role').value;
    const { error } = await sbClient.from('admin_status').upsert([{ user_email: email, role: role }]);
    if (error) alert("Помилка: " + error.message);
    else alert("Роль змінена для " + email);
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
            <p style="color:#333; line-height: 1.6;">${d.desc || 'Опис відсутній'}</p>
            <div style="background:#f4f4f4; padding:15px; border-radius:10px; color:black; font-size:14px; margin:20px 0;">
                <p><b>Автор:</b> ${d.author || 'Невідомо'}</p>
                <p><b>Рік:</b> ${d.year || '2024'}</p>
                <p><b>Системні вимоги:</b> ${d.specs || 'Мінімальні'}</p>
            </div>
            <button class="buy-btn" style="width:100%; padding: 18px;" onclick="addToCartDirect('${d.title}', ${d.price}, '${d.img}')">У КОШИК</button>
        </div>
    `;
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function addToCartDirect(title, price, img) {
    if (cart.some(i => i.title === title)) return alert("Вже у кошику!");
    cart.push({ title, price: parseFloat(price), img });
    saveCart();
    closeModal();
}

function addToCart(btn) {
    const c = btn.closest('.game-card');
    const g = { title: c.dataset.title, price: parseFloat(c.dataset.price), img: c.dataset.img };
    if (cart.some(i => i.title === g.title)) return alert("Вже у кошику!");
    cart.push(g);
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
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:15px; background:#fff; padding:10px; border-radius:8px; color:black;">
                    <img src="${item.img}" width="40" height="50" style="border-radius:4px; object-fit:cover;">
                    <div style="flex:1;">
                        <b style="font-size:14px;">${item.title}</b><br>
                        <span style="color:#d4af37; font-size:13px;">${item.price} грн</span>
                    </div>
                    <span onclick="removeFromCart(${i})" style="color:red; cursor:pointer; font-size:20px;">&times;</span>
                </div>
            `;
        }).join('') : '<p style="text-align:center; color:gray;">Кошик порожній</p>';
    }
    if (total) total.innerText = sum;
}

function removeFromCart(i) {
    cart.splice(i, 1);
    saveCart();
}

async function checkout() {
    if (!currentUser) return toggleAuthModal();
    if (!cart.length) return alert("Оберіть ігри!");
    const items = cart.map(i => i.title).join(', ');
    const total = cart.reduce((s, i) => s + i.price, 0);
    const { error } = await sbClient.from('orders').insert([{ user_email: currentUser.email, items_names: items, total_price: total }]);
    if (!error) {
        cart = [];
        saveCart();
        window.location.href = CONFIG.DONATE_URL;
    }
}

async function signIn() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { error } = await sbClient.auth.signInWithPassword({ email, password });
    if (error) alert("Помилка: " + error.message);
}

async function signUp() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { error } = await sbClient.auth.signUp({ email, password });
    if (error) alert("Помилка: " + error.message);
    else alert("Перевірте пошту!");
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
