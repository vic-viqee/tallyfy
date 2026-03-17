async function loadHistory() {
  const summaries = await dbApi.getAllDailySummaries();
  renderHistoryList(summaries);
}

function renderHistoryList(summaries) {
  const list = document.getElementById('history-list');
  
  if (summaries.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="material-icons">history</span>
        <p>No history yet</p>
        <p style="font-size: 13px; margin-top: 8px;">Close shop to start tracking</p>
      </div>
    `;
    return;
  }

  list.innerHTML = summaries.map(s => `
    <div class="day-summary-item" onclick="showDayDetail('${s.date}')">
      <div class="date">${formatDate(s.date)}</div>
      <div class="totals">
        <span class="cash">Cash: ${formatCurrency(s.cashTotal || 0)}</span>
        <span class="mpesa">M-Pesa: ${formatCurrency(s.mpesaTotal || 0)}</span>
        <span class="debt">Debt: ${formatCurrency(s.newDebtTotal || 0)}</span>
      </div>
    </div>
  `).join('');
}

async function showDayDetail(date) {
  document.getElementById('day-date').textContent = formatDate(date);
  showScreen('day-detail');
  
  const sales = await dbApi.getSalesByDate(date);
  const list = document.getElementById('day-sales-list');
  
  if (sales.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="material-icons">receipt_long</span>
        <p>No sales recorded</p>
      </div>
    `;
    return;
  }

  const totalCash = sales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.totalAmount, 0);
  const totalMpesa = sales.filter(s => s.paymentMethod === 'mpesa').reduce((sum, s) => sum + s.totalAmount, 0);
  const totalDebt = sales.filter(s => s.paymentMethod === 'debt').reduce((sum, s) => sum + s.totalAmount, 0);

  list.innerHTML = `
    <div class="total-row">
      <span class="label">Day Total</span>
      <span class="amount" style="color: var(--primary);">${formatCurrency(totalCash + totalMpesa + totalDebt)}</span>
    </div>
    <div style="padding: 0 16px; margin-bottom: 16px; font-size: 14px; color: var(--text-secondary);">
      <div>Cash: ${formatCurrency(totalCash)}</div>
      <div>M-Pesa: ${formatCurrency(totalMpesa)}</div>
      <div>Debt: ${formatCurrency(totalDebt)}</div>
    </div>
    ${sales.map(s => `
      <div class="list-item">
        <div class="info">
          <div class="name">${s.items.length} items</div>
          <div class="detail">${s.items.map(i => i.productName).join(', ')}</div>
        </div>
        <div class="amount ${s.paymentMethod === 'debt' ? 'debt-amount' : ''}">${formatCurrency(s.totalAmount)}</div>
      </div>
    `).join('')}
  `;
}

function showCloseShopModal() {
  const today = new Date().toISOString().split('T')[0];
  
  showModal(`
    <h2>Close Shop</h2>
    <div class="close-day-summary">
      <div class="summary-row">
        <span class="label">Cash</span>
        <span class="cash">${formatCurrency(todayCashTotal)}</span>
      </div>
      <div class="summary-row">
        <span class="label">M-Pesa</span>
        <span class="mpesa">${formatCurrency(todayMpesaTotal)}</span>
      </div>
      <div class="summary-row">
        <span class="label">New Debt</span>
        <span class="debt">${formatCurrency(todayNewDebtTotal)}</span>
      </div>
      <div class="summary-row">
        <span class="label">Total</span>
        <span>${formatCurrency(todayCashTotal + todayMpesaTotal + todayNewDebtTotal)}</span>
      </div>
    </div>
    <div class="form-group" style="margin-top: 20px;">
      <label>Notes (optional)</label>
      <textarea id="close-notes" rows="3" placeholder="e.g., Bought new stock, spent 500..."></textarea>
    </div>
    <div class="modal-actions">
      <button class="btn btn-surface" onclick="hideModal()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmCloseShop()">Close Day</button>
    </div>
  `);
}

async function confirmCloseShop() {
  const notes = document.getElementById('close-notes')?.value || '';
  const today = new Date().toISOString().split('T')[0];
  
  const existingSummary = await dbApi.getDailySummaryByDate(today);
  
  if (existingSummary) {
    await dbApi.updateDailySummary(existingSummary.id, {
      cashTotal: todayCashTotal,
      mpesaTotal: todayMpesaTotal,
      newDebtTotal: todayNewDebtTotal,
      notes
    });
  } else {
    await dbApi.addDailySummary({
      date: today,
      cashTotal: todayCashTotal,
      mpesaTotal: todayMpesaTotal,
      newDebtTotal: todayNewDebtTotal,
      notes
    });
  }

  hideModal();
  showToast('Shop summary saved!');
  
  if (typeof loadHistory === 'function') {
    loadHistory();
  }

  // Update UI chips just in case
  const cashEl = document.getElementById('today-cash');
  const mpesaEl = document.getElementById('today-mpesa');
  const debtEl = document.getElementById('today-debt');
  if (cashEl) cashEl.textContent = todayCashTotal.toLocaleString();
  if (mpesaEl) mpesaEl.textContent = todayMpesaTotal.toLocaleString();
  if (debtEl) debtEl.textContent = todayNewDebtTotal.toLocaleString();
}

function initHistory() {
  document.getElementById('close-shop-btn').addEventListener('click', showCloseShopModal);

  const historyNavBtn = document.querySelector('.nav-btn[data-screen="history"]');
  if (historyNavBtn) {
    historyNavBtn.addEventListener('click', () => {
      loadHistory();
    });
  }
}