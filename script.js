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

        updateAuthUI();
        renderCart();
        initFilters();
        console.log("Olux Store System Initialized...");
    } catch (err) {
        console.error("Initialization Failed:", err.message);
    }
};

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
        const { data, error } = await sbClient
            .from('admin_status')
            .select('role')
            .eq('user_email', currentUser.email)
            .maybeSingle();
        if (data) userRole = data.role;
    }

    if (adminBtn) {
        if (userRole === 'owner' || userRole === 'admin' || userRole === 'moderator') {
            adminBtn.style.display = 'block';
            if (userRole === 'owner') adminBtn.innerText = "ВЛАСНИК (👑)";
            else if (userRole === 'admin') adminBtn.innerText = "АДМІНІСТРАТОР (🛠)";
            else adminBtn.innerText = "МОДЕРАТОР (🛡)";
            
            adminBtn.onclick = function() {
                openAdminModal();
            };
        } else {
            adminBtn.style.display = 'none';
        }
    }
}

function openAdminModal() {
    const modalData = document.getElementById('modal-data');
    const modal = document.getElementById('details-modal');
    if (!modalData || !modal) return;

    let tabsHTML = '';
    tabsHTML += `<button class="admin-tab-btn" onclick="renderAdminTab('support_center')">ТЕХ.ПІДТРИМКА 🎧</button>`;
    
    if (userRole === 'owner' || userRole === 'admin') {
        tabsHTML += `<button class="admin-tab-btn" onclick="renderAdminTab('game_management')">ДОДАТИ ТОВАР ➕</button>`;
        tabsHTML += `<button class="admin-tab-btn" onclick="renderAdminTab('order_history')">ЗАМОВЛЕННЯ 📦</button>`;
    }
    
    if (userRole === 'owner') {
        tabsHTML += `<button class="admin-tab-btn" onclick="renderAdminTab('user_permissions')">КЕРУВАННЯ ПРАВАМИ 🔑</button>`;
    }

    modalData.innerHTML = `
        <div class="admin-full-container" style="padding: 40px; color: black; font-family: sans-serif;">
            <span class="close-btn-large" onclick="closeModal()" style="font-size: 35px;">&times;</span>
            <h1 style="border-bottom: 2px solid #333; padding-bottom: 10px;">ПАНЕЛЬ КЕРУВАННЯ: ${userRole.toUpperCase()}</h1>
            
            <div class="admin-navigation-bar" style="display: flex; gap: 15px; margin: 25px 0;">
                ${tabsHTML}
            </div>

            <div id="admin-dynamic-content" style="min-height: 400px; background: #f9f9f9; padding: 20px; border-radius: 12px; border: 1px solid #ddd;">
                <p>Оберіть розділ для початку роботи...</p>
            </div>
        </div>
    `;

    modal.classList.add('active');
    document.getElementById('overlay').classList.add('active');
    renderAdminTab('support_center');
}

async function renderAdminTab(tab) {
    const container = document.getElementById('admin-dynamic-content');
    container.innerHTML = `<h2 style="color: #555;">Завантаження розділу ${tab}...</h2>`;

    if (tab === 'support_center') {
        const { data, error } = await sbClient.from('support_tickets').select('*').order('created_at', { ascending: false });
        if (error) {
            container.innerHTML = `<p style="color:red;">Помилка БД: ${error.message}</p>`;
            return;
        }
        
        let ticketsList = `<h2>Активні звернення користувачів</h2>`;
        if (data && data.length > 0) {
            data.forEach(function(ticket) {
                ticketsList += `
                    <div class="support-card" style="background: white; border: 1px solid #ccc; padding: 15px; margin-bottom: 15px; border-radius: 8px; border-left: 6px solid #f1c40f;">
                        <div style="display: flex; justify-content: space-between;">
                            <strong>Користувач: ${ticket.user_email}</strong>
                            <small>${new Date(ticket.created_at).toLocaleString()}</small>
                        </div>
                        <p style="margin: 10px 0; font-style: italic;">"${ticket.message}"</p>
                        <div style="text-align: right;">
                            <a href="mailto:${ticket.user_email}?subject=Відповідь від Olux Support" style="padding: 8px 15px; background: #333; color: white; text-decoration: none; border-radius: 5px;">ВІДПОВІСТИ</a>
                        </div>
                    </div>
                `;
            });
        } else {
            ticketsList += `<p>Поки що звернень немає.</p>`;
        }
        container.innerHTML = ticketsList;

    } else if (tab === 'game_management') {
        container.innerHTML = `
            <h2>Додавання нової гри в каталог</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <label>Назва гри:</label>
                    <input type="text" id="add-title" style="width:100%; padding:10px; margin: 5px 0;">
                </div>
                <div>
                    <label>Ціна (грн):</label>
                    <input type="number" id="add-price" style="width:100%; padding:10px; margin: 5px 0;">
                </div>
                <div>
                    <label>URL Фото (обкладинка):</label>
                    <input type="text" id="add-img" style="width:100%; padding:10px; margin: 5px 0;">
                </div>
                <div>
                    <label>Автор/Студія:</label>
                    <input type="text" id="add-author" style="width:100%; padding:10px; margin: 5px 0;">
                </div>
                <div>
                    <label>Рік випуску:</label>
                    <input type="text" id="add-year" style="width:100%; padding:10px; margin: 5px 0;">
                </div>
                <div>
                    <label>Жанр:</label>
                    <select id="add-genre" style="width:100%; padding:10px; margin: 5px 0;">
                        <option value="action">Action</option>
                        <option value="rpg">RPG</option>
                        <option value="horror">Horror</option>
                    </select>
                </div>
            </div>
            <div style="margin-top: 20px;">
                <label>Опис гри:</label>
                <textarea id="add-desc" style="width:100%; height:80px; padding:10px; margin: 5px 0;"></textarea>
            </div>
            <div style="margin-top: 10px;">
                <label>Системні вимоги:</label>
                <textarea id="add-specs" style="width:100%; height:80px; padding:10px; margin: 5px 0;"></textarea>
            </div>
            <button onclick="submitNewGame()" style="width: 100%; padding: 15px; background: #27ae60; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 20px;">ОПУБЛІКУВАТИ ГРУ В МАГАЗИНІ</button>
        `;

    } else if (tab === 'order_history') {
        const { data } = await sbClient.from('orders').select('*').order('created_at', { ascending: false });
        let ordersHTML = `<h2>Всі продажі магазину</h2>`;
        if (data && data.length > 0) {
            data.forEach(function(order) {
                ordersHTML += `
                    <div style="background: white; border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; color: black;">
                        <b>ID: ${order.id}</b> | Покупець: ${order.user_email} | <b>${order.total_price} грн</b><br>
                        <small>Товари: ${order.items_names}</small>
                    </div>
                `;
            });
        } else {
            ordersHTML += `<p>Продажів ще не було.</p>`;
        }
        container.innerHTML = ordersHTML;

    } else if (tab === 'user_permissions') {
        container.innerHTML = `
            <h2>Керування ролями персоналу</h2>
            <div style="background: #eee; padding: 20px; border-radius: 10px;">
                <p>Введіть email зареєстрованого користувача, щоб змінити його права:</p>
                <input type="email" id="target-email" placeholder="email@example.com" style="width: 100%; padding: 10px; margin-bottom: 10px;">
                <select id="target-role" style="width: 100%; padding: 10px; margin-bottom: 15px;">
                    <option value="moderator">Модератор (Тільки техпідтримка)</option>
                    <option value="admin">Адміністратор (Товари + Замовлення)</option>
                </select>
                <button onclick="changeUserRole()" style="width: 100%; padding: 12px; background: #2980b9; color: white; border: none; border-radius: 5px; cursor: pointer;">ОБНОВИТИ ПРАВА ДОСТУПУ</button>
            </div>
        `;
    }
}

async function submitNewGame() {
    const newGame = {
        title: document.getElementById('add-title').value,
        price: parseFloat(document.getElementById('add-price').value),
        img: document.getElementById('add-img').value,
        author: document.getElementById('add-author').value,
        year: document.getElementById('add-year').value,
        description: document.getElementById('add-desc').value,
        specs: document.getElementById('add-specs').value,
        genre: document.getElementById('add-genre').value
    };

    if (!newGame.title || !newGame.price) {
        alert("Поля Назва та Ціна обов'язкові!");
        return;
    }

    const { error } = await sbClient.from('games').insert([newGame]);
    if (error) {
        alert("Помилка БД: " + error.message);
    } else {
        alert("Гру успішно додано!");
        closeModal();
        location.reload();
    }
}

async function changeUserRole() {
    const email = document.getElementById('target-email').value;
    const role = document.getElementById('target-role').value;

    if (!email) return alert("Введіть email!");

    const { error } = await sbClient.from('admin_status').upsert([
        { user_email: email, role: role }
    ]);

    if (error) alert("Помилка: " + error.message);
    else alert("Роль успішно змінена для " + email);
}

function openUserSupport() {
    if (!currentUser) {
        alert("Будь ласка, увійдіть в акаунт!");
        return;
    }
    const modalData = document.getElementById('modal-data');
    modalData.innerHTML = `
        <div class="support-modal-user" style="padding: 40px; color: black;">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h1>Написати в техпідтримку Olux</h1>
            <p>Ваш запит отримають модератори магазину. Опишіть проблему максимально детально.</p>
            <textarea id="support-user-text" style="width:100%; height:200px; padding:15px; border-radius:10px; margin-top:20px; border: 2px solid #ddd;" placeholder="Ваше повідомлення..."></textarea>
            <button onclick="submitTicketFromUser()" style="width:100%; margin-top:20px; padding:15px; background: #f1c40f; color: black; font-weight: bold; border: none; border-radius: 10px; cursor: pointer; font-size: 18px;">ВІДПРАВИТИ МОДЕРАТОРАМ</button>
        </div>
    `;
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

async function submitTicketFromUser() {
    const text = document.getElementById('support-user-text').value;
    if (!text.trim()) return alert("Повідомлення не може бути порожнім!");

    const { error } = await sbClient.from('support_tickets').insert([
        { user_email: currentUser.email, message: text }
    ]);

    if (error) {
        alert("Сталася помилка: " + error.message);
    } else {
        alert("Дякуємо! Ваше звернення надіслано.");
        closeModal();
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
            <p style="color:#333; line-height: 1.5;">${d.desc || 'Опис відсутній'}</p>
            <div style="background:#f4f4f4; padding:15px; border-radius:10px; color:black; font-size:14px; margin:20px 0;">
                <p><b>Студія:</b> ${d.author || 'Невідомо'}</p>
                <p><b>Дата релізу:</b> ${d.year || '2024'}</p>
                <p><b>Системні вимоги:</b> ${d.specs || 'Мінімальні'}</p>
            </div>
            <button class="buy-btn" style="width:100%; padding: 18px; font-size: 18px;" onclick="addToCartDirectly('${d.title}', ${d.price}, '${d.img}')">ДОДАТИ В КОШИК 🛒</button>
        </div>
    `;
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function addToCartDirectly(title, price, img) {
    const isExist = cart.some(item => item.title === title);
    if (isExist) {
        alert("Цей товар вже додано у ваш кошик.");
        return;
    }
    cart.push({ title, price: parseFloat(price), img });
    updateCartStorage();
    closeModal();
}

function addToCart(btn) {
    const card = btn.closest('.game-card');
    const game = {
        title: card.dataset.title,
        price: parseFloat(card.dataset.price),
        img: card.dataset.img
    };
    const isExist = cart.some(item => item.title === game.title);
    if (isExist) return alert("Вже у кошику!");
    
    cart.push(game);
    updateCartStorage();
}

function updateCartStorage() {
    localStorage.setItem('olux_cart', JSON.stringify(cart));
    renderCart();
}

function renderCart() {
    const countEl = document.getElementById('cart-count');
    const itemsCont = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    
    if (countEl) countEl.innerText = cart.length;
    
    let totalSum = 0;
    if (itemsCont) {
        itemsCont.innerHTML = '';
        if (cart.length === 0) {
            itemsCont.innerHTML = `<p style="text-align:center; color:gray; padding: 20px;">Кошик порожній...</p>`;
        } else {
            cart.forEach(function(item, index) {
                totalSum += item.price;
                itemsCont.innerHTML += `
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px; color:black; background:#fff; padding:10px; border-radius:8px;">
                        <img src="${item.img}" width="45" height="60" style="object-fit:cover; border-radius:4px;">
                        <div style="flex:1;">
                            <b style="font-size:14px;">${item.title}</b><br>
                            <span style="color:#d4af37;">${item.price} грн</span>
                        </div>
                        <span onclick="removeFromCart(${index})" style="color:red; cursor:pointer; font-weight:bold; font-size:18px;">&times;</span>
                    </div>
                `;
            });
        }
    }
    if (totalEl) totalEl.innerText = totalSum;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartStorage();
}

async function checkout() {
    if (!currentUser) {
        toggleAuthModal();
        return;
    }
    if (cart.length === 0) return alert("Ваш кошик порожній!");

    const itemsStr = cart.map(i => i.title).join(', ');
    const totalSum = cart.reduce((a, b) => a + b.price, 0);

    const { error } = await sbClient.from('orders').insert([
        { user_email: currentUser.email, items_names: itemsStr, total_price: totalSum }
    ]);

    if (!error) {
        cart = [];
        updateCartStorage();
        window.location.href = CONFIG.DONATE_URL;
    } else {
        alert("Помилка замовлення: " + error.message);
    }
}

async function toggleHistoryModal() {
    if (!currentUser) return;
    const modal = document.getElementById('history-modal');
    const list = document.getElementById('history-list');
    
    modal.style.display = 'block';
    document.getElementById('overlay').classList.add('active');
    list.innerHTML = 'Завантаження історії...';

    const { data, error } = await sbClient
        .from('orders')
        .select('*')
        .eq('user_email', currentUser.email)
        .order('created_at', { ascending: false });

    if (data && data.length > 0) {
        list.innerHTML = data.map(o => `
            <div style="padding:15px; border-bottom:1px solid #eee; color:black; background: white; margin-bottom: 8px; border-radius: 8px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <b>Замовлення #${o.id.toString().slice(0,8)}</b>
                    <span style="color: #27ae60; font-weight: bold;">${o.total_price} грн</span>
                </div>
                <small style="color:gray;">Товари: ${o.items_names}</small><br>
                <small style="color: silver;">Дата: ${new Date(o.created_at).toLocaleDateString()}</small>
            </div>
        `).join('');
    } else {
        list.innerHTML = '<p style="text-align:center; padding: 20px; color: gray;">У вас ще немає замовлень.</p>';
    }
}

async function signIn() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { error } = await sbClient.auth.signInWithPassword({ email, password });
    if (error) alert("Помилка входу: " + error.message);
}

async function signUp() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { error } = await sbClient.auth.signUp({ email, password });
    if (error) alert("Помилка реєстрації: " + error.message);
    else alert("Перевірте вашу пошту для підтвердження!");
}

async function signOut() {
    await sbClient.auth.signOut();
    location.reload();
}

function closeModal() {
    const modals = document.querySelectorAll('.modal');
    const sidebars = document.querySelectorAll('.sidebar');
    const smallModals = document.querySelectorAll('.modal-small');
    const overlay = document.getElementById('overlay');

    modals.forEach(m => m.classList.remove('active'));
    sidebars.forEach(s => s.classList.remove('active'));
    smallModals.forEach(sm => sm.style.display = 'none');
    if (overlay) overlay.classList.remove('active');
}

function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('overlay');
    if (sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    } else {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    }
}

function toggleAuthModal() {
    const modal = document.getElementById('auth-modal');
    const overlay = document.getElementById('overlay');
    modal.style.display = 'block';
    overlay.classList.add('active');
}

function initFilters() {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(function(btn) {
        btn.onclick = function() {
            const genre = btn.dataset.genre;
            document.querySelector('.filter-btn.active')?.classList.remove('active');
            btn.classList.add('active');
            
            const cards = document.querySelectorAll('.game-card');
            cards.forEach(function(card) {
                if (genre === 'all' || card.dataset.genre === genre) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        };
    });
}
