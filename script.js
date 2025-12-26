let cart = [];

function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = (e) => {
            document.querySelector('.filter-btn.active').classList.remove('active');
            e.target.classList.add('active');
            const genre = e.target.dataset.genre;
            document.querySelectorAll('.game-card').forEach(card => {
                card.style.display = (genre === 'all' || card.dataset.genre === genre) ? 'block' : 'none';
            });
        };
    });
}

function openDetails(btn) {
    const d = btn.closest('.game-card').dataset;
    const modal = document.getElementById('details-modal');

    document.getElementById('modal-data').innerHTML = `
        <div class="modal-img-box">
            <img src="${d.img}" alt="${d.title}">
        </div>
        <div class="modal-info-box">
            <h2>${d.title}</h2>
            <p class="price">${d.price} грн</p>
            <p class="desc">${d.desc}</p>
            <ul class="specs-list">
                <li>Цифрова копія від ${d.author}</li>
                <li>Дата випуску: ${d.year}</li>
                <li>Вимоги: ${d.specs}</li>
                <li>Гарантія якості OluxGameStore</li>
                <li>Сертифікат від Міністерства Магії</li>
            </ul>
            <button class="add-modal-btn" onclick="addToCartDirect('${d.title}', ${d.price}, '${d.img}')">
                Додати до кошика
            </button>
        </div>
    `;
    modal.classList.add('active');
}

function closeModal() { document.getElementById('details-modal').classList.remove('active'); }

function toggleCart() { document.getElementById('cart-sidebar').classList.toggle('active'); }

function addToCart(btn) {
    const d = btn.closest('.game-card').dataset;
    addToCartDirect(d.title, d.price, d.img);
}

function addToCartDirect(title, price, img) {
    cart.push({ title, price: parseInt(price), img });
    updateCartUI();
    if (document.getElementById('details-modal').classList.contains('active')) closeModal();
}

function updateCartUI() {
    const list = document.getElementById('cart-items');
    let total = 0;
    list.innerHTML = '';
    
    cart.forEach((item, index) => {
        total += item.price;
        list.innerHTML += `
            <div class="cart-item">
                <img src="${item.img}">
                <div class="cart-item-info">
                    <h4>${item.title}</h4>
                    <p>${item.price} грн</p>
                </div>
                <button class="remove-btn" onclick="removeFromCart(${index})">✕</button>
            </div>`;
    });

    document.getElementById('cart-total').innerText = total;
    document.getElementById('cart-count').innerText = cart.length;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

window.onclick = (e) => {
    if (e.target.id === 'details-modal') closeModal();
}

window.onload = () => {
    setupFilters();
    document.getElementById('cart-btn').onclick = toggleCart;
};
