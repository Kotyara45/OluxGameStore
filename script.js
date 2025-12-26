let cart = [];

function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = (e) => {
            document.querySelector('.filter-btn.active').classList.remove('active');
            e.target.classList.add('active');
            const genre = e.target.dataset.genre;
            
            document.querySelectorAll('.game-card').forEach(card => {
                if (genre === 'all' || card.dataset.genre === genre) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        };
    });
}

function openDetails(btn) {
    const card = btn.closest('.game-card');
    const modal = document.getElementById('details-modal');
    const data = card.dataset;

    document.getElementById('modal-data').innerHTML = `
        <img src="${data.img}" class="modal-img">
        <div class="modal-text">
            <h2>${data.title}</h2>
            <p class="price" style="font-size:2em">${data.price} грн</p>
            <p><strong>Жанр:</strong> ${data.genre}</p>
            <p><strong>Автор:</strong> ${data.author}</p>
            <p><strong>Рік:</strong> ${data.year}</p>
            <p><strong>Мін. хар.:</strong> ${data.specs}</p>
            <button class="buy-btn" style="width:100%" onclick="addToCartFromModal('${data.title}', ${data.price}, '${data.img}')">Додати до кошика</button>
        </div>`;
    modal.classList.add('active');
}

function closeModal() { document.getElementById('details-modal').classList.remove('active'); }
function toggleCart() { document.getElementById('cart-sidebar').classList.toggle('active'); }

function addToCart(btn) {
    const card = btn.closest('.game-card');
    const data = card.dataset;
    cart.push({ title: data.title, price: parseInt(data.price), img: data.img });
    updateCartUI();
}

function addToCartFromModal(title, price, img) {
    cart.push({ title, price, img });
    updateCartUI();
}

function updateCartUI() {
    const list = document.getElementById('cart-items');
    let total = 0;
    list.innerHTML = '';
    cart.forEach((item, index) => {
        total += item.price;
        list.innerHTML += `
            <div class="cart-item">
                <img src="${item.img}" width="40" height="40" style="object-fit:cover">
                <span>${item.title}</span>
                <b>${item.price} грн</b>
                <button onclick="removeFromCart(${index})">✕</button>
            </div>`;
    });
    document.getElementById('cart-total').innerText = total;
    document.getElementById('cart-count').innerText = cart.length;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

window.onload = () => {
    setupFilters();
    document.getElementById('cart-btn').onclick = toggleCart;
};
