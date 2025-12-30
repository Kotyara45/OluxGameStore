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
        setTimeout(() => {
            banner.classList.add('hidden');
        }, 5000);
    }
};

function openDetails(btn) {
    const d = btn.closest('.game-card').dataset;
    const modal = document.getElementById('details-modal');
    const modalData = document.getElementById('modal-data');
    
    modalData.innerHTML = `
        <div class="modal-img-side">
            <img src="${d.img}" alt="${d.title}">
        </div>
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
            <button class="modal-buy-btn" onclick="addToCartDirect('${d.title}', ${d.price}, '${d.img}')">
                Додати у кошик
            </button>
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
    cart.push({ 
        title: d.title, 
        price: parseInt(d.price) || 0, 
        img: d.img 
    });
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
        return `
            <div class="cart-item">
                <img src="${item.img}" alt="${item.title}">
                <div style="flex: 1;">
                    <div style="font-weight: bold; font-size: 14px; color: black;">${item.title}</div>
                    <div style="color: #d4af37; font-weight: bold;">${item.price} грн</div>
                </div>
                <span style="cursor: pointer; color: #ff4444; font-weight: bold;" onclick="removeFromCart(${i})">✕</span>
            </div>`;
    }).join('');
    
    cartTotal.innerText = total;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateUI();
}

function checkout() {
    if (cart.length === 0) {
        alert("Ваш кошик порожній!");
        return;
    }
    window.location.href = 'https://donatello.to/OluxGameStore';
}

function closeModal() {
    document.getElementById('details-modal').classList.remove('active');
    document.getElementById('auth-modal').style.display = 'none';
    if (!document.getElementById('cart-sidebar').classList.contains('active')) {
        overlay.classList.remove('active');
    }
}

function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active', sidebar.classList.contains('active'));
}

overlay.onclick = () => {
    document.getElementById('details-modal').classList.remove('active');
    document.getElementById('cart-sidebar').classList.remove('active');
    document.getElementById('auth-modal').style.display = 'none';
    overlay.classList.remove('active');
};

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelector('.filter-btn.active').classList.remove('active');
        btn.classList.add('active');
        
        const genre = btn.dataset.genre;
        const cards = document.querySelectorAll('.game-card');
        
        cards.forEach(card => {
            if (genre === 'all' || card.dataset.genre === genre) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    };
});

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
    const isVisible = m.style.display === 'block';
    m.style.display = isVisible ? 'none' : 'block';
    overlay.classList.toggle('active', !isVisible);
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

document.getElementById('cart-btn').onclick = toggleCart;
