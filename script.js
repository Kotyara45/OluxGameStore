let cart = [];
const overlay = document.getElementById('overlay');
const SB_URL = 'https://yoxieszknznklpvnyvui.supabase.co';
const SB_KEY = 'sb_publishable_ZLbve8ADHIqc48h2YOQQUw_z8vox0s9';
let sbClient;

window.onload = () => {
    sbClient = supabase.createClient(SB_URL, SB_KEY);
    checkUser();
    const banner = document.getElementById('joke-banner');
    if (banner) {
        setTimeout(() => { banner.classList.add('hidden'); }, 5000);
    }
};

function openDetails(btn) {
    const d = btn.closest('.game-card').dataset;
    const modal = document.getElementById('details-modal');
    const modalData = document.getElementById('modal-data');
    modalData.innerHTML = `
        <div class="modal-img-side"><img src="${d.img}" alt="${d.title}"></div>
        <div class="modal-info-side">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h2>${d.title}</h2>
            <div class="modal-price">${d.price} грн</div>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">${d.desc}</p>
            <ul class="modal-specs">
                <li><strong>Видавець:</strong> ${d.author}</li>
                <li><strong>Рік випуску:</strong> ${d.year}</li>
                <li><strong>Мін. вимоги:</strong> ${d.specs}</li>
            </ul>
            <button class="modal-buy-btn" onclick="addToCartDirect('${d.title}', ${d.price}, '${d.img}')">Додати у кошик</button>
        </div>`;
    modal.classList.add('active');
    overlay.classList.add('active');
}

function addToCartDirect(title, price, img) {
    cart.push({ title, price: parseInt(price) || 0, img });
    updateUI();
    closeModal();
}

function addToCart(btn) {
    const d = btn.closest('.game-card').dataset;
    cart.push({ title: d.title, price: parseInt(d.price) || 0, img: d.img });
    updateUI();
}

function updateUI() {
    const cartCount = document.getElementById('cart-count');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    cartCount.innerText = cart.length;
    let total = 0;
    cartItems.innerHTML = cart.map((item, i) => {
        total += item.price;
        return `<div class="cart-item">
            <img src="${item.img}">
            <div style="flex: 1;">
                <div style="font-weight: bold; font-size: 14px;">${item.title}</div>
                <div style="color: #d4af37; font-weight: bold;">${item.price} грн</div>
            </div>
            <span style="cursor: pointer; color: #ff4444;" onclick="removeFromCart(${i})">✕</span>
        </div>`;
    }).join('');
    cartTotal.innerText = total;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateUI();
}

async function checkout() {
    if (cart.length === 0) return alert("Ваш кошик порожній!");
    const { data: { user } } = await sbClient.auth.getUser();
    if (!user) {
        alert("Увійдіть в акаунт для покупки!");
        toggleAuthModal();
        return;
    }
    for (let item of cart) {
        await sbClient.from('user_purchases').insert([{ user_id: user.id, game_title: item.title, price: item.price }]);
    }
    alert("Дякуємо! Історія оновлена.");
    cart = [];
    updateUI();
    window.location.href = 'https://donatello.to/OluxGameStore';
}

function closeModal() {
    document.getElementById('details-modal').classList.remove('active');
    if (!document.getElementById('cart-sidebar').classList.contains('active')) overlay.classList.remove('active');
}

function toggleCart() {
    const s = document.getElementById('cart-sidebar');
    s.classList.toggle('active');
    overlay.classList.toggle('active', s.classList.contains('active'));
}

overlay.onclick = () => {
    document.getElementById('details-modal').classList.remove('active');
    document.getElementById('cart-sidebar').classList.remove('active');
    document.getElementById('admin-modal').style.display = 'none';
    document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('history-modal').style.display = 'none';
    overlay.classList.remove('active');
};

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelector('.filter-btn.active').classList.remove('active');
        btn.classList.add('active');
        const g = btn.dataset.genre;
        document.querySelectorAll('.game-card').forEach(c => {
            c.style.display = (g === 'all' || c.dataset.genre === g) ? 'block' : 'none';
        });
    };
});

document.getElementById('cart-btn').onclick = toggleCart;

async function sendSupportMessage() {
    const i = document.getElementById('user-msg');
    const t = i.value.trim();
    if(!t) return;
    const m = document.getElementById('chat-messages');
    m.innerHTML += `<div style="background:#eee; padding:8px; border-radius:12px; align-self:flex-end; margin-bottom:5px;">${t}</div>`;
    i.value = '';
    const { data } = await sbClient.from('admin_status').select('is_online').eq('id', 1).single();
    if(data && !data.is_online) {
        setTimeout(() => { m.innerHTML += `<div style="background:#ffebee; color:#c62828; padding:8px; border-radius:10px; font-size:12px; margin-bottom:5px;">Офлайн.</div>`; m.scrollTop = m.scrollHeight; }, 1000);
    } else {
        await sbClient.from('support_messages').insert([{ message: t }]);
    }
    m.scrollTop = m.scrollHeight;
}

function toggleChat() {
    const b = document.getElementById('chat-body');
    b.style.display = (b.style.display === 'none') ? 'flex' : 'none';
}

function toggleAdminPanel() {
    const m = document.getElementById('admin-modal');
    m.style.display = (m.style.display === 'none') ? 'block' : 'none';
    overlay.classList.toggle('active', m.style.display === 'block');
}

async function addNewGame() {
    const d = { title: document.getElementById('adm-title').value, price: parseInt(document.getElementById('adm-price').value), img_url: document.getElementById('adm-img').value, description: document.getElementById('adm-desc').value };
    const { error } = await sbClient.from('games').insert([d]);
    if (error) alert(error.message); else location.reload();
}

function toggleAuthModal() {
    const m = document.getElementById('auth-modal');
    m.style.display = (m.style.display === 'none') ? 'block' : 'none';
    overlay.classList.toggle('active', m.style.display === 'block');
}

async function signUp() {
    const { error } = await sbClient.auth.signUp({ email: document.getElementById('auth-email').value, password: document.getElementById('auth-password').value });
    if (error) alert(error.message); else alert("Підтвердіть Email!");
}

async function signIn() {
    const { error } = await sbClient.auth.signInWithPassword({ email: document.getElementById('auth-email').value, password: document.getElementById('auth-password').value });
    if (error) alert(error.message); else location.reload();
}

async function checkUser() {
    const { data: { user } } = await sbClient.auth.getUser();
    if (user) {
        document.getElementById('auth-btn').innerText = "Профіль (" + user.email.split('@')[0] + ")";
        document.getElementById('history-btn').style.display = 'block';
    }
}

async function toggleHistoryModal() {
    const m = document.getElementById('history-modal');
    const l = document.getElementById('purchase-list');
    if (m.style.display === 'none') {
        const { data: { user } } = await sbClient.auth.getUser();
        const { data: pur } = await sbClient.from('user_purchases').select('*').eq('user_id', user.id);
        l.innerHTML = pur?.length ? pur.map(p => `<div style="padding:8px; border-bottom:1px solid #eee;"><b>${p.game_title}</b> — ${p.price} грн</div>`).join('') : "Немає покупок";
        m.style.display = 'block';
        overlay.classList.add('active');
    } else {
        m.style.display = 'none';
        overlay.classList.remove('active');
    }
}
