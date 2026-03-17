const DB_NAME = 'tallyfy-db';
const DB_VERSION = 1;

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains('products')) {
        const productStore = database.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
        productStore.createIndex('by_name', 'name', { unique: true });
      }

      if (!database.objectStoreNames.contains('customers')) {
        const customerStore = database.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
        customerStore.createIndex('by_name', 'name', { unique: true });
        customerStore.createIndex('by_frequency', 'totalTransactions', {});
      }

      if (!database.objectStoreNames.contains('debt_items')) {
        const debtStore = database.createObjectStore('debt_items', { keyPath: 'id', autoIncrement: true });
        debtStore.createIndex('by_customer', 'customerId', {});
        debtStore.createIndex('by_settled', 'settled', {});
        debtStore.createIndex('by_date', 'date', {});
      }

      if (!database.objectStoreNames.contains('sales')) {
        const salesStore = database.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
        salesStore.createIndex('by_date', 'date', {});
      }

      if (!database.objectStoreNames.contains('daily_summaries')) {
        const summaryStore = database.createObjectStore('daily_summaries', { keyPath: 'id', autoIncrement: true });
        summaryStore.createIndex('by_date', 'date', { unique: true });
      }
    };
  });
}

function getStore(storeName, mode = 'readonly') {
  return db.transaction(storeName, mode).objectStore(storeName);
}

const dbApi = {
  async init() {
    await openDB();
    await this.seedDataIfNeeded();
  },

  async seedDataIfNeeded() {
    // Starting empty as requested
    return;
  },

  // Products
  async getAllProducts() {
    return new Promise((resolve, reject) => {
      const store = getStore('products');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getActiveProducts() {
    const products = await this.getAllProducts();
    return products.filter(p => p.active);
  },

  async addProduct(product) {
    return new Promise((resolve, reject) => {
      const store = getStore('products', 'readwrite');
      const request = store.add(product);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async updateProduct(id, updates) {
    return new Promise((resolve, reject) => {
      const store = getStore('products', 'readwrite');
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const product = { ...getReq.result, ...updates };
        const putReq = store.put(product);
        putReq.onsuccess = () => resolve(product);
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  },

  async deleteProduct(id) {
    return new Promise((resolve, reject) => {
      const store = getStore('products', 'readwrite');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // Customers
  async getAllCustomers() {
    return new Promise((resolve, reject) => {
      const store = getStore('customers');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getCustomersByFrequency() {
    return new Promise((resolve, reject) => {
      const store = getStore('customers');
      const index = store.index('by_frequency');
      const request = index.openCursor(null, 'prev');
      const customers = [];
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          customers.push(cursor.value);
          cursor.continue();
        } else {
          resolve(customers);
        }
      };
      request.onerror = () => reject(request.error);
    });
  },

  async addCustomer(customer) {
    return new Promise((resolve, reject) => {
      const store = getStore('customers', 'readwrite');
      const request = store.add({ ...customer, totalTransactions: customer.totalTransactions || 0 });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async updateCustomer(id, updates) {
    return new Promise((resolve, reject) => {
      const store = getStore('customers', 'readwrite');
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const customer = { ...getReq.result, ...updates };
        const putReq = store.put(customer);
        putReq.onsuccess = () => resolve(customer);
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  },

  async incrementCustomerTransactions(id) {
    const customer = await new Promise((resolve, reject) => {
      const store = getStore('customers');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (customer) {
      return this.updateCustomer(id, { totalTransactions: (customer.totalTransactions || 0) + 1 });
    }
  },

  // Debt Items
  async getDebtItemsByCustomer(customerId) {
    return new Promise((resolve, reject) => {
      const store = getStore('debt_items');
      const index = store.index('by_customer');
      const request = index.getAll(customerId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getUnsettledDebtItemsByCustomer(customerId) {
    const items = await this.getDebtItemsByCustomer(customerId);
    return items.filter(item => !item.settled);
  },

  async addDebtItem(debtItem) {
    return new Promise((resolve, reject) => {
      const store = getStore('debt_items', 'readwrite');
      const request = store.add({
        ...debtItem,
        settled: false,
        settledDate: null
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async settleDebtItem(id) {
    return new Promise((resolve, reject) => {
      const store = getStore('debt_items', 'readwrite');
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const item = {
          ...getReq.result,
          settled: true,
          settledDate: new Date().toISOString()
        };
        const putReq = store.put(item);
        putReq.onsuccess = () => resolve(item);
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  },

  async settleAllDebtItems(customerId) {
    const items = await this.getUnsettledDebtItemsByCustomer(customerId);
    for (const item of items) {
      await this.settleDebtItem(item.id);
    }
  },

  async getCustomerTotalDebt(customerId) {
    const items = await this.getUnsettledDebtItemsByCustomer(customerId);
    return items.reduce((sum, item) => sum + item.totalAmount, 0);
  },

  // Sales
  async addSale(sale) {
    return new Promise((resolve, reject) => {
      const store = getStore('sales', 'readwrite');
      const request = store.add({
        ...sale,
        date: sale.date || new Date().toISOString()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getSalesByDate(date) {
    return new Promise((resolve, reject) => {
      const store = getStore('sales');
      const index = store.index('by_date');
      const request = index.getAll(IDBKeyRange.bound(date, date + '\uffff'));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // Daily Summaries
  async addDailySummary(summary) {
    return new Promise((resolve, reject) => {
      const store = getStore('daily_summaries', 'readwrite');
      const request = store.add({
        ...summary,
        date: summary.date || new Date().toISOString().split('T')[0]
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getDailySummaryByDate(date) {
    return new Promise((resolve, reject) => {
      const store = getStore('daily_summaries');
      const index = store.index('by_date');
      const request = index.get(date);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getAllDailySummaries() {
    return new Promise((resolve, reject) => {
      const store = getStore('daily_summaries');
      const request = store.getAll();
      request.onsuccess = () => {
        const summaries = request.result.sort((a, b) => b.date.localeCompare(a.date));
        resolve(summaries);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async updateDailySummary(id, updates) {
    return new Promise((resolve, reject) => {
      const store = getStore('daily_summaries', 'readwrite');
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const summary = { ...getReq.result, ...updates };
        const putReq = store.put(summary);
        putReq.onsuccess = () => resolve(summary);
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  },

  // Backup
  async exportAllData() {
    const data = {
      products: await this.getAllProducts(),
      customers: await this.getAllCustomers(),
      debt_items: await new Promise((resolve, reject) => {
        const store = getStore('debt_items');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
      sales: await new Promise((resolve, reject) => {
        const store = getStore('sales');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
      daily_summaries: await new Promise((resolve, reject) => {
        const store = getStore('daily_summaries');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
      exportedAt: new Date().toISOString()
    };
    return data;
  },

  async importAllData(data) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['products', 'customers', 'debt_items', 'sales', 'daily_summaries'], 'readwrite');

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      const productStore = transaction.objectStore('products');
      productStore.clear();
      data.products.forEach(p => productStore.add(p));

      const customerStore = transaction.objectStore('customers');
      customerStore.clear();
      data.customers.forEach(c => customerStore.add(c));

      const debtStore = transaction.objectStore('debt_items');
      debtStore.clear();
      data.debt_items.forEach(d => debtStore.add(d));

      const salesStore = transaction.objectStore('sales');
      salesStore.clear();
      data.sales.forEach(s => salesStore.add(s));

      const summaryStore = transaction.objectStore('daily_summaries');
      summaryStore.clear();
      data.daily_summaries.forEach(s => summaryStore.add(s));
    });
  }
};