const SB_URL = 'https://yoxieszknznklpvnyvui.supabase.co';
const SB_KEY = 'sb_publishable_ZLbve8ADHIqc48h2YOQQUw_z8vox0s9';
const OWNER_EMAIL = 'nazarivanyuk562@gmail.com';
let sbClient;
let cart = [];
const overlay = document.getElementById('overlay');

window.onload = () => {
    sbClient = supabase.createClient(SB_URL, SB_KEY);
    checkUser();
    const banner = document.getElementById('joke-banner');
    if (banner) {
        setTimeout(() => banner.classList.add('hidden'), 5000);
    }
};

function toggleAdminPanel() {
    window.location.href = 'admin.html';
}

function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active', sidebar.classList.contains('active'));
}

function closeModal() {
    document.getElementById('details-modal').classList.remove('active');
    document.getElementById('auth-modal').style.display = 'none';
    const hm = document.getElementById('history-modal');
    if (hm) hm.style.display = 'none';
    if (!document.getElementById('cart-sidebar').classList.contains('active')) overlay.classList.remove('active');
}

function openDetails(btn) {
    const d = btn.closest('.game-card').dataset;
    const modalData = document.getElementById('modal-data');
    modalData.innerHTML = `
        <div class="modal-img-side"><img src="${d.img}"></div>
        <div class="modal-info-side">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h2>${d.title}</h2>
            <div class="modal-price">${d.price} грн</div>
            <p style="color:#666; margin-bottom:20px;">${d.desc}</p>
            <ul class="modal-specs">
                <li><strong>Видавець:</strong> ${d.author}</li>
                <li><strong>Рік:</strong> ${d.year}</li>
                <li><strong>Вимоги:</strong> ${d.specs}</li>
            </ul>
            <button class="modal-buy-btn" onclick="addToCartDirect('${d.title}', ${d.price}, '${d.img}')">Додати у кошик</button>
        </div>`;
    document.getElementById('details-modal').classList.add('active');
    overlay.classList.add('active');
}

function addToCart(btn) {
    const d = btn.closest('.game-card').dataset;
    cart.push({ title: d.title, price: parseInt(d.price) || 0, img: d.img });
    updateUI();
}

function addToCartDirect(title, price, img) {
    cart.push({ title, price: parseInt(price) || 0, img });
    updateUI();
    closeModal();
}

function updateUI() {
    document.getElementById('cart-count').innerText = cart.length;
    let total = 0;
    document.getElementById('cart-items').innerHTML = cart.map((item, i) => {
        total += item.price;
        return `<div class="cart-item">
            <img src="${item.img}" width="50">
            <div style="flex:1"><b>${item.title}</b><br><span style="color:gold">${item.price} грн</span></div>
            <span style="cursor:pointer;color:red" onclick="removeFromCart(${i})">✕</span>
        </div>`;
    }).join('');
    document.getElementById('cart-total').innerText = total;
}

function removeFromCart(i) { cart.splice(i, 1); updateUI(); }

async function checkout() {
    if (cart.length === 0) return alert("Кошик порожній!");
    const { data: { user } } = await sbClient.auth.getUser();
    if (!user) return toggleAuthModal();
    
    const items = cart.map(i => i.title).join(', ');
    const total = cart.reduce((s, i) => s + i.price, 0);
    
    await sbClient.from('orders').insert([{ user_email: user.email, items_names: items, total_price: total }]);
    window.location.href = 'https://donatello.to/OluxGameStore';
}

async function checkUser() {
    const { data: { user } } = await sbClient.auth.getUser();
    if (user) {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('logout-btn').style.display = 'block';
        document.getElementById('history-btn').style.display = 'block';
        if (user.email === OWNER_EMAIL) {
            document.getElementById('admin-panel-btn').style.display = 'block';
        }
    }
}

function toggleAuthModal() {
    const m = document.getElementById('auth-modal');
    m.style.display = m.style.display === 'block' ? 'none' : 'block';
    overlay.classList.toggle('active', m.style.display === 'block');
}

async function signIn() {
    const e = document.getElementById('auth-email').value;
    const p = document.getElementById('auth-password').value;
    const { error } = await sbClient.auth.signInWithPassword({ email: e, password: p });
    if (error) alert(error.message); else location.reload();
}

async function signUp() {
    const e = document.getElementById('auth-email').value;
    const p = document.getElementById('auth-password').value;
    const { error } = await sbClient.auth.signUp({ email: e, password: p });
    if (error) alert(error.message); else alert("Перевірте пошту!");
}

async function signOut() { await sbClient.auth.signOut(); location.reload(); }

async function toggleHistoryModal() {
    const modal = document.getElementById('history-modal');
    const list = document.getElementById('history-list');
    modal.style.display = 'block';
    overlay.classList.add('active');
    list.innerHTML = 'Завантаження...';
    const { data: { user } } = await sbClient.auth.getUser();
    const { data } = await sbClient.from('orders').select('*').eq('user_email', user.email).order('created_at', { ascending: false });
    list.innerHTML = data && data.length ? data.map(o => `
        <div style="border-bottom:1px solid #eee; padding:10px 0; color: black;">
            <b>#${o.id.slice(0,5)}</b> - ${o.total_price} грн<br>
            <small>${o.items_names}</small>
        </div>`).join('') : 'Немає замовлень';
}

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
overlay.onclick = closeModal;
