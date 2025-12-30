const SB_URL = 'https://yoxieszknznklpvnyvui.supabase.co';
const SB_KEY = 'sb_publishable_ZLbve8ADHIqc48h2YOQQUw_z8vox0s9';
const OWNER_EMAIL = 'nazarivanyuk562@gmail.com';
let sbClient, cart = [];

window.onload = () => {
    sbClient = supabase.createClient(SB_URL, SB_KEY);
    checkUser();
};

async function checkUser() {
    const { data: { user } } = await sbClient.auth.getUser();
    const adminBtn = document.getElementById('admin-panel-btn');
    const authSec = document.getElementById('auth-section');
    const logBtn = document.getElementById('logout-btn');
    const histBtn = document.getElementById('history-btn');

    if (user) {
        if(authSec) authSec.style.display = 'none';
        if(logBtn) logBtn.style.display = 'block';
        if(histBtn) histBtn.style.display = 'block';

        if (user.email === OWNER_EMAIL) {
            if(adminBtn) adminBtn.style.display = 'block';
            document.getElementById('owner-tools').style.display = 'block';
        }
    }
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
    if (error) alert(error.message); else alert("Перевірте пошту для підтвердження!");
}

async function signOut() {
    await sbClient.auth.signOut();
    location.reload();
}

function toggleAuthModal() {
    document.getElementById('auth-modal').style.display = 
        document.getElementById('auth-modal').style.display === 'none' ? 'block' : 'none';
    document.getElementById('overlay').classList.toggle('active');
}

function toggleAdminPanel() {
    const m = document.getElementById('admin-modal');
    m.classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
}

function openDetails(btn) {
    const d = btn.closest('.game-card').dataset;
    const modalData = document.getElementById('modal-data');
    modalData.innerHTML = `
        <div class="modal-img-side"><img src="${d.img}" style="width:100%; border-radius:15px;"></div>
        <div class="modal-info-side">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h2>${d.title}</h2>
            <div class="modal-price">${d.price} грн</div>
            <p>${d.desc}</p>
            <button class="modal-buy-btn" onclick="addToCartDirect('${d.title}', ${d.price}, '${d.img}')">Додати в кошик</button>
        </div>`;
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('overlay').classList.remove('active');
}

function addToCart(btn) {
    const d = btn.closest('.game-card').dataset;
    cart.push({ title: d.title, price: parseInt(d.price), img: d.img });
    updateUI();
}

function updateUI() {
    document.getElementById('cart-count').innerText = cart.length;
    let total = 0;
    const items = document.getElementById('cart-items');
    items.innerHTML = cart.map((item, i) => {
        total += item.price;
        return `<div class="cart-item"><img src="${item.img}" width="40"> ${item.title} - ${item.price} грн</div>`;
    }).join('');
    document.getElementById('cart-total').innerText = total;
}

async function sendSupportMessage() {
    const i = document.getElementById('user-msg');
    if (!i.value) return;
    const m = document.getElementById('chat-messages');
    m.innerHTML += `<div style="align-self: flex-end; background: gold; color: black; padding: 8px; border-radius: 10px; max-width: 80%;">${i.value}</div>`;
    i.value = '';
    m.scrollTop = m.scrollHeight;
}
