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
        currentUser = session ? session.user : null;

        sbClient.auth.onAuthStateChange(async (event, session) => {
            currentUser = session ? session.user : null;
            await updateAuthUI();
        });

        await updateAuthUI();
        renderCart();
        initFilters();
    } catch (err) {
        console.error("System Error:", err);
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

    if (supportBtn) {
        supportBtn.style.display = 'inline-block';
        supportBtn.onclick = openUserSupportForm;
    }

    if (adminBtn) {
        if (['owner', 'admin', 'moderator'].includes(userRole)) {
            adminBtn.style.display = 'inline-block';
            adminBtn.innerText = userRole === 'owner' ? "ВЛАСНИК 👑" : (userRole === 'admin' ? "АДМІНІСТРАТОР 🛠" : "МОДЕРАТОР 🛡");
            adminBtn.onclick = openManagementPanel;
        } else {
            adminBtn.style.display = 'none';
        }
    }
}

function openUserSupportForm() {
    const modalData = document.getElementById('modal-data');
    const modal = document.getElementById('details-modal');
    
    modalData.innerHTML = `
        <div style="padding: 40px; color: #222; background: #fff; border-radius: 20px; position: relative;">
            <span class="close-btn-large" onclick="closeModal()" style="position: absolute; right: 25px; top: 15px; cursor: pointer; font-size: 40px;">&times;</span>
            <h2 style="font-size: 30px; color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 15px; margin-bottom: 25px;">Технічна підтримка</h2>
            
            <div style="margin-bottom: 25px;">
                <label style="display:block; font-weight:bold; margin-bottom:10px; font-size: 16px;">Ваш запит:</label>
                <textarea id="support-msg-body" placeholder="Опишіть вашу проблему якомога детальніше..." style="width: 100%; height: 220px; padding: 20px; border: 2px solid #eaeff2; border-radius: 15px; font-size: 16px; background: #fcfdfe; outline: none; resize: none;"></textarea>
            </div>

            <button onclick="submitUserTicket()" style="width: 100%; padding: 20px; background: #3498db; color: white; border: none; border-radius: 12px; font-weight: bold; font-size: 18px; cursor: pointer; transition: 0.3s;">НАДІСЛАТИ ПОВІДОМЛЕННЯ</button>
        </div>
    `;
    modal.classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

async function submitUserTicket() {
    const msg = document.getElementById('support-msg-body').value;
    if (msg.trim().length < 5) return alert("Будь ласка, введіть текст повідомлення.");

    const { error } = await sbClient.from('support_tickets').insert([
        { user_email: currentUser.email, message: msg, created_at: new Date() }
    ]);

    if (error) alert("Помилка: " + error.message);
    else {
        alert("Ваше звернення прийнято! Очікуйте відповідь на пошту.");
        closeModal();
    }
}

function openManagementPanel() {
    const modalData = document.getElementById('modal-data');
    const modal = document.getElementById('details-modal');

    let navTabs = `<button class="adm-t" onclick="switchTab('tickets')">ПИТАННЯ 🎧</button>`;
    if (userRole === 'admin' || userRole === 'owner') {
        navTabs += `<button class="adm-t" onclick="switchTab('add_game')">КАТАЛОГ ➕</button>`;
    }
    if (userRole === 'owner') {
        navTabs += `<button class="adm-t" onclick="switchTab('access_control')">ПРАВА ДОСТУПУ 🔑</button>`;
    }

    modalData.innerHTML = `
        <div style="padding: 35px; background: #fff; min-height: 650px; border-radius: 15px; color: #1a1a1a;">
            <span class="close-btn-large" onclick="closeModal()" style="float: right; cursor: pointer; font-size: 40px;">&times;</span>
            <h1 style="font-size: 32px; margin-bottom: 30px; color: #e74c3c;">Olux Management Suite</h1>
            <div style="display: flex; gap: 12px; margin-bottom: 30px; flex-wrap: wrap;">${navTabs}</div>
            <div id="admin-viewport" style="background: #f7f9fb; padding: 30px; border-radius: 15px; border: 1px solid #edf2f7; min-height: 450px;"></div>
        </div>
    `;
    modal.classList.add('active');
    document.getElementById('overlay').classList.add('active');
    switchTab('tickets');
}

async function switchTab(tab) {
    const view = document.getElementById('admin-viewport');
    view.innerHTML = `<h3 style="text-align:center; padding-top:100px;">Синхронізація з базою даних...</h3>`;

    if (tab === 'tickets') {
        const { data } = await sbClient.from('support_tickets').select('*').order('created_at', { ascending: false });
        let html = `<h3>Активні запити (${data ? data.length : 0})</h3>`;
        (data || []).forEach(t => {
            html += `
                <div style="background:white; border-left:8px solid #3498db; padding:25px; margin-bottom:20px; border-radius:10px; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
                    <div style="display:flex; justify-content:space-between; margin-bottom:15px; font-size:13px; color:#a0aec0;">
                        <b>${t.user_email}</b> <span>${new Date(t.created_at).toLocaleString()}</span>
                    </div>
                    <p style="font-size:16px; line-height:1.6; color:#2d3748;">${t.message}</p>
                    <div style="margin-top:20px; text-align:right;">
                        <a href="mailto:${t.user_email}?subject=Olux Game Store Support" style="padding:10px 25px; background:#2d3748; color:white; text-decoration:none; border-radius:8px; font-weight:bold;">ВІДПОВІСТИ</a>
                    </div>
                </div>`;
        });
        view.innerHTML = html || "Немає повідомлень.";

    } else if (tab === 'access_control') {
        view.innerHTML = `
            <h3>Управління ролями</h3>
            <div style="background:white; padding:30px; border-radius:15px; border:1px solid #e2e8f0; margin-bottom:30px;">
                <label style="display:block; margin-bottom:10px; font-weight:bold;">Email користувача:</label>
                <input id="new-adm-email" type="email" style="width:100%; padding:15px; border:2px solid #edf2f7; border-radius:10px; margin-bottom:20px;">
                
                <label style="display:block; margin-bottom:10px; font-weight:bold;">Оберіть ранг:</label>
                <select id="new-adm-role" style="width:100%; padding:15px; border:2px solid #edf2f7; border-radius:10px; margin-bottom:25px;">
                    <option value="moderator">МОДЕРАТОР (Тикети)</option>
                    <option value="admin">АДМІНІСТРАТОР (Повний контроль)</option>
                </select>
                
                <button onclick="updateAccessRights()" style="width:100%; padding:18px; background:#27ae60; color:white; border:none; border-radius:10px; font-weight:bold; cursor:pointer;">ЗБЕРЕГТИ ЗМІНИ</button>
            </div>
            <div id="staff-table"></div>
        `;
        loadStaffTable();

    } else if (tab === 'add_game') {
        view.innerHTML = `
            <h3>Новий товар в каталозі</h3>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-top:20px;">
                <input id="ng-t" placeholder="Назва">
                <input id="ng-p" type="number" placeholder="Ціна (UAH)">
                <input id="ng-i" placeholder="URL Зображення">
                <input id="ng-a" placeholder="Розробник">
                <input id="ng-y" placeholder="Рік випуску">
                <select id="ng-g"><option value="action">Action</option><option value="rpg">RPG</option><option value="horror">Horror</option></select>
            </div>
            <textarea id="ng-d" placeholder="Опис гри" style="width:100%; height:100px; margin-top:20px; padding:15px; border-radius:10px; border:2px solid #edf2f7;"></textarea>
            <textarea id="ng-s" placeholder="Системні вимоги" style="width:100%; height:100px; margin-top:10px; padding:15px; border-radius:10px; border:2px solid #edf2f7;"></textarea>
            <button onclick="saveNewGameToDB()" style="width:100%; margin-top:25px; background:#2ecc71; color:white; padding:20px; border-radius:12px; border:none; font-weight:bold; cursor:pointer;">ОПУБЛІКУВАТИ</button>
        `;
    }
}

async function updateAccessRights() {
    const email = document.getElementById('new-adm-email').value.trim();
    const role = document.getElementById('new-adm-role').value;
    if (!email) return alert("Вкажіть Email!");

    const { error } = await sbClient
        .from('admin_status')
        .upsert([{ user_email: email, role: role }], { onConflict: 'user_email' });

    if (error) alert(error.message);
    else { alert("Успішно оновлено!"); loadStaffTable(); }
}

async function loadStaffTable() {
    const container = document.getElementById('staff-table');
    const { data } = await sbClient.from('admin_status').select('*');
    let html = `<h4>Зареєстрований персонал:</h4>`;
    (data || []).forEach(u => {
        html += `
            <div style="display:flex; justify-content:space-between; background:#fff; padding:15px; margin-bottom:8px; border-radius:8px; border:1px solid #e2e8f0;">
                <span><b>${u.user_email}</b> — ${u.role}</span>
                <button onclick="deleteAccess('${u.user_email}')" style="color:#e74c3c; background:none; border:none; cursor:pointer; font-weight:bold;">ВИДАЛИТИ</button>
            </div>`;
    });
    container.innerHTML = html;
}

async function deleteAccess(email) {
    if (!confirm("Видалити доступ?")) return;
    await sbClient.from('admin_status').delete().eq('user_email', email);
    loadStaffTable();
}

async function saveNewGameToDB() {
    const game = {
        title: document.getElementById('ng-t').value,
        price: parseFloat(document.getElementById('ng-p').value),
        img: document.getElementById('ng-i').value,
        author: document.getElementById('ng-a').value,
        year: document.getElementById('ng-y').value,
        genre: document.getElementById('ng-g').value,
        description: document.getElementById('ng-d').value,
        specs: document.getElementById('ng-s').value
    };
    const { error } = await sbClient.from('games').insert([game]);
    if (error) alert(error.message);
    else { alert("Додано!"); location.reload(); }
}

function openDetails(btn) {
    const d = btn.closest('.game-card').dataset;
    const modalData = document.getElementById('modal-data');
    modalData.innerHTML = `
        <div class="modal-img-side"><img src="${d.img}" style="width:100%; border-radius:20px;"></div>
        <div class="modal-info-side">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h2 style="color:#000; font-size:36px; margin-bottom:10px;">${d.title}</h2>
            <div style="color:#d4af37; font-size:30px; font-weight:bold; margin-bottom:20px;">${d.price} UAH</div>
            <p style="color:#4a5568; line-height:1.8; margin-bottom:25px;">${d.desc || 'Немає опису'}</p>
            <div style="background:#edf2f7; padding:25px; border-radius:15px; color:#2d3748; margin-bottom:30px;">
                <p style="margin-bottom:10px;"><b>Розробник:</b> ${d.author}</p>
                <p style="margin-bottom:10px;"><b>Рік:</b> ${d.year}</p>
                <p><b>Вимоги:</b> ${d.specs}</p>
            </div>
            <button class="buy-btn" style="width:100%; padding:22px; font-size:22px;" onclick="addToCartDirect('${d.title}', ${d.price}, '${d.img}')">🛒 ДОДАТИ В КОШИК</button>
        </div>
    `;
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function addToCartDirect(t, p, i) {
    if (cart.some(x => x.title === t)) return alert("Товар вже у кошику!");
    cart.push({ title: t, price: parseFloat(p), img: i });
    saveCart();
    closeModal();
}

function saveCart() { localStorage.setItem('olux_cart', JSON.stringify(cart)); renderCart(); }
function signOut() { sbClient.auth.signOut().then(() => location.reload()); }
function closeModal() {
    document.getElementById('details-modal').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
}
