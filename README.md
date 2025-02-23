# ExpenseGo

ExpenseGo is a modern, offline-first personal finance manager built with React and Vite. It helps users track their expenses, income, and manage multiple accounts with a focus on privacy and data security.

🌐 [Try ExpenseGo Now](https://codinghubindia.github.io/ExpenseGo/)

## Features

### 💰 Financial Management
- Track income, expenses, and transfers between accounts
- Real-time balance updates
- Monthly transaction summaries
- Detailed transaction history
- Support for multiple payment methods
- Multi-currency support
- Automatic balance calculations

### 📊 Analytics & Reports
- Monthly income/expense trends
- Category-wise expense breakdown
- Account balance overview
- Savings rate tracking
- Visual data representation with charts
- Customizable date ranges
- Export reports to PDF/Excel

### 🏦 Account Management
- Multiple account support (Cash, Bank, etc.)
- Real-time balance tracking
- Custom account colors and icons
- Default cash account for quick entries
- Transfer between accounts
- Account-wise transaction history
- Balance reconciliation

### 📁 Category Organization
- Pre-defined expense and income categories
- Custom category creation
- Category-based filtering
- Color coding and icons for categories
- Category-wise analytics
- Budget tracking by category

### 💾 Data Security & Backup
- Offline-first using IndexedDB
- Local data storage
- Automatic data persistence
- No server dependencies
- Encrypted backups
- Easy restore functionality
- Data export/import options

### 🎨 User Experience
- Clean, modern Material UI design
- Responsive layout for all devices
- Intuitive navigation
- Quick access to frequent actions
- PWA support for offline access
- Dark/Light theme support
- Mobile-first design

## Quick Start

### Option 1: Use Web Version
1. Visit [ExpenseGo Web App](https://codinghubindia.github.io/ExpenseGo/)
2. Click "Install" when prompted to install as PWA (optional)
3. Start managing your finances!

### Option 2: Install as PWA
1. Open [ExpenseGo](https://codinghubindia.github.io/ExpenseGo/) in Chrome/Edge
2. Click the install icon (➕) in the address bar
3. Follow the installation prompts
4. Launch ExpenseGo from your desktop/home screen

### Option 3: Local Development

1. Clone the repository:
```bash
git clone https://github.com/codinghubindia/ExpenseGo.git
```

2. Install dependencies:
```bash
cd ExpenseGo
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
npm run preview
```

## Technical Stack

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **UI Framework**: Material-UI (MUI)
- **State Management**: React Context
- **Routing**: React Router DOM

### Data Management
- **Database**: SQL.js with IndexedDB
- **Storage**: IndexedDB, LocalStorage
- **Backup**: Encrypted file-based
- **Data Format**: JSON/SQLite

### Visualization
- **Charts**: Recharts
- **Date Handling**: Day.js
- **PDF Export**: jsPDF
- **Excel Export**: XLSX

### PWA Features
- Offline support
- Install prompts
- Auto-updates
- Cache management
- Service workers

## Data Privacy

ExpenseGo respects your privacy:
- All data stored locally on your device
- No cloud storage or external servers
- Optional encrypted backups
- No tracking or analytics
- No data collection

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Icons from Material Icons
- Charts powered by Recharts
- UI components from MUI
- SQLite implementation by SQL.js

## Support

For support:
- [Open an issue](https://github.com/codinghubindia/ExpenseGo/issues)
- [Contact maintainers](https://github.com/codinghubindia)
- [Visit our website](https://codinghubindia.github.io)

---

Made with ❤️ by [CodingHub India](https://github.com/codinghubindia)
