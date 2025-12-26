const games = [
    { id: 1, title: "GTA V", price: 499, genre: "Action", author: "Rockstar", year: 2013, specs: "i5, 8GB RAM", img: "gta5.jpg" },
    { id: 2, title: "RDR 2", price: 999, genre: "RPG", author: "Rockstar", year: 2018, specs: "i5-2500K, 8GB RAM", img: "rdr2.jpg" },
    { id: 3, title: "Cyberpunk 2077", price: 1299, genre: "RPG", author: "CD Projekt Red", year: 2020, specs: "i7, 12GB RAM", img: "cyberpunk2077.jpg" },
    { id: 4, title: "Elden Ring", price: 1399, genre: "RPG", author: "FromSoftware", year: 2022, specs: "i5-8400, 12GB RAM", img: "eldenring.jpg" },
    { id: 5, title: "Witcher 3", price: 299, genre: "RPG", author: "CD Projekt Red", year: 2015, specs: "i7-3770, 8GB RAM", img: "witcher3.jpg" },
    { id: 6, title: "Baldur’s Gate 3", price: 1999, genre: "RPG", author: "Larian Studios", year: 2023, specs: "i7-8700K, 16GB RAM", img: "baldursgate3.jpg" },
    { id: 7, title: "Hogwarts Legacy", price: 1599, genre: "RPG", author: "Avalanche", year: 2023, specs: "i5-8400, 16GB RAM", img: "hogwarts.jpg" },
    { id: 8, title: "Starfield", price: 1699, genre: "RPG", author: "Bethesda", year: 2023, specs: "i5-10600K, 16GB RAM", img: "starfield.jpg" },
    { id: 9, title: "Forza Horizon 5", price: 1199, genre: "Simulator", author: "Playground Games", year: 2021, specs: "i5-4460, 8GB RAM", img: "forzahorizon5.jpg" },
    { id: 10, title: "AC Mirage", price: 1499, genre: "Action", author: "Ubisoft", year: 2023, specs: "i7-8700K, 16GB RAM", img: "acmirage.jpg" },
    { id: 11, title: "AC Valhalla", price: 999, genre: "Action", author: "Ubisoft", year: 2020, specs: "i7-6700, 16GB RAM", img: "acvalhalla.jpg" },
    { id: 12, title: "God of War", price: 899, genre: "Action", author: "Santa Monica", year: 2022, specs: "i5-2500K, 8GB RAM", img: "gow2018.jpg" },
    { id: 13, title: "GoW Ragnarok", price: 1499, genre: "Action", author: "Santa Monica", year: 2022, specs: "PS5/PS4", img: "gowragnarok.jpg" },
    { id: 14, title: "Spider-Man Remastered", price: 799, genre: "Action", author: "Insomniac", year: 2022, specs: "i7-3770, 16GB RAM", img: "spidermanremastered.jpg" },
    { id: 15, title: "Miles Morales", price: 699, genre: "Action", author: "Insomniac", year: 2022, specs: "i5-4670, 8GB RAM", img: "spidermanmiles.jpg" },
    { id: 16, title: "Horizon Zero Dawn", price: 499, genre: "Action", author: "Guerrilla", year: 2020, specs: "i5-2500K, 8GB RAM", img: "horizonzerodawn.jpg" },
    { id: 17, title: "Horizon West", price: 1399, genre: "Action", author: "Guerrilla", year: 2024, specs: "i5-8400, 16GB RAM", img: "horizonforbiddenwest.jpg" },
    { id: 18, title: "RE 4 Remake", price: 1499, genre: "Action", author: "Capcom", year: 2023, specs: "i5-7500, 8GB RAM", img: "re4remake.jpg" },
    { id: 19, title: "RE 2 Remake", price: 799, genre: "Action", author: "Capcom", year: 2019, specs: "i5-4460, 8GB RAM", img: "re2remake.jpg" },
    { id: 20, title: "TLOU Part I", price: 1199, genre: "Action", author: "Naughty Dog", year: 2023, specs: "i7-4770K, 16GB RAM", img: "tlou1.jpg" },
    { id: 21, title: "Sekiro", price: 899, genre: "Action", author: "FromSoftware", year: 2019, specs: "i3-2100, 4GB RAM", img: "sekiro.jpg" },
    { id: 22, title: "Dark Souls III", price: 699, genre: "RPG", author: "FromSoftware", year: 2016, specs: "i3-2100, 8GB RAM", img: "darksouls3.jpg" },
    { id: 23, title: "Battlefield 2042", price: 1099, genre: "Shooter", author: "DICE", year: 2021, specs: "i5-6600K, 8GB RAM", img: "bf2042.jpg" },
    { id: 24, title: "COD MW III", price: 2199, genre: "Shooter", author: "Sledgehammer", year: 2023, specs: "i5-6600, 12GB RAM", img: "codmw3.jpg" },
    { id: 25, title: "Euro Truck Sim 2", price: 199, genre: "Simulator", author: "SCS Software", year: 2012, specs: "Dual Core 2.4 GHz", img: "ets2.jpg" }
];

let cart = [];

function init() {
    renderGames('all');
    setupFilters();
    document.getElementById('cart-btn').onclick = toggleCart;
}

function renderGames(genre) {
    const grid = document.getElementById('catalog-grid');
    grid.innerHTML = '';
    const filtered = genre === 'all' ? games : games.filter(g => g.genre === genre);

    filtered.forEach(game => {
        grid.innerHTML += `
            <div class="game-card">
                <div class="card-img" style="background-image: url('${game.img}')"></div>
                <h3>${game.title}</h3>
                <p class="price">${game.price} грн</p>
                <div class="btn-group">
                    <button class="info-btn" onclick="openDetails(${game.id})">Детальніше</button>
                    <button class="buy-btn" onclick="addToCart(${game.id})">Купити</button>
                </div>
            </div>`;
    });
}

function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = (e) => {
            document.querySelector('.filter-btn.active').classList.remove('active');
            e.target.classList.add('active');
            renderGames(e.target.dataset.genre);
        };
    });
}

function openDetails(id) {
    const game = games.find(g => g.id === id);
    const modal = document.getElementById('details-modal');
    document.getElementById('modal-data').innerHTML = `
        <img src="${game.img}" class="modal-img">
        <div class="modal-text">
            <h2>${game.title}</h2>
            <p class="price" style="font-size:2em">${game.price} грн</p>
            <p><strong>Жанр:</strong> ${game.genre}</p>
            <p><strong>Автор:</strong> ${game.author}</p>
            <p><strong>Рік:</strong> ${game.year}</p>
            <p><strong>Мін. хар.:</strong> ${game.specs}</p>
            <button class="buy-btn" style="width:100%" onclick="addToCart(${game.id})">Додати до кошика</button>
        </div>`;
    modal.classList.add('active');
}

function closeModal() { document.getElementById('details-modal').classList.remove('active'); }

function toggleCart() { document.getElementById('cart-sidebar').classList.toggle('active'); }

function addToCart(id) {
    const game = games.find(g => g.id === id);
    cart.push(game);
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



window.onload = init;
