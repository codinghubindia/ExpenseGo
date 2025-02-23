# ExpenseGo

ExpenseGo is a modern, offline-first expense tracking application built with React and Vite. It helps users manage their personal finances with features like transaction tracking, multi-account management, and data backup/restore capabilities.

## Features

- 💰 **Transaction Management**
  - Track income, expenses, and transfers
  - Categorize transactions
  - Multiple payment methods support
  - Advanced filtering and search

- 🏦 **Account Management**
  - Multiple account support
  - Account balance tracking
  - Different account types (Cash, Bank, etc.)
  - Custom account colors and icons

- 📊 **Categories**
  - Predefined expense/income categories
  - Custom category creation
  - Category-wise transaction tracking

- 💾 **Data Management**
  - Offline-first architecture using IndexedDB
  - Backup and restore functionality
  - Encrypted backup support
  - Data export capabilities

- 🌐 **Regional Support**
  - Multi-currency support
  - Localized number formatting
  - Customizable date formats

- 🎨 **User Interface**
  - Modern Material UI design
  - Responsive layout
  - Dark/Light theme support
  - Mobile-friendly interface

## Tech Stack

- **Frontend Framework**: React 18
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **Database**: IndexedDB (SQL.js)
- **State Management**: React Context
- **Date Handling**: Day.js
- **Data Encryption**: CryptoJS
- **File Handling**: Native File API

## Project Structure

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh
