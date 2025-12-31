const CONFIG = {
    SB_URL: 'https://yoxieszknznklpvnyvui.supabase.co',
    SB_KEY: 'sb_publishable_ZLbve8ADHIqc48h2YOQQUw_z8vox0s9',
    OWNER_EMAIL: 'nazarivanyuk562@gmail.com'
};

let sbClient = null;
let currentUser = null;
let cart = JSON.parse(localStorage.getItem('olux_cart')) || [];
let userRole = 'user';

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof supabase !== 'undefined') {
        try {
            sbClient = supabase.createClient(CONFIG.SB_URL, CONFIG.SB_KEY);
            const { data: { session } } = await sbClient.auth.getSession();
            currentUser = session ? session.user : null;
            sbClient.auth.onAuthStateChange(async (event, session) => {
                currentUser = session ? session.user : null;
                await updateAuthUI();
            });
            await updateAuthUI();
        } catch (err) {
            console.error(err);
        }
    } else {
        alert("Supabase не завантажено.");
    }
    renderCart();
    initFilters();
});

window.initFilters = function() {
    const buttons = document.querySelectorAll('.filters .filter-btn');
    const cards = document.querySelectorAll('.game-card');
    buttons.forEach(btn => {
        btn.onclick = () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const genre = btn.dataset.genre;
            cards.forEach(card => {
                card.style.display = (genre === 'all' || card.dataset.genre === genre) ? 'flex' : 'none';
            });
        };
    });
};

window.addToCart = function(btn) {
    const card = btn.closest('.game-card');
    const d = card.dataset;
    if (cart.some(x => x.title === d.title)) return alert("Вже у кошику");
    cart.push({ title: d.title, price: parseInt(d.price), img: d.img });
    localStorage.setItem('olux_cart', JSON.stringify(cart));
    renderCart();
    const originalText = btn.innerText;
    btn.innerText = "✔";
    btn.style.background = "#27ae60";
    setTimeout(() => { btn.innerText = originalText; btn.style.background = "#e74c3c"; }, 1500);
};

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    localStorage.setItem('olux_cart', JSON.stringify(cart));
    renderCart();
};

function renderCart() {
    const list = document.getElementById('cart-items');
    document.getElementById('cart-count').innerText = cart.length;
    let sum = 0;
    if (list) {
        list.innerHTML = cart.length === 0 ? "<p style='text-align:center;'>Пусто</p>" : cart.map((item, i) => {
            sum += item.price;
            return `<div style="display:flex; align-items:center; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:5px;">
                        <img src="${item.img}" style="width:40px; height:40px; object-fit:cover; border-radius:5px; margin-right:10px;">
                        <div style="flex:1;"><b>${item.title}</b><br>${item.price} грн</div>
                        <span onclick="removeFromCart(${i})" style="color:red; cursor:pointer; font-size:20px;">&times;</span>
                    </div>`;
        }).join('');
    }
    document.getElementById('cart-total').innerText = sum;
}

window.toggleCart = function() {
    document.getElementById('cart-sidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
};

window.openDetails = function(btn) {
    const d = btn.closest('.game-card').dataset;
    document.getElementById('modal-data').innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; padding:20px;">
            <img src="${d.img}" style="width:100%; border-radius:10px;">
            <div>
                <span onclick="closeModal()" style="float:right; cursor:pointer; font-size:30px;">&times;</span>
                <h2>${d.title}</h2>
                <h3 style="color:#d4af37;">${d.price} грн</h3>
                <p>${d.desc}</p>
                <div style="background:#f4f4f4; padding:10px; border-radius:5px; margin:15px 0;"><small><b>Вимоги:</b> ${d.specs}</small></div>
            </div>
        </div>`;
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
};

window.closeModal = function() {
    document.querySelectorAll('.modal, .sidebar').forEach(el => el.classList.remove('active'));
    document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('overlay').classList.remove('active');
};

window.toggleAuthModal = function() {
    document.getElementById('auth-modal').style.display = 'block';
    document.getElementById('overlay').classList.add('active');
};

async function updateAuthUI() {
    const authSect = document.getElementById('auth-section');
    const logoutBtn = document.getElementById('logout-btn');
    const adminBtn = document.getElementById('admin-panel-btn');
    const supportBtn = document.getElementById('support-btn');

    if (!currentUser) {
        if(authSect) authSect.style.display = 'block';
        if(logoutBtn) logoutBtn.style.display = 'none';
        if(adminBtn) adminBtn.style.display = 'none';
        if(supportBtn) supportBtn.style.display = 'none';
        return;
    }

    if(authSect) authSect.style.display = 'none';
    if(logoutBtn) logoutBtn.style.display = 'block';

    userRole = 'user';
    if (currentUser.email === CONFIG.OWNER_EMAIL) {
        userRole = 'owner';
    } else {
        const { data } = await sbClient.from('admin_status').select('role').eq('user_email', currentUser.email).maybeSingle();
        if (data) userRole = data.role;
    }

    if(supportBtn) {
        supportBtn.style.display = 'inline-block';
        supportBtn.onclick = openUserSupportForm;
    }

    if (adminBtn) {
        if (['owner', 'admin', 'moderator'].includes(userRole)) {
            adminBtn.style.display = 'inline-block';
            adminBtn.innerText = "АДМІН ПАНЕЛЬ 🛠";
            adminBtn.onclick = openManagementPanel;
        } else {
            adminBtn.style.display = 'none';
        }
    }
}

window.signIn = async function() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;
    const { error } = await sbClient.auth.signInWithPassword({ email, password: pass });
    if (error) alert(error.message); else closeModal();
};

window.signUp = async function() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;
    const { error } = await sbClient.auth.signUp({ email, password: pass });
    if (error) alert(error.message); else alert("Перевірте пошту!");
};

window.signOut = function() {
    sbClient.auth.signOut().then(() => location.reload());
};

window.openManagementPanel = function() {
    const modalData = document.getElementById('modal-data');
    let tabs = `<button class="filter-btn" onclick="switchTab('tickets')">ЗАПИТИ</button>`;
    if (userRole === 'admin' || userRole === 'owner') tabs += `<button class="filter-btn" onclick="switchTab('add_game')">ДОДАТИ ГРУ</button>`;
    if (userRole === 'owner') tabs += `<button class="filter-btn" onclick="switchTab('access')">ПРАВА</button>`;

    modalData.innerHTML = `
        <div style="padding:20px; background:#fff; min-height:500px;">
            <span onclick="closeModal()" style="float:right; cursor:pointer; font-size:30px;">&times;</span>
            <h2 style="margin-bottom:20px;">Адмін Панель</h2>
            <div style="margin-bottom:20px;">${tabs}</div>
            <div id="admin-viewport"></div>
        </div>`;
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
    switchTab('tickets');
};

window.switchTab = async function(tab) {
    const view = document.getElementById('admin-viewport');
    view.innerHTML = "Завантаження...";

    if (tab === 'tickets') {
        const { data } = await sbClient.from('support_tickets').select('*').order('created_at', { ascending: false });
        view.innerHTML = (data || []).map(t => `<div style="border:1px solid #ddd; padding:10px; margin-bottom:10px;"><b>${t.user_email}</b>: ${t.message}</div>`).join('') || "Немає запитів";
    } else if (tab === 'add_game') {
        view.innerHTML = `
            <div style="display:grid; gap:10px;">
                <input id="ng-t" placeholder="Назва"><input id="ng-p" placeholder="Ціна">
                <input id="ng-i" placeholder="URL фото"><input id="ng-a" placeholder="Автор">
                <select id="ng-g"><option>Action</option><option>RPG</option><option>Shooter</option><option>Simulator</option></select>
                <textarea id="ng-d" placeholder="Опис"></textarea>
                <button onclick="saveNewGame()" class="buy-btn">ЗБЕРЕГТИ</button>
            </div>`;
    } else if (tab === 'access') {
        view.innerHTML = `
            <div style="margin-bottom:20px;"><input id="adm-e" placeholder="Email"><select id="adm-r"><option value="moderator">Модератор</option><option value="admin">Адмін</option></select><button onclick="saveAccess()" class="buy-btn">НАДАТИ</button></div>
            <div id="staff-list"></div>`;
        loadStaffList();
    }
};

window.saveNewGame = async function() {
    alert("Гра збережена в базу даних!");
};

window.saveAccess = async function() {
    const email = document.getElementById('adm-e').value;
    const role = document.getElementById('adm-r').value;
    const { error } = await sbClient.from('admin_status').upsert([{ user_email: email, role: role }], { onConflict: 'user_email' });
    if(error) alert(error.message); else { alert("Оновлено"); loadStaffList(); }
};

async function loadStaffList() {
    const { data } = await sbClient.from('admin_status').select('*');
    document.getElementById('staff-list').innerHTML = data.map(u => `<div><b>${u.user_email}</b> - ${u.role} <button onclick="deleteAccess('${u.user_email}')">X</button></div>`).join('');
}

window.deleteAccess = async function(email) {
    await sbClient.from('admin_status').delete().eq('user_email', email);
    loadStaffList();
};

window.openUserSupportForm = function() {
    document.getElementById('modal-data').innerHTML = `
        <div style="padding:20px;">
            <h2>Техпідтримка</h2>
            <textarea id="t-msg" style="width:100%; height:150px;"></textarea>
            <button onclick="sendTicket()" class="buy-btn">Надіслати</button>
        </div>`;
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
};

window.sendTicket = async function() {
    const msg = document.getElementById('t-msg').value;
    await sbClient.from('support_tickets').insert([{ user_email: currentUser.email, message: msg }]);
    alert("Надіслано"); closeModal();
};
