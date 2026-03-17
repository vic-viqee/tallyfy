let currentScreen = 'sales';
let currentBill = [];
let todayCashTotal = 0;
let todayMpesaTotal = 0;
let todayNewDebtTotal = 0;

function showScreen(screenName) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  
  const screen = document.getElementById(`${screenName}-screen`);
  if (screen) {
    screen.classList.add('active');
  }
  
  document.querySelectorAll(`.nav-btn[data-screen="${screenName}"]`).forEach(b => b.classList.add('active'));
  currentScreen = screenName;
}

function showToast(message, duration = 2000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

function formatCurrency(amount) {
  return `KSh ${amount.toLocaleString()}`;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
}

function formatDateShort(dateStr) {
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

function showModal(html) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  content.innerHTML = html;
  overlay.classList.add('active');
}

function hideModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('active');
}

function updateBillDisplay() {
  const totalEl = document.getElementById('bill-total');
  const itemsEl = document.getElementById('bill-items');
  
  const total = currentBill.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  totalEl.textContent = formatCurrency(total);
  
  const itemSummary = currentBill.map(item => `${item.emoji} ${item.name} x${item.quantity}`).join(', ');
  itemsEl.textContent = itemSummary || 'Tap items to add';
}

async function loadTodayTotals() {
  const today = new Date().toISOString().split('T')[0];
  const summary = await dbApi.getDailySummaryByDate(today);
  
  if (summary) {
    todayCashTotal = summary.cashTotal || 0;
    todayMpesaTotal = summary.mpesaTotal || 0;
    todayNewDebtTotal = summary.newDebtTotal || 0;
    
    const cashEl = document.getElementById('today-cash');
    const mpesaEl = document.getElementById('today-mpesa');
    const debtEl = document.getElementById('today-debt');
    if (cashEl) cashEl.textContent = todayCashTotal.toLocaleString();
    if (mpesaEl) mpesaEl.textContent = todayMpesaTotal.toLocaleString();
    if (debtEl) debtEl.textContent = todayNewDebtTotal.toLocaleString();
  }
}

async function initApp() {
  await dbApi.init();
  
  const dateEl = document.getElementById('current-date');
  dateEl.textContent = formatDate(new Date());
  
  await loadTodayTotals();
  
  setupNavigation();
  setupBackButtons();
  
  if (typeof initSales === 'function') initSales();
  if (typeof initStock === 'function') initStock();
  if (typeof initDebts === 'function') initDebts();
  if (typeof initHistory === 'function') initHistory();
  if (typeof initBackup === 'function') initBackup();
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }
}

function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const screen = btn.dataset.screen;
      showScreen(screen);
    });
  });
}

function setupBackButtons() {
  document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const screen = btn.dataset.screen;
      showScreen(screen);
    });
  });
}

document.addEventListener('DOMContentLoaded', initApp);