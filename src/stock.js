async function loadStock() {
  const products = await dbApi.getAllProducts();
  renderStockList(products);
}

function renderStockList(products) {
  const list = document.getElementById('stock-list');
  
  if (products.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="material-icons">inventory_2</span>
        <p>No products yet</p>
      </div>
    `;
    return;
  }

  list.innerHTML = products.map(p => `
    <div class="list-item" data-id="${p.id}">
      <div class="info">
        <div class="name">${p.emoji} ${p.name}</div>
        <div class="detail">${formatCurrency(p.price)} • Stock: ${p.stock}</div>
      </div>
      <div class="stock-controls">
        <button class="btn btn-sm btn-surface" onclick="event.stopPropagation(); showAddStockModal(${p.id})">+Stock</button>
        <button class="btn btn-sm btn-surface" onclick="event.stopPropagation(); showEditPriceModal(${p.id})">Edit</button>
        <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); toggleProductActive(${p.id}, ${!p.active})">
          ${p.active ? 'Disable' : 'Enable'}
        </button>
      </div>
    </div>
  `).join('');
}

function showAddStockModal(productId) {
  showModal(`
    <h2>Add Stock</h2>
    <div class="form-group">
      <label>Units to add</label>
      <input type="number" id="add-stock-qty" value="1" min="1" inputmode="numeric">
    </div>
    <div class="modal-actions">
      <button class="btn btn-surface" onclick="hideModal()">Cancel</button>
      <button class="btn btn-primary" onclick="addStock(${productId})">Add</button>
    </div>
  `);
}

async function addStock(productId) {
  const qty = parseInt(document.getElementById('add-stock-qty').value) || 0;
  if (qty <= 0) {
    showToast('Enter a valid quantity');
    return;
  }

  const products = await dbApi.getAllProducts();
  const product = products.find(p => p.id === productId);
  if (product) {
    await dbApi.updateProduct(productId, { stock: product.stock + qty });
    showToast(`Added ${qty} units`);
    hideModal();
    loadStock();
  }
}

function showEditPriceModal(productId) {
  dbApi.getAllProducts().then(products => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    showModal(`
      <h2>Edit Price</h2>
      <div class="form-group">
        <label>Product</label>
        <input type="text" value="${product.emoji} ${product.name}" readonly>
      </div>
      <div class="form-group">
        <label>New Price (KSh)</label>
        <input type="number" id="edit-price-value" value="${product.price}" inputmode="numeric">
      </div>
      <div class="modal-actions">
        <button class="btn btn-surface" onclick="hideModal()">Cancel</button>
        <button class="btn btn-primary" onclick="updatePrice(${productId})">Save</button>
      </div>
    `);
  });
}

let selectedEmoji = '🧂';

function showAddProductModal() {
  const emojis = ['🧂', '🌾', '🧼', '🛢️', '🥛', '🍚', '🍫', '🍪', '🧁', '🥜', '🧋', '☕', '🍞', '🥚', '🧈', '🧊', '🥩', '🍗', '🐟', '🥔', '🥕', '🧅', '🍅', '🥬'];
  
  showModal(`
    <h2>Add New Product</h2>
    <div class="form-group">
      <label>Emoji</label>
      <div class="emoji-picker" id="emoji-picker">
        ${emojis.map(e => `<div class="emoji-option ${e === '🧂' ? 'selected' : ''}" data-emoji="${e}">${e}</div>`).join('')}
      </div>
    </div>
    <div class="form-group">
      <label>Product Name</label>
      <input type="text" id="new-product-name" placeholder="e.g., Sugar">
    </div>
    <div class="form-group">
      <label>Price (KSh)</label>
      <input type="number" id="new-product-price" placeholder="100" inputmode="numeric">
    </div>
    <div class="form-group">
      <label>Starting Stock</label>
      <input type="number" id="new-product-stock" placeholder="20" value="10" inputmode="numeric">
    </div>
    <div class="modal-actions">
      <button class="btn btn-surface" onclick="hideModal()">Cancel</button>
      <button class="btn btn-primary" onclick="addNewProduct()">Add Product</button>
    </div>
  `);

  selectedEmoji = '🧂';
  document.querySelectorAll('.emoji-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.emoji-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedEmoji = opt.dataset.emoji;
    });
  });
}

async function addNewProduct() {
  const name = document.getElementById('new-product-name').value.trim();
  const price = parseInt(document.getElementById('new-product-price').value) || 0;
  const stock = parseInt(document.getElementById('new-product-stock').value) || 0;
  
  if (!name) {
    showToast('Enter product name');
    return;
  }
  if (price <= 0) {
    showToast('Enter a valid price');
    return;
  }

  await dbApi.addProduct({
    name,
    price,
    stock,
    emoji: selectedEmoji,
    active: true
  });

  showToast('Product added');
  hideModal();
  loadStock();
}

function initStock() {
  loadStock();
  
  document.getElementById('add-product-btn').addEventListener('click', showAddProductModal);
}