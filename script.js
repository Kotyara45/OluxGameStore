let cart = [];
const overlay = document.getElementById('overlay');

function openDetails(btn) {
    const d = btn.closest('.game-card').dataset;
    const modal = document.getElementById('details-modal');
    
    document.getElementById('modal-data').innerHTML = `
        <div class="modal-img-side">
            <img src="${d.img}" alt="${d.title}">
        </div>
        <div class="modal-info-side">
            <h2>${d.title}</h2>
            <div class="modal-price">${d.price} грн</div>
            <p style="color: #666; line-height: 1.6;">${d.desc}</p>
            <ul class="modal-specs">
                <li>Видавець: ${d.author}</li>
                <li>Дата релізу: ${d.year}</li>
                <li>Системні вимоги: ${d.specs}</li>
                <li>Ліцензійна активація</li>
            </ul>
            <button class="modal-buy-btn" onclick="addToCartDirect('${d.title}', ${d.price}, '${d.img}')">
                Додати до кошика
            </button>
        </div>
    `;
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
    addToCartDirect(d.title, d.price, d.img);
}

function updateUI() {
    document.getElementById('cart-count').innerText = cart.length;
    const list = document.getElementById('cart-items');
    let total = 0;
    
    list.innerHTML = cart.map((item, i) => {
        total += item.price;
        return `
            <div class="cart-item">
                <img src="${item.img}">
                <div>
                    <div style="font-weight:bold;">${item.title}</div>
                    <div style="color:var(--gold); font-weight:bold;">${item.price} грн</div>
                </div>
                <span style="position:absolute; right:15px; cursor:pointer;" onclick="removeFromCart(${i})">✕</span>
            </div>`;
    }).join('');
    
    document.getElementById('cart-total').innerText = total;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateUI();
}

function closeModal() { 
    document.getElementById('details-modal').classList.remove('active'); 
    if (!document.getElementById('cart-sidebar').classList.contains('active')) {
        overlay.classList.remove('active');
    }
}

function toggleCart() { 
    const sidebar = document.getElementById('cart-sidebar');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active', sidebar.classList.contains('active'));
}

function clearCart() { 
    if (cart.length === 0) return;
    alert("Замовлення прийнято! Менеджер зв'яжеться з вами."); 
    cart = []; 
    updateUI(); 
    toggleCart(); 
}

overlay.onclick = () => {
    closeModal();
    document.getElementById('cart-sidebar').classList.remove('active');
    overlay.classList.remove('active');
};

document.getElementById('cart-btn').onclick = toggleCart;

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
