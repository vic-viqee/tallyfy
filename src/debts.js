let currentCustomerId = null;

async function loadCustomers() {
  const customers = await dbApi.getCustomersByFrequency();
  renderCustomerList(customers);
}

function renderCustomerList(customers) {
  const list = document.getElementById('customer-list');
  
  if (customers.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="material-icons">people</span>
        <p>No customers found</p>
      </div>
    `;
    return;
  }

  const listHtml = customers.map(async c => {
    const totalDebt = await dbApi.getCustomerTotalDebt(c.id);
    if (totalDebt === 0) return null;

    const items = await dbApi.getDebtItemsByCustomer(c.id);
    const unsettledCount = items.filter(i => !i.settled).length;
    
    return `
      <div class="list-item" onclick="showCustomerDetail(${c.id})">
        <div class="info">
          <div class="name">${c.name}</div>
          <div class="detail">${unsettledCount} items</div>
        </div>
        <div class="amount debt-amount">${formatCurrency(totalDebt)}</div>
      </div>
    `;
  });

  Promise.all(listHtml).then(html => {
    const filteredHtml = html.filter(h => h !== null);
    if (filteredHtml.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="material-icons">check_circle</span>
          <p>No outstanding debts</p>
        </div>
      `;
    } else {
      list.innerHTML = filteredHtml.join('');
    }
  });
}

async function showCustomerDetail(customerId) {
  currentCustomerId = customerId;
  const customers = await dbApi.getAllCustomers();
  const customer = customers.find(c => c.id === customerId);
  
  if (!customer) return;

  document.getElementById('customer-name').textContent = customer.name;
  showScreen('customer-detail');
  
  await loadCustomerDebtItems(customerId);
}

async function loadCustomerDebtItems(customerId) {
  const items = await dbApi.getDebtItemsByCustomer(customerId);
  const unsettledItems = items.filter(i => !i.settled);
  
  const totalDebt = unsettledItems.reduce((sum, item) => sum + item.totalAmount, 0);
  document.getElementById('customer-debt-total').textContent = formatCurrency(totalDebt);
  
  const list = document.getElementById('debt-items-list');
  
  if (unsettledItems.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="material-icons">check_circle</span>
        <p>No outstanding debts</p>
      </div>
    `;
    return;
  }

  list.innerHTML = unsettledItems.map(item => `
    <div class="debt-item">
      <div class="item-info">
        <div class="item-name">${item.productName} x${item.quantity}</div>
        <div class="item-detail">${formatDateShort(item.date)}</div>
      </div>
      <div class="item-amount">${formatCurrency(item.totalAmount)}</div>
      <button class="btn btn-sm btn-primary settle-btn" onclick="settleDebtItem(${item.id})">Settle</button>
    </div>
  `).join('');
}

async function settleDebtItem(itemId) {
  await dbApi.settleDebtItem(itemId);
  showToast('Item settled');
  await loadCustomerDebtItems(currentCustomerId);
  await loadCustomers();
}

async function settleAllDebtItems() {
  if (!currentCustomerId) return;
  
  const items = await dbApi.getUnsettledDebtItemsByCustomer(currentCustomerId);
  if (items.length === 0) {
    showToast('Nothing to settle');
    return;
  }

  showModal(`
    <h2>Settle All</h2>
    <p style="text-align: center; margin-bottom: 16px;">Mark all ${items.length} items as paid?</p>
    <div class="modal-actions">
      <button class="btn btn-surface" onclick="hideModal()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmSettleAll()">Settle All</button>
    </div>
  `);
}

async function confirmSettleAll() {
  await dbApi.settleAllDebtItems(currentCustomerId);
  hideModal();
  showToast('All debts settled');
  await loadCustomerDebtItems(currentCustomerId);
  await loadCustomers();
}

function initDebts() {
  document.getElementById('customer-search').addEventListener('input', async (e) => {
    const query = e.target.value.toLowerCase();
    const customers = await dbApi.getAllCustomers();
    const filtered = customers.filter(c => c.name.toLowerCase().includes(query));
    renderCustomerList(filtered);
  });

  document.getElementById('settle-all-btn').addEventListener('click', settleAllDebtItems);

  const debtsNavBtn = document.querySelector('.nav-btn[data-screen="debts"]');
  if (debtsNavBtn) {
    debtsNavBtn.addEventListener('click', () => {
      loadCustomers();
    });
  }
}