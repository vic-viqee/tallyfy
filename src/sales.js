let products = [];

async function loadProducts() {
  products = await dbApi.getActiveProducts();
  renderProductGrid();
}

function renderProductGrid() {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = products.map(p => `
    <div class="product-btn ${p.stock === 0 ? 'out-of-stock' : ''}" data-id="${p.id}">
      <span class="emoji">${p.emoji}</span>
      <span class="name">${p.name}</span>
      <span class="price">${formatCurrency(p.price)}</span>
      <span class="stock">${p.stock > 0 ? `Stock: ${p.stock}` : 'Out of Stock'}</span>
    </div>
  `).join('');

  grid.querySelectorAll('.product-btn').forEach(btn => {
    btn.addEventListener('click', () => addToBill(parseInt(btn.dataset.id)));
  });
}

async function addToBill(productId) {
  const product = products.find(p => p.id === productId);
  if (!product || product.stock <= 0) {
    showToast('Out of stock!');
    return;
  }

  const existingItem = currentBill.find(item => item.id === productId);
  if (existingItem) {
    existingItem.quantity++;
  } else {
    currentBill.push({
      id: product.id,
      name: product.name,
      emoji: product.emoji,
      price: product.price,
      quantity: 1
    });
  }

  product.stock--;
  renderProductGrid();
  updateBillDisplay();
}

function clearBill() {
  currentBill.forEach(item => {
    const product = products.find(p => p.id === item.id);
    if (product) {
      product.stock += item.quantity;
    }
  });
  currentBill = [];
  renderProductGrid();
  updateBillDisplay();
}

async function processPayment(method, amountReceived = null, customerId = null) {
  if (currentBill.length === 0) {
    showToast('No items in bill');
    return;
  }

  const total = currentBill.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const now = new Date();
  const date = now.toISOString();
  const today = date.split('T')[0];

  if (method === 'debt' && !customerId) {
    showCustomerSelectForDebt();
    return;
  }

  const sale = {
    date,
    items: currentBill.map(item => ({
      productId: item.id,
      productName: item.name,
      productPrice: item.price,
      quantity: item.quantity
    })),
    totalAmount: total,
    paymentMethod: method,
    customerId
  };

  await dbApi.addSale(sale);

  // Update local and DB totals
  const existingSummary = await dbApi.getDailySummaryByDate(today);
  const updatedSummary = {
    cashTotal: (existingSummary?.cashTotal || 0),
    mpesaTotal: (existingSummary?.mpesaTotal || 0),
    newDebtTotal: (existingSummary?.newDebtTotal || 0),
    date: today
  };

  if (method === 'cash') {
    updatedSummary.cashTotal += total;
  } else if (method === 'mpesa') {
    updatedSummary.mpesaTotal += total;
  } else if (method === 'debt' && customerId) {
    updatedSummary.newDebtTotal += total;
    await dbApi.incrementCustomerTransactions(customerId);

    for (const item of currentBill) {
      await dbApi.addDebtItem({
        customerId,
        productId: item.id,
        productName: item.name,
        productPrice: item.price,
        quantity: item.quantity,
        totalAmount: item.price * item.quantity,
        date
      });
    }
  }

  // Update DB
  if (existingSummary) {
    await dbApi.updateDailySummary(existingSummary.id, updatedSummary);
  } else {
    await dbApi.addDailySummary(updatedSummary);
  }

  // Update local variables for consistency
  todayCashTotal = updatedSummary.cashTotal;
  todayMpesaTotal = updatedSummary.mpesaTotal;
  todayNewDebtTotal = updatedSummary.newDebtTotal;

  // Persist stock changes
  for (const item of currentBill) {
    const product = products.find(p => p.id === item.id);
    await dbApi.updateProduct(item.id, { stock: product.stock });
  }

  currentBill = [];
  await loadProducts();
  
  updateBillDisplay();
  showToast('Sale recorded!');
  
  // Update UI totals
  const cashEl = document.getElementById('today-cash');
  const mpesaEl = document.getElementById('today-mpesa');
  const debtEl = document.getElementById('today-debt');
  if (cashEl) cashEl.textContent = todayCashTotal.toLocaleString();
  if (mpesaEl) mpesaEl.textContent = todayMpesaTotal.toLocaleString();
  if (debtEl) debtEl.textContent = todayNewDebtTotal.toLocaleString();
}

function showCashModal() {
  const total = currentBill.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  showModal(`
    <h2>Cash Payment</h2>
    <div class="form-group">
      <label>Total</label>
      <input type="text" value="${formatCurrency(total)}" readonly>
    </div>
    <div class="modal-actions">
      <button class="btn btn-surface" onclick="hideModal()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmCashPayment()">Confirm</button>
    </div>
  `);
}

function confirmCashPayment() {
  hideModal();
  processPayment('cash');
}

function showMpesaModal() {
  const total = currentBill.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  showModal(`
    <h2>M-PESA Payment</h2>
    <div class="form-group">
      <label>Total Amount</label>
      <input type="text" value="${formatCurrency(total)}" readonly>
    </div>
    <div class="form-group">
      <label>Amount Received</label>
      <input type="number" id="mpesa-amount" value="${total}" inputmode="numeric">
    </div>
    <div class="modal-actions">
      <button class="btn btn-surface" onclick="hideModal()">Cancel</button>
      <button class="btn btn-mpesa" onclick="confirmMpesaPayment()">Confirm</button>
    </div>
  `);
}

function confirmMpesaPayment() {
  const amountReceived = parseInt(document.getElementById('mpesa-amount').value) || 0;
  hideModal();
  processPayment('mpesa', amountReceived);
}

async function showCustomerSelectForDebt() {
  const customers = await dbApi.getCustomersByFrequency();
  showModal(`
    <h2>Select Customer</h2>
    <div class="form-group">
      <input type="text" id="new-customer-name" placeholder="Or add new customer..." onkeypress="if(event.key==='Enter')addNewCustomerAndDebt()">
    </div>
    <div class="list-content" style="max-height: 250px; overflow-y: auto; margin: 0 -24px; padding: 0 24px;">
      ${customers.map(c => `
        <div class="customer-select-item" onclick="selectCustomerForDebt(${c.id})">
          <span class="name">${c.name}</span>
          <span class="transactions">${c.totalTransactions || 0} orders</span>
        </div>
      `).join('')}
    </div>
    <div class="modal-actions">
      <button class="btn btn-surface" onclick="hideModal()">Cancel</button>
      <button class="btn btn-primary" onclick="addNewCustomerAndDebt()">Add New</button>
    </div>
  `);
}

async function selectCustomerForDebt(customerId) {
  hideModal();
  processPayment('debt', null, customerId);
}

async function addNewCustomerAndDebt() {
  const name = document.getElementById('new-customer-name').value.trim();
  if (!name) {
    showToast('Please enter a name');
    return;
  }
  
  const customerId = await dbApi.addCustomer({ name, totalTransactions: 0 });
  hideModal();
  processPayment('debt', null, customerId);
}

function initSales() {
  loadProducts();

  document.getElementById('clear-bill-btn').addEventListener('click', clearBill);
  document.getElementById('pay-cash-btn').addEventListener('click', showCashModal);
  document.getElementById('pay-mpesa-btn').addEventListener('click', showMpesaModal);
  document.getElementById('pay-debt-btn').addEventListener('click', () => {
    if (currentBill.length === 0) {
      showToast('No items in bill');
      return;
    }
    showCustomerSelectForDebt();
  });
}