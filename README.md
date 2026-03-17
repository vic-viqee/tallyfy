# Tallyfy 📊

Tallyfy is a lightweight, offline-first retail management web application designed for small shop owners. It provides a simple, "tally-style" interface to track sales, manage inventory, and handle customer debts with ease.

## ✨ Features

- **Point of Sale (POS):** Tap-to-add product grid with real-time bill calculation.
- **Multiple Payment Methods:** Support for Cash, M-Pesa, and Debt transactions.
- **Debt Management:** Track individual customer balances, view transaction history, and settle debts (partially or in full).
- **Inventory Tracking:** Manage product stock levels, update prices, and toggle product visibility.
- **Daily Summaries & History:** Automatically track daily sales totals (Cash, M-Pesa, Debt) and view detailed historical records.
- **Offline First:** Works 100% offline using IndexedDB for data persistence and Service Workers for asset caching.
- **PWA Ready:** Installable on Android, iOS, and Desktop for a native app-like experience.
- **Data Backup & Restore:** Export all your data to a JSON file and restore it whenever needed to prevent data loss.

## 🛠️ Built With

- **Frontend:** Vanilla HTML5, CSS3 (using the 'Outfit' font and Material Icons).
- **Logic:** Vanilla JavaScript (ES6+).
- **Storage:** [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) for robust local data persistence.
- **PWA:** Service Workers and Web App Manifest for offline capabilities and installation.

## 🚀 Getting Started

### Prerequisites

Since Tallyfy is a static web application, you only need a modern web browser to run it. However, to use the Service Worker (for offline support), the files must be served over a local or remote server.

### Running Locally

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/tallyfy.git
    cd tallyfy
    ```

2.  **Serve the files:**
    You can use any local development server. Here are a few common ways:

    - **Using Node.js (npx):**
      ```bash
      npx serve .
      ```
    - **Using Python:**
      ```bash
      python3 -m http.server 8000
      ```
    - **Using VS Code:** Install the "Live Server" extension and click "Go Live".

3.  **Open the app:**
    Navigate to `http://localhost:5000` (or the port provided by your server) in your browser.

## 📱 Installation

To install Tallyfy as an app:
- **On Android (Chrome):** Tap the three-dot menu and select "Install app".
- **On iOS (Safari):** Tap the "Share" button and select "Add to Home Screen".
- **On Desktop (Chrome/Edge):** Click the installation icon in the address bar.

## 🔒 Data & Privacy

Tallyfy respects your privacy. All data entered into the application is stored **locally in your browser's IndexedDB**. No data is ever sent to a server. 

**Note:** Clearing your browser's site data or cache will delete your records. **Regularly use the "Download Backup" feature** in the Settings screen to keep your data safe.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
# tallyfy
