const SB_URL = 'https://yoxieszknznklpvnyvui.supabase.co';
const SB_KEY = 'sb_publishable_ZLbve8ADHIqc48h2YOQQUw_z8vox0s9';
const OWNER_EMAIL = 'nazarivanyuk562@gmail.com';
let ADMINS = []; 
let MODERATORS = [];
let sbClient, cart = [];

window.onload = () => {
    sbClient = supabase.createClient(SB_URL, SB_KEY);
    checkUser();
};

async function checkUser() {
    const { data: { user } } = await sbClient.auth.getUser();
    const adminBtn = document.getElementById('admin-panel-btn');
    const ownerTools = document.getElementById('owner-tools');
    const adminTools = document.getElementById('admin-tools');

    if (user) {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('history-btn').style.display = 'block';
        document.getElementById('logout-btn').style.display = 'block';

        if (user.email === OWNER_EMAIL) {
            adminBtn.style.display = 'block';
            ownerTools.style.display = 'block';
            adminTools.style.display = 'block';
        } else if (ADMINS.includes(user.email)) {
            adminBtn.style.display = 'block';
            ownerTools.style.display = 'none';
            adminTools.style.display = 'block';
        } else if (MODERATORS.includes(user.email)) {
            adminBtn.style.display = 'none'; 
        }
    }
}

function assignRole(role) {
    const email = document.getElementById('role-email').value.trim();
    if (!email) return;
    if (role === 'admin') ADMINS.push(email);
    else MODERATORS.push(email);
    alert(`Роль ${role} надана для ${email}`);
    checkUser();
}

function openDetails(btn) {
    const d = btn.closest('.game-card').dataset;
    const modalData = document.getElementById('modal-data');
    modalData.innerHTML = `
        <div class="modal-img-side"><img src="${d.img}" style="width:100%"></div>
        <div class="modal-info-side">
            <span class="close-btn-large" onclick="closeModal()">&times;</span>
            <h2>${d.title}</h2>
            <div class="modal-price">${d.price} грн</div>
            <p>${d.desc}</p>
            <button class="modal-buy-btn" onclick="addToCartDirect('${d.title}', ${d.price}, '${d.img}')">Додати у кошик</button>
        </div>`;
    document.getElementById('details-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function addToCart(btn) {
    const d = btn.closest('.game-card').dataset;
    cart.push({ title: d.title, price: parseInt(d.price), img: d.img });
    updateUI();
}

function addToCartDirect(title, price, img) {
    cart.push({ title, price, img });
    updateUI();
    closeModal();
}

function updateUI() {
    const items = document.getElementById('cart-items');
    let total = 0;
    document.getElementById('cart-count').innerText = cart.length;
    items.innerHTML = cart.map((item, i) => {
        total += item.price;
        return `<div class="cart-item">
            <img src="${item.img}" width="50">
            <span>${item.title} - ${item.price} грн</span>
            <button onclick="removeFromCart(${i})">✕</button>
        </div>`;
    }).join('');
    document.getElementById('cart-total').innerText = total;
}

function removeFromCart(i) {
    cart.splice(i, 1);
    updateUI();
}

async function sendSupportMessage() {
    const i = document.getElementById('user-msg');
    const chat = document.getElementById('chat-messages');
    if (!i.value) return;
    chat.innerHTML += `<div style="text-align:right;"><span style="background:gold; padding:5px; border-radius:5px;">${i.value}</span></div>`;
    i.value = '';
    chat.scrollTop = chat.scrollHeight;
}

function toggleAdminPanel() {
    document.getElementById('admin-modal').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
}
function toggleAuthModal() {
    document.getElementById('auth-modal').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
}
function toggleCart() {
    document.getElementById('cart-sidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
}
function closeModal() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    document.getElementById('overlay').classList.remove('active');
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
    if (error) alert(error.message); else alert("Готово!");
}
async function signOut() {
    await sbClient.auth.signOut();
    location.reload();
}

document.getElementById('overlay').onclick = closeModal;
