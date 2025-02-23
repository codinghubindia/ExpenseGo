/* eslint-disable no-unused-vars */
import initSqlJs from 'sql.js';
import { openDB } from 'idb';
import dayjs from 'dayjs';

class DatabaseService {
  static db = null;
  static DATABASE_VERSION = 1;
  static IDB_NAME = 'financialPWA';
  static IDB_STORE_NAME = 'sqliteDB';
  static idb = null;

  // Add DEFAULT_ACCOUNTS constant
  static DEFAULT_ACCOUNTS = [
    {
      name: 'Petty Cash',
      type: 'cash',
      currency: 'INR',
      initialBalance: 0,
      currentBalance: 0,
      colorCode: '#FFD700',
      icon: '💵',
      notes: 'Default cash account for small expenses',
      isDefault: true
    }
  ];

  static DEFAULT_CATEGORIES = [
    // Expense Categories
    {
      name: 'Food & Dining',
      type: 'expense',
      icon: '🍽️',
      colorCode: '#FF6B6B',
      isDefault: true
    },
    {
      name: 'Groceries',
      type: 'expense',
      icon: '🛒',
      colorCode: '#4ECDC4',
      isDefault: true
    },
    {
      name: 'Transportation',
      type: 'expense',
      icon: '🚗',
      colorCode: '#45B7D1',
      isDefault: true
    },
    {
      name: 'Shopping',
      type: 'expense',
      icon: '🛍️',
      colorCode: '#96CEB4',
      isDefault: true
    },
    {
      name: 'Entertainment',
      type: 'expense',
      icon: '🎬',
      colorCode: '#D4A5A5',
      isDefault: true
    },
    {
      name: 'Bills & Utilities',
      type: 'expense',
      icon: '📱',
      colorCode: '#9B59B6',
      isDefault: true
    },
    {
      name: 'Health & Medical',
      type: 'expense',
      icon: '🏥',
      colorCode: '#E74C3C',
      isDefault: true
    },
    {
      name: 'Education',
      type: 'expense',
      icon: '📚',
      colorCode: '#3498DB',
      isDefault: true
    },
    {
      name: 'Travel',
      type: 'expense',
      icon: '✈️',
      colorCode: '#2ECC71',
      isDefault: true
    },
    {
      name: 'Rent/Housing',
      type: 'expense',
      icon: '🏠',
      colorCode: '#E67E22',
      isDefault: true
    },
    {
      name: 'General Expense',
      type: 'expense',
      icon: '📝',
      colorCode: '#95A5A6',
      isDefault: true
    },

    // Income Categories
    {
      name: 'Salary',
      type: 'income',
      icon: '💰',
      colorCode: '#27AE60',
      isDefault: true
    },
    {
      name: 'Business',
      type: 'income',
      icon: '💼',
      colorCode: '#2980B9',
      isDefault: true
    },
    {
      name: 'Investments',
      type: 'income',
      icon: '📈',
      colorCode: '#8E44AD',
      isDefault: true
    },
    {
      name: 'Gifts',
      type: 'income',
      icon: '🎁',
      colorCode: '#E91E63',
      isDefault: true
    },
    {
      name: 'Rental Income',
      type: 'income',
      icon: '🏘️',
      colorCode: '#F39C12',
      isDefault: true
    },
    {
      name: 'Other Income',
      type: 'income',
      icon: '💵',
      colorCode: '#16A085',
      isDefault: true
    }
  ];

  static PRODUCTION_CONFIG = {
    maxRetries: 3,
    retryDelay: 1000,
    batchSize: 100,
    maxTransactions: 1000
  };

  static allowNegativeBalance = false;

  // Add transaction state tracking
  static isTransactionActive = false;

  static handleError(error, context) {
    // Remove development logging
    if (process.env.NODE_ENV === 'production') {
      // In production, you might want to send to error tracking service
      // e.g., Sentry, LogRocket, etc.
    }
    throw error;
  }

  static async initializeDatabase(retryCount = this.PRODUCTION_CONFIG.maxRetries) {
    try {
      if (!this.db) {
        const SQL = await initSqlJs({
          locateFile: file => `https://sql.js.org/dist/${file}`
        });

        this.idb = await openDB(this.IDB_NAME, this.DATABASE_VERSION, {
          upgrade(db) {
            if (!db.objectStoreNames.contains(DatabaseService.IDB_STORE_NAME)) {
              db.createObjectStore(DatabaseService.IDB_STORE_NAME);
            }
          }
        });

        const existingDB = await this.loadFromIndexedDB();
        
        if (existingDB) {
          this.db = new SQL.Database(existingDB);
        } else {
          this.db = new SQL.Database();
          await this.createInitialSchema();
          await this.initializeDefaultData();
        }

        await this.saveToIndexedDB();
      }
      return true;
    } catch (error) {
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, this.PRODUCTION_CONFIG.retryDelay));
        return this.initializeDatabase(retryCount - 1);
      }
      throw new Error(`Database initialization failed after ${this.PRODUCTION_CONFIG.maxRetries} attempts`);
    }
  }

  static async ensureYearTables(bankId, year) {
    try {
      await this.createBankYearTables(bankId, year);
      await this.createDefaultCategories(bankId, year);
    } catch (error) {
      this.handleError(error, 'Error ensuring year tables');
    }
  }

  static async loadFromIndexedDB() {
    try {
      if (!this.idb) {
        throw new Error('IndexedDB not initialized');
      }
      const tx = this.idb.transaction(this.IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(this.IDB_STORE_NAME);
      const data = await store.get('database');
      await tx.done;
      return data;
    } catch (error) {
      this.handleError(error, 'Error loading from IndexedDB');
      return null;
    }
  }

  static async saveToIndexedDB() {
    try {
      if (!this.idb) {
        throw new Error('IndexedDB not initialized');
      }
      const tx = this.idb.transaction(this.IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.IDB_STORE_NAME);
      const data = this.db.export();
      await store.put(data, 'database');
      await tx.done;
    } catch (error) {
      this.handleError(error, 'Error saving to IndexedDB');
    }
  }

  static async createInitialSchema() {
    // Create core tables
    await this.db.exec(`
      CREATE TABLE users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        pin_hash TEXT,
        preferences JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );

      CREATE TABLE banks (
        bank_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        icon TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE financial_years (
        financial_year_id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  static async initializeDefaultData() {
    try {
      const currentYear = new Date().getFullYear();
      
      // Insert default financial year
      await this.db.exec(`
        INSERT INTO financial_years (start_date, end_date)
        VALUES ('${currentYear}-01-01', '${currentYear}-12-31');
      `);

      // Insert default bank
      await this.db.exec(`
        INSERT INTO banks (name, icon)
        VALUES ('Default Bank', '🏦');
      `);

      // Create bank-specific tables for the current year
      await this.createBankYearTables(1, currentYear);

      // Check if Petty Cash account exists
      const existingAccounts = await this.db.exec(`
        SELECT account_id FROM accounts_1_${currentYear}
        WHERE name = 'Petty Cash'
      `);

      // Create Petty Cash account if it doesn't exist
      if (!existingAccounts[0]?.values?.length) {
        await this.db.exec(`
          INSERT INTO accounts_1_${currentYear} (
            name,
            type,
            initial_balance,
            current_balance,
            currency,
            color_code,
            icon,
            notes,
            created_at,
            updated_at
          ) VALUES (
            'Petty Cash',
            'cash',
            0,
            0,
            'INR',
            '#FFD700',
            '💵',
            'Default cash account for small expenses',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
        `);
      }

      await this.saveToIndexedDB();
    } catch (error) {
      this.handleError(error, 'Error initializing default data');
    }
  }

  // Modify createBankYearTables to include is_default column
  static async createBankYearTables(bankId, year) {
    try {
      // Modify accounts table creation
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS accounts_${bankId}_${year} (
          account_id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          currency TEXT DEFAULT 'USD',
          initial_balance REAL DEFAULT 0,
          current_balance REAL DEFAULT 0,
          color_code TEXT,
          icon TEXT,
          notes TEXT,
          is_default INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create categories table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS categories_${bankId}_${year} (
          category_id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          parent_category_id INTEGER,
          color_code TEXT,
          icon TEXT,
          is_default INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create transactions table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS transactions_${bankId}_${year} (
          transaction_id INTEGER PRIMARY KEY,
          type TEXT NOT NULL,
          amount REAL NOT NULL,
          date TEXT NOT NULL,
          account_id INTEGER NOT NULL,
          to_account_id INTEGER,
          category_id INTEGER,
          description TEXT,
          payment_method TEXT,
          location TEXT,
          notes TEXT,
          tags TEXT,
          attachments TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (account_id) REFERENCES accounts_${bankId}_${year}(account_id),
          FOREIGN KEY (to_account_id) REFERENCES accounts_${bankId}_${year}(account_id),
          FOREIGN KEY (category_id) REFERENCES categories_${bankId}_${year}(category_id)
        )
      `);

      // Create default accounts after table creation
      await this.createDefaultAccounts(bankId, year);

      await this.saveToIndexedDB();
      return true;
    } catch (error) {
      this.handleError(error, 'Error creating tables');
    }
  }

  static async createDefaultCategories(bankId, year) {
    try {
      const tableName = `categories_${bankId}_${year}`;
      
      // Check if table exists
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS ${tableName} (
          category_id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          parent_category_id INTEGER,
          color_code TEXT,
          icon TEXT,
          is_default INTEGER DEFAULT 0,
          created_at TIMESTAMP,
          updated_at TIMESTAMP,
          FOREIGN KEY (parent_category_id) REFERENCES ${tableName}(category_id)
        )
      `);

      // Insert default categories if they don't exist
      for (const defaultCategory of this.DEFAULT_CATEGORIES) {
        const exists = await this.db.exec(`
          SELECT category_id FROM ${tableName}
          WHERE name = ? AND type = ? AND is_default = 1
        `, [defaultCategory.name, defaultCategory.type]);

        if (!exists[0]?.values?.length) {
          await this.db.exec(`
            INSERT INTO ${tableName} (
              name,
              type,
              color_code,
              icon,
              is_default,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [
            defaultCategory.name,
            defaultCategory.type,
            defaultCategory.colorCode,
            defaultCategory.icon
          ]);
        }
      }

      await this.saveToIndexedDB();
    } catch (error) {
      this.handleError(error, 'Error creating default categories');
    }
  }

  static async createIndexes(bankId, year) {
    try {
      // First check if indexes exist
      const indexCheck = await this.db.exec(`
        SELECT name FROM sqlite_master 
        WHERE type='index' 
        AND name LIKE 'idx_%_${bankId}_${year}'
      `);

      // If indexes already exist, skip creation
      if (indexCheck[0]?.values?.length > 0) {
        return;
      }

      // Create indexes if they don't exist
      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_transactions_date_account_${bankId}_${year}
        ON transactions_${bankId}_${year} (date, account_id);

        CREATE INDEX IF NOT EXISTS idx_transactions_category_${bankId}_${year}
        ON transactions_${bankId}_${year} (category_id);

        CREATE INDEX IF NOT EXISTS idx_accounts_name_${bankId}_${year}
        ON accounts_${bankId}_${year} (name);

        CREATE INDEX IF NOT EXISTS idx_categories_type_${bankId}_${year}
        ON categories_${bankId}_${year} (type);
      `);
    } catch (error) {
      this.handleError(error, 'Error creating indexes');
    }
  }

  // Account Operations
  static async createAccount(bankId, year, accountData) {
    try {
      await this.initializeDatabase();
      await this.ensureYearTables(bankId, year);

      const {
        name,
        type,
        initialBalance,
        currency,
        colorCode,
        icon,
        notes
      } = accountData;

      const result = await this.db.exec(`
        INSERT INTO accounts_${bankId}_${year} (
          name,
          type,
          initial_balance,
          current_balance,
          currency,
          color_code,
          icon,
          notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        name,
        type,
        initialBalance,
        initialBalance,
        currency,
        colorCode,
        icon,
        notes
      ]);

      await this.saveToIndexedDB();
      return result.lastInsertRowid;
    } catch (error) {
      this.handleError(error, 'Error creating account');
    }
  }

  static async getAccounts(bankId, year) {
    try {
      await this.initializeDatabase();
      
      // Ensure tables exist
      await this.createBankYearTables(bankId, year);

      const result = await this.db.exec(`
        SELECT 
          account_id,
          name,
          type,
          currency,
          initial_balance,
          current_balance,
          color_code,
          icon,
          notes,
          created_at,
          updated_at
        FROM accounts_${bankId}_${year}
        ORDER BY name
      `);

      return result[0]?.values.map(row => ({
        accountId: row[0],
        name: row[1],
        type: row[2],
        currency: row[3],
        initialBalance: row[4],
        currentBalance: row[5],
        color: row[6],
        icon: row[7],
        notes: row[8],
        createdAt: row[9],
        updatedAt: row[10]
      })) || [];
    } catch (error) {
      this.handleError(error, 'Error getting accounts');
    }
  }

  static async updateAccount(bankId, year, accountId, accountData) {
    try {
      await this.initializeDatabase();
      
      // Ensure all values are properly formatted
      const initialBalance = Number(accountData.initialBalance || 0);
      const currentBalance = Number(accountData.currentBalance || initialBalance);
      
      const query = `
        UPDATE accounts_${bankId}_${year}
        SET 
          name = ?,
          type = ?,
          initial_balance = ?,
          current_balance = ?,
          currency = ?,
          color_code = ?,
          icon = ?,
          notes = ?,
          updated_at = ?
        WHERE account_id = ?
      `;

      const values = [
        accountData.name || '',
        accountData.type || 'checking',
        initialBalance,
        currentBalance,
        accountData.currency || 'USD',
        accountData.colorCode || accountData.color || '#000000',
        accountData.icon || '💰',
        accountData.notes || '',
        dayjs().format('YYYY-MM-DD HH:mm:ss'),
        accountId
      ];

      await this.db.exec(query, values);
      await this.saveToIndexedDB();
      return true;
    } catch (error) {
      this.handleError(error, 'Error updating account');
    }
  }

  // Modify deleteAccount to prevent default account deletion
  static async deleteAccount(bankId, year, accountId) {
    let transaction = null;
    try {
      await this.initializeDatabase();
      const tableName = `accounts_${bankId}_${year}`;

      // Start transaction
      await this.db.exec('BEGIN TRANSACTION');
      transaction = true;

      // First check if account exists and is not a default account
      const accountResult = await this.db.exec(`
        SELECT is_default, name 
        FROM ${tableName}
        WHERE account_id = ?
      `, [accountId]);

      if (!accountResult[0]?.values?.length) {
        throw new Error('Account not found');
      }

      const [isDefault, accountName] = accountResult[0].values[0];
      if (isDefault) {
        throw new Error('Cannot delete default account');
      }

      // Check for any related transactions
      const transactionsTable = `transactions_${bankId}_${year}`;
      const transactionsResult = await this.db.exec(`
        SELECT COUNT(*) 
        FROM ${transactionsTable}
        WHERE account_id = ? OR to_account_id = ?
      `, [accountId, accountId]);

      const transactionCount = transactionsResult[0]?.values[0][0] || 0;
      if (transactionCount > 0) {
        throw new Error(`Cannot delete account "${accountName}" because it has ${transactionCount} transaction(s). Please delete the transactions first.`);
      }

      // If no transactions found, delete the account
      await this.db.exec(`
        DELETE FROM ${tableName}
        WHERE account_id = ?
      `, [accountId]);

      // Commit transaction
      await this.db.exec('COMMIT');
      transaction = null;

      // Save changes to IndexedDB
      await this.saveToIndexedDB();
      return true;

    } catch (error) {
      if (transaction) {
        await this.db.exec('ROLLBACK');
      }
      console.error('Error deleting account:', error);
      throw error;
    }
  }

  // Transaction Operations
  static async validateTransactionData(transactionData, bankId, year) {
    if (!transactionData.accountId) {
      throw new Error('Please select an account');
    }

    if (!transactionData.type) {
      throw new Error('Please select a transaction type');
    }

    const amount = Number(transactionData.amount);
    if (isNaN(amount) || amount === 0) {
      throw new Error('Please enter a valid amount');
    }

    // Check for sufficient balance for expenses and transfers
    if (transactionData.type.toLowerCase() === 'expense' || transactionData.type.toLowerCase() === 'transfer') {
      try {
        const currentBalance = await this.getAccountBalance(bankId, year, transactionData.accountId);
        if (Math.abs(amount) > currentBalance) {
          throw new Error(`Insufficient balance in account. Available balance: ${this.formatCurrency(currentBalance)}`);
        }
      } catch (error) {
        if (error.message.includes('Account not found')) {
          throw new Error('Selected account not found. Please choose a valid account');
        }
        throw error;
      }
    }

    if (transactionData.type === 'transfer' && !transactionData.toAccountId) {
      throw new Error('Please select a destination account for the transfer');
    }

    if (transactionData.type !== 'transfer' && !transactionData.categoryId) {
      throw new Error('Please select a category');
    }

    return true;
  }

  // Helper method to format currency
  static formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  static async updateTransaction(bankId, year, transactionId, transactionData) {
    try {
      await this.initializeDatabase();
      await this.beginTransaction();

      const tableName = `transactions_${bankId}_${year}`;

      // Get old transaction details
      const oldTransaction = await this.db.exec(`
        SELECT type, amount, account_id, to_account_id
        FROM ${tableName}
        WHERE transaction_id = ?
      `, [transactionId]);

      if (!oldTransaction[0]?.values?.length) {
        throw new Error('Transaction not found');
      }

      const [oldType, oldAmount, oldAccountId, oldToAccountId] = oldTransaction[0].values[0];

      // Reverse old transaction effects
      if (oldType === 'transfer') {
        await this.updateAccountBalance(bankId, year, oldAccountId, oldAmount);
        if (oldToAccountId) {
          await this.updateAccountBalance(bankId, year, oldToAccountId, -oldAmount);
        }
      } else {
        const oldBalanceChange = oldType === 'income' ? -oldAmount : oldAmount;
        await this.updateAccountBalance(bankId, year, oldAccountId, oldBalanceChange);
      }

      // Update transaction
      const newAmount = transactionData.type === 'expense' ? 
        -Math.abs(Number(transactionData.amount)) : 
        Math.abs(Number(transactionData.amount));

      await this.db.exec(`
        UPDATE ${tableName}
        SET type = ?,
            amount = ?,
            date = ?,
            account_id = ?,
            to_account_id = ?,
            category_id = ?,
            description = ?,
            payment_method = ?,
            location = ?,
            updated_at = ?
        WHERE transaction_id = ?
      `, [
        transactionData.type,
        newAmount,
        dayjs(transactionData.date).format('YYYY-MM-DD'),
        transactionData.accountId,
        transactionData.toAccountId || null,
        transactionData.categoryId,
        transactionData.description || '',
        transactionData.paymentMethod || 'cash',
        transactionData.location || '',
        dayjs().format('YYYY-MM-DD HH:mm:ss'),
        transactionId
      ]);

      // Apply new transaction effects
      if (transactionData.type === 'transfer') {
        await this.updateAccountBalance(bankId, year, transactionData.accountId, -newAmount);
        if (transactionData.toAccountId) {
          await this.updateAccountBalance(bankId, year, transactionData.toAccountId, newAmount);
        }
      } else {
        await this.updateAccountBalance(bankId, year, transactionData.accountId, newAmount);
      }

      await this.commitTransaction();
      return true;
    } catch (error) {
      await this.rollbackTransaction();
      throw error;
    }
  }

  static async deleteTransaction(bankId, year, transactionId) {
    try {
      await this.initializeDatabase();
      await this.beginTransaction();

      const transactionsTable = `transactions_${bankId}_${year}`;
      const accountsTable = `accounts_${bankId}_${year}`;

      // Get transaction details first
      const result = await this.db.exec(`
        SELECT type, amount, account_id, to_account_id
        FROM ${transactionsTable}
        WHERE transaction_id = ?
      `, [transactionId]);

      if (!result[0]?.values?.length) {
        throw new Error('Transaction not found');
      }

      const [type, amount, accountId, toAccountId] = result[0].values[0];

      // Reverse the balance changes
      if (type === 'transfer') {
        // Reverse transfer: Add back to source account and deduct from destination
        await this.db.exec(`
          UPDATE ${accountsTable}
          SET current_balance = current_balance + ?,
              updated_at = datetime('now')
          WHERE account_id = ?
        `, [Math.abs(amount), accountId]);

        if (toAccountId) {
          await this.db.exec(`
            UPDATE ${accountsTable}
            SET current_balance = current_balance - ?,
                updated_at = datetime('now')
            WHERE account_id = ?
          `, [Math.abs(amount), toAccountId]);
        }
      } else {
        // Reverse income/expense: Update single account
        const balanceChange = type === 'income' ? -Math.abs(amount) : Math.abs(amount);
        
        await this.db.exec(`
          UPDATE ${accountsTable}
          SET current_balance = current_balance + ?,
              updated_at = datetime('now')
          WHERE account_id = ?
        `, [balanceChange, accountId]);
      }

      // Delete the transaction
      await this.db.exec(`
        DELETE FROM ${transactionsTable}
        WHERE transaction_id = ?
      `, [transactionId]);

      await this.commitTransaction();
      await this.saveToIndexedDB();
      return true;
    } catch (error) {
      await this.rollbackTransaction();
      throw error;
    }
  }

  static async addTransaction(bankId, year, transactionData) {
    try {
      await this.beginTransaction();

      const tableName = `transactions_${bankId}_${year}`;
      const amount = Number(transactionData.amount);

      // For transfers, handle both accounts
      if (transactionData.type === 'transfer') {
        // Check balance of source account
        await this.checkSufficientBalance(bankId, year, transactionData.accountId, amount);

        // Update source account (deduct amount)
        await this.updateAccountBalance(bankId, year, transactionData.accountId, amount);

        // Update destination account (add amount)
        await this.updateAccountBalance(bankId, year, transactionData.toAccountId, Math.abs(amount));

      } else {
        // For regular transactions
        if (transactionData.type === 'expense') {
          await this.checkSufficientBalance(bankId, year, transactionData.accountId, amount);
        }
        await this.updateAccountBalance(bankId, year, transactionData.accountId, amount);
      }

      // Insert the transaction
      const formattedData = {
        transaction_id: transactionData.transactionId || Date.now(),
        type: transactionData.type,
        amount: amount,
        date: transactionData.date,
        account_id: transactionData.accountId,
        to_account_id: transactionData.toAccountId || null,
        category_id: transactionData.categoryId,
        description: transactionData.description || '',
        payment_method: transactionData.paymentMethod || 'cash',
        location: transactionData.location || '',
        created_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        updated_at: dayjs().format('YYYY-MM-DD HH:mm:ss')
      };

        const columns = Object.keys(formattedData).join(', ');
        const placeholders = Object.keys(formattedData).map(() => '?').join(', ');
        const values = Object.values(formattedData);

      await this.db.exec(`
          INSERT INTO ${tableName} (${columns})
          VALUES (${placeholders})
        `, values);

      await this.commitTransaction();
        return formattedData.transaction_id;
      } catch (error) {
      await this.rollbackTransaction();
      throw error;
    }
  }

  static async getTransactions(bankId, year, filters = {}) {
    try {
      await this.initializeDatabase();
      const tableName = `transactions_${bankId}_${year}`;

      let query = `
        SELECT 
          t.*,
          a.name as account_name,
          c.name as category_name
        FROM ${tableName} t
        LEFT JOIN accounts_${bankId}_${year} a ON t.account_id = a.account_id
        LEFT JOIN categories_${bankId}_${year} c ON t.category_id = c.category_id
        WHERE 1=1
      `;

      const params = [];

      if (filters.startDate) {
        query += ` AND t.date >= ?`;
        params.push(dayjs(filters.startDate).format('YYYY-MM-DD'));
      }

      if (filters.endDate) {
        query += ` AND t.date <= ?`;
        params.push(dayjs(filters.endDate).format('YYYY-MM-DD'));
      }

      if (filters.accountId) {
        query += ` AND (t.account_id = ? OR t.to_account_id = ?)`;
        params.push(filters.accountId, filters.accountId);
      }

      if (filters.categoryId) {
        query += ` AND t.category_id = ?`;
        params.push(filters.categoryId);
      }

      if (filters.type) {
        query += ` AND t.type = ?`;
        params.push(filters.type);
      }

      query += ` ORDER BY t.date DESC, t.transaction_id DESC`;

      const result = await this.db.exec(query, params);
      
      if (!result[0]?.values) return [];

      return result[0].values.map(row => {
        const mappedRow = this.mapTransactionRow(row);
        // Ensure amount is negative for expenses
        if (mappedRow.type === 'expense' && mappedRow.amount > 0) {
          mappedRow.amount = -mappedRow.amount;
        }
        return mappedRow;
      });
    } catch (error) {
      this.handleError(error, 'Error getting transactions');
      return [];
    }
  }

  // Helper methods
  static mapAccountRow(row) {
    if (!Array.isArray(row) || row.length < 13) {
      throw new Error('Invalid account data format');
    }

    const [
      accountId,
      name,
      type,
      initialBalance,
      currentBalance,
      currency,
      colorCode,
      icon,
      encryptedAccountNumber,
      notes,
      isActive,
      createdAt,
      updatedAt
    ] = row;

    // Validate required fields
    if (!accountId || !name || !type) {
      throw new Error('Missing required account fields');
    }

    return {
      accountId,
      name: String(name),
      type: String(type),
      initialBalance: Number(initialBalance) || 0,
      currentBalance: Number(currentBalance) || 0,
      currency: String(currency || 'USD'),
      colorCode: String(colorCode || '#000000'),
      icon: String(icon || '💰'),
      encryptedAccountNumber: encryptedAccountNumber || null,
      notes: notes || '',
      isActive: Boolean(isActive),
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: updatedAt || new Date().toISOString()
    };
  }

  static mapTransactionRow(row) {
    if (!Array.isArray(row) || row.length < 17) {
      throw new Error('Invalid transaction data format');
    }

    const [
      transactionId,
      type,
      amount,
      date,
      accountId,
      toAccountId,
      categoryId,
      description,
      paymentMethod,
      location,
      notes,
      tags,
      attachments,
      createdAt,
      updatedAt,
      accountName,
      categoryName
    ] = row;

    // Validate required fields
    if (!transactionId || !type || amount === undefined || !date || !accountId) {
      throw new Error('Missing required transaction fields');
    }

    return {
      transactionId,
      type: String(type),
      amount: Number(amount),
      date: dayjs(date).isValid() ? dayjs(date) : dayjs(), // Fallback to current date if invalid
      accountId,
      toAccountId: toAccountId || null,
      categoryId: categoryId || null,
      description: description || '',
      paymentMethod: paymentMethod || 'cash',
      location: location || '',
      notes: notes || '',
      tags: this.parseJSONSafely(tags) || [],
      attachments: this.parseJSONSafely(attachments) || [],
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: updatedAt || new Date().toISOString(),
      accountName: accountName || '',
      categoryName: categoryName || ''
    };
  }

  static async updateAccountBalance(bankId, year, accountId, amount) {
    try {
      await this.initializeDatabase();
      const tableName = `accounts_${bankId}_${year}`;

      // Get current balance
      const result = await this.db.exec(`
        SELECT current_balance 
        FROM ${tableName} 
        WHERE account_id = ?
      `, [accountId]);

      if (!result || !result[0] || !result[0].values || !result[0].values[0]) {
        throw new Error('Account not found');
      }

      const currentBalance = result[0].values[0][0];
      const newBalance = currentBalance + amount;

      // Update balance
      await this.db.exec(`
        UPDATE ${tableName}
        SET current_balance = ?,
            updated_at = ?
        WHERE account_id = ?
      `, [newBalance, dayjs().format('YYYY-MM-DD HH:mm:ss'), accountId]);

      await this.saveToIndexedDB();
      return newBalance;
    } catch (error) {
      this.handleError(error, 'Error updating account balance');
    }
  }

  // Add helper method for table ID validation
  static isValidTableId(id) {
    return Number.isInteger(Number(id)) && id > 0;
  }

  // Fix JSON parsing helper
  static parseJSONSafely(jsonString) {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  }

  // Bank Operations
  static async getBanks() {
    try {
      const result = await this.db.exec(`
        SELECT bank_id, name, icon, created_at
        FROM banks
        ORDER BY name
      `);
      return result[0]?.values?.map(this.mapBankRow) || [];
    } catch (error) {
      this.handleError(error, 'Error getting banks');
    }
  }

  static async createBank(bankData) {
    try {
      const { name, icon } = bankData;
      const result = await this.db.exec(`
        INSERT INTO banks (name, icon)
        VALUES (?, ?);
      `, [name, icon]);

      const bankId = result.lastInsertRowid;
      const year = new Date().getFullYear();
      
      // Create bank-specific tables for the current year
      await this.createBankYearTables(bankId, year);
      await this.saveToIndexedDB();
      
      return bankId;
    } catch (error) {
      this.handleError(error, 'Error creating bank');
    }
  }

  static async updateBank(bankId, bankData) {
    try {
      const { name, icon } = bankData;
      await this.db.exec(`
        UPDATE banks
        SET name = ?,
            icon = ?
        WHERE bank_id = ?;
      `, [name, icon, bankId]);
      
      await this.saveToIndexedDB();
    } catch (error) {
      this.handleError(error, 'Error updating bank');
    }
  }

  static async deleteBank(bankId) {
    try {
      // Get all years for this bank
      const years = await this.db.exec(`
        SELECT DISTINCT substr(name, instr(name, '_') + 1) as year
        FROM sqlite_master
        WHERE type = 'table'
          AND name LIKE 'accounts_${bankId}_%'
      `);

      // Drop all tables for this bank across all years
      for (const [year] of years[0]?.values || []) {
        await this.db.exec(`
          DROP TABLE IF EXISTS accounts_${bankId}_${year};
          DROP TABLE IF EXISTS categories_${bankId}_${year};
          DROP TABLE IF EXISTS transactions_${bankId}_${year};
        `);
      }

      // Delete the bank record
      await this.db.exec(`
        DELETE FROM banks
        WHERE bank_id = ?;
      `, [bankId]);

      await this.saveToIndexedDB();
    } catch (error) {
      this.handleError(error, 'Error deleting bank');
    }
  }

  // Helper method for mapping bank rows
  static mapBankRow(row) {
    const [bankId, name, icon, createdAt] = row;
    return {
      bankId,
      name,
      icon,
      createdAt
    };
  }

  static async getCategories(bankId, year) {
    try {
      await this.initializeDatabase();
      
      // Ensure tables and default data exist
      await this.createBankYearTables(bankId, year);
      await this.createDefaultCategories(bankId, year);

      const result = await this.db.exec(`
        SELECT 
          category_id as categoryId,
          name,
          type,
          parent_category_id as parentCategoryId,
          color_code as colorCode,
          icon,
          is_default as isDefault,
          created_at as createdAt,
          updated_at as updatedAt
        FROM categories_${bankId}_${year}
        ORDER BY name ASC
      `);

      if (!result[0]?.values) {
        return [];
      }

      return result[0].values.map(row => ({
        categoryId: row[0],
        name: row[1],
        type: row[2],
        parentCategoryId: row[3],
        colorCode: row[4],
        icon: row[5],
        isDefault: Boolean(row[6]),
        createdAt: row[7],
        updatedAt: row[8]
      }));
    } catch (error) {
      this.handleError(error, 'Error getting categories');
      return [];
    }
  }

  static async recreateYearTables(bankId, year) {
    try {
      await this.db.exec(`
        DROP TABLE IF EXISTS transactions_${bankId}_${year};
        DROP TABLE IF EXISTS categories_${bankId}_${year};
        DROP TABLE IF EXISTS accounts_${bankId}_${year};
      `);
      
      await this.createBankYearTables(bankId, year);
      await this.saveToIndexedDB();
    } catch (error) {
      this.handleError(error, 'Error recreating year tables');
    }
  }

  static async restoreSchema(schemaQueries) {
    try {
      // Drop existing tables
      const tables = await this.db.exec(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `);
      
      if (tables[0]?.values) {
        for (const [tableName] of tables[0].values) {
          await this.db.exec(`DROP TABLE IF EXISTS "${tableName}"`);
        }
      }

      // Create tables with proper schema
      const bankId = 1; // TODO: Get from context
      const year = new Date().getFullYear();
      await this.createBankYearTables(bankId, year);

      // Save changes
      await this.saveToIndexedDB();
      return true;
    } catch (error) {
      this.handleError(error, 'Error restoring schema');
    }
  }

  static async addAccount(bankId, year, account) {
    try {
      if (!account) throw new Error('Account data is required');
      
      await this.createBankYearTables(bankId, year);
      const tableName = `accounts_${bankId}_${year}`;
      
      // Convert account data to match table schema
      const accountData = {
        account_id: account.accountId || account.account_id || Date.now(),
        name: account.name || 'Unnamed Account',
        type: account.type || 'checking',
        currency: account.currency || 'USD',
        initial_balance: Number(account.initialBalance || account.initial_balance || 0),
        current_balance: Number(account.currentBalance || account.current_balance || 0),
        color_code: account.color || account.color_code || '#000000',
        icon: account.icon || '💰',
        notes: account.notes || '',
        created_at: account.createdAt || account.created_at || new Date().toISOString(),
        updated_at: account.updatedAt || account.updated_at || new Date().toISOString()
      };

      const columns = Object.keys(accountData).join(', ');
      const placeholders = Object.keys(accountData).map(() => '?').join(', ');
      const values = Object.values(accountData);

      const query = `
        INSERT OR REPLACE INTO ${tableName} (${columns})
        VALUES (${placeholders})
      `;

      try {
        await this.db.exec(query, values);
        await this.saveToIndexedDB();
        return true;
      } catch (error) {
        this.handleError(error, 'SQL Error');
      }
    } catch (error) {
      this.handleError(error, 'Error adding account');
    }
  }

  static async addCategory(bankId, year, category) {
    try {
      if (!category) throw new Error('Category data is required');

      await this.createBankYearTables(bankId, year);
      const tableName = `categories_${bankId}_${year}`;
      
      // Check if category already exists
      const existingCategory = await this.db.exec(`
        SELECT category_id FROM ${tableName}
        WHERE name = ? AND type = ?
      `, [category.name, category.type]);

      const categoryData = {
        category_id: existingCategory[0]?.values[0]?.[0] || 
                     category.categoryId || 
                     category.category_id || 
                     Date.now(),
        name: category.name || 'Unnamed Category',
        type: category.type || 'expense',
        parent_category_id: category.parentId || category.parent_id || category.parent_category_id || null,
        color_code: category.color || category.color_code || '#000000',
        icon: category.icon || '📁',
        is_default: Number(category.isDefault || category.is_default || 0),
        created_at: category.createdAt || category.created_at || new Date().toISOString(),
        updated_at: dayjs().format('YYYY-MM-DD HH:mm:ss')
      };

      // If category exists, update it
      if (existingCategory[0]?.values?.length > 0) {
        const setClause = Object.keys(categoryData)
          .filter(key => key !== 'category_id' && key !== 'created_at')
          .map(key => `${key} = ?`)
          .join(', ');
        
        const updateValues = Object.keys(categoryData)
          .filter(key => key !== 'category_id' && key !== 'created_at')
          .map(key => categoryData[key]);

        const query = `
          UPDATE ${tableName}
          SET ${setClause}
          WHERE category_id = ?
        `;

        await this.db.exec(query, [...updateValues, categoryData.category_id]);
      } else {
        // If category doesn't exist, insert it
        const columns = Object.keys(categoryData).join(', ');
        const placeholders = Object.keys(categoryData).map(() => '?').join(', ');
        const values = Object.values(categoryData);

        const query = `
          INSERT INTO ${tableName} (${columns})
          VALUES (${placeholders})
        `;

        await this.db.exec(query, values);
      }

      await this.saveToIndexedDB();
      return true;
    } catch (error) {
      this.handleError(error, 'Error adding category');
    }
  }

  static async createDefaultAccounts(bankId, year) {
    try {
      // First check if any default accounts exist
      const existingDefaults = await this.db.exec(`
        SELECT name FROM accounts_${bankId}_${year}
        WHERE is_default = 1
      `);

      // If default accounts already exist, skip creation
      if (existingDefaults[0]?.values?.length > 0) {
        return;
      }

      // Create default accounts only if none exist
      for (const defaultAccount of this.DEFAULT_ACCOUNTS) {
        try {
            await this.db.exec(`
              INSERT INTO accounts_${bankId}_${year} (
                name,
                type,
                currency,
                initial_balance,
                current_balance,
                color_code,
                icon,
                notes,
                is_default,
                created_at,
                updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
              defaultAccount.name,
              defaultAccount.type,
              defaultAccount.currency,
              defaultAccount.initialBalance,
              defaultAccount.currentBalance,
              defaultAccount.colorCode,
              defaultAccount.icon,
              defaultAccount.notes
            ]);
        } catch (error) {
          // Log error but continue with other accounts
          console.error(`Error creating default account: ${defaultAccount.name}`, error);
        }
      }
      await this.saveToIndexedDB();
    } catch (error) {
      this.handleError(error, 'Error creating default accounts');
    }
  }

  static async handleDatabaseMigration(currentVersion) {
    try {
      const dbVersion = await this.getDatabaseVersion();
      
      if (dbVersion < currentVersion) {
        await this.db.exec('BEGIN TRANSACTION');
        
        try {
          // Add migration steps here
          if (dbVersion < 1) {
            // Migration to version 1
            await this.migrateToV1();
          }
          
          // Update database version
          await this.db.exec(`
            UPDATE database_info 
            SET version = ?
          `, [currentVersion]);
          
          await this.db.exec('COMMIT');
          await this.saveToIndexedDB();
        } catch (error) {
          await this.db.exec('ROLLBACK');
          throw error;
        }
      }
    } catch (error) {
      this.handleError(error, 'Database migration failed');
    }
  }

  static async getDatabaseVersion() {
    try {
      const result = await this.db.exec(`
        SELECT version FROM database_info LIMIT 1
      `);
      return result[0]?.values?.[0]?.[0] || 0;
    } catch {
      return 0;
    }
  }

  static async migrateToV1() {
    // Add migration steps for version 1
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS database_info (
        version INTEGER PRIMARY KEY
      );
      INSERT OR IGNORE INTO database_info (version) VALUES (0);
    `);
  }

  // Add batch processing for large datasets
  static async processBatch(items, processFunc) {
    const batchSize = this.PRODUCTION_CONFIG.batchSize;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await Promise.all(batch.map(processFunc));
    }
  }

  // Add transaction limits
  static async validateTransactionLimit(bankId, year) {
    const count = await this.db.exec(`
      SELECT COUNT(*) FROM transactions_${bankId}_${year}
    `);
    
    if (count[0]?.values?.[0]?.[0] >= this.PRODUCTION_CONFIG.maxTransactions) {
      throw new Error(`Transaction limit of ${this.PRODUCTION_CONFIG.maxTransactions} reached`);
    }
  }

  // Add method to get account balance
  static async getAccountBalance(bankId, year, accountId) {
    try {
      const result = await this.db.exec(`
        SELECT current_balance 
        FROM accounts_${bankId}_${year}
        WHERE account_id = ?
      `, [accountId]);

      if (!result[0]?.values?.length) {
        throw new Error('Account not found');
      }

      return Number(result[0].values[0][0]);
    } catch (error) {
      this.handleError(error, 'Error getting account balance');
      throw error;
    }
  }

  static async checkSufficientBalance(bankId, year, accountId, amount) {
    try {
      const currentBalance = await this.getAccountBalance(bankId, year, accountId);
      if (amount < 0 && Math.abs(amount) > currentBalance) {
        throw new Error('Insufficient balance for this transaction');
      }
      return true;
    } catch (error) {
      this.handleError(error, 'Error checking balance');
      throw error;
    }
  }

  // Update transaction management methods
  static async beginTransaction() {
    try {
      await this.initializeDatabase();
      if (!this.isTransactionActive) {
        await this.db.exec('BEGIN TRANSACTION');
        this.isTransactionActive = true;
      }
    } catch (error) {
      if (!error.message.includes('already within a transaction')) {
        throw error;
      }
    }
  }

  static async commitTransaction() {
    try {
      if (this.isTransactionActive) {
        await this.db.exec('COMMIT');
        await this.saveToIndexedDB();
        this.isTransactionActive = false;
      }
    } catch (error) {
      this.isTransactionActive = false;
      if (!error.message.includes('no transaction is active')) {
        throw error;
      }
    }
  }

  static async rollbackTransaction() {
    try {
      if (this.isTransactionActive) {
        await this.db.exec('ROLLBACK');
        this.isTransactionActive = false;
      }
    } catch (error) {
      this.isTransactionActive = false;
      if (!error.message.includes('no transaction is active')) {
        throw error;
      }
    }
  }

  // Update recalculateAccountBalances to handle transactions properly
  static async recalculateAccountBalances(bankId, year) {
    try {
      await this.initializeDatabase();
      
      // Start transaction if not already in one
      const wasTransactionActive = this.isTransactionActive;
      if (!wasTransactionActive) {
        await this.beginTransaction();
      }

      const accountsTable = `accounts_${bankId}_${year}`;
      const transactionsTable = `transactions_${bankId}_${year}`;

      // Reset balances
      await this.db.exec(`
        UPDATE ${accountsTable}
        SET current_balance = initial_balance,
            updated_at = datetime('now')
      `);

      // Get and process transactions
      const transactions = await this.db.exec(`
        SELECT type, amount, account_id, to_account_id
        FROM ${transactionsTable}
        ORDER BY date ASC, transaction_id ASC
      `);

      if (transactions[0]?.values) {
        for (const [type, amount, accountId, toAccountId] of transactions[0].values) {
          if (type === 'transfer') {
            await this.db.exec(`
              UPDATE ${accountsTable}
              SET current_balance = current_balance - ?,
                  updated_at = datetime('now')
              WHERE account_id = ?
            `, [Math.abs(amount), accountId]);

            if (toAccountId) {
              await this.db.exec(`
                UPDATE ${accountsTable}
                SET current_balance = current_balance + ?,
                    updated_at = datetime('now')
                WHERE account_id = ?
              `, [Math.abs(amount), toAccountId]);
            }
          } else {
            const balanceChange = type === 'income' ? Math.abs(amount) : -Math.abs(amount);
            await this.db.exec(`
              UPDATE ${accountsTable}
              SET current_balance = current_balance + ?,
                  updated_at = datetime('now')
              WHERE account_id = ?
            `, [balanceChange, accountId]);
          }
        }
      }

      // Only commit if we started the transaction
      if (!wasTransactionActive) {
        await this.commitTransaction();
      }
      
      return true;
    } catch (error) {
      // Only rollback if we started the transaction
      if (!wasTransactionActive && this.isTransactionActive) {
        await this.rollbackTransaction();
      }
      throw error;
    }
  }

  // Add this method to DatabaseService class
  static async hasExistingData() {
    try {
      await this.initializeDatabase();
      const year = new Date().getFullYear();
      const bankId = 1; // Default bank ID

      // Check for existing transactions
      const transactions = await this.db.exec(`
        SELECT COUNT(*) as count 
        FROM transactions_${bankId}_${year}
      `);
      const transactionCount = transactions[0]?.values?.[0]?.[0] || 0;

      // Check for non-default accounts
      const accounts = await this.db.exec(`
        SELECT COUNT(*) as count 
        FROM accounts_${bankId}_${year}
        WHERE is_default = 0
      `);
      const accountCount = accounts[0]?.values?.[0]?.[0] || 0;

      // Return true if there are any transactions or non-default accounts
      return transactionCount > 0 || accountCount > 0;
    } catch (error) {
      // If tables don't exist, there's no existing data
      return false;
    }
  }

  // Add this method to your DatabaseService
  async recalculateAccountBalances(bankId, year) {
    try {
      const accounts = await this.getAccounts(bankId, year);
      const transactions = await this.getTransactions(bankId, year);

      for (const account of accounts) {
        let balance = account.initialBalance;

        // Sort transactions by date
        const accountTransactions = transactions
          .filter(t => t.accountId === account.accountId || t.toAccountId === account.accountId)
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate running balance
        accountTransactions.forEach(transaction => {
          if (transaction.type === 'income' && transaction.accountId === account.accountId) {
            balance += Math.abs(transaction.amount);
          } else if (transaction.type === 'expense' && transaction.accountId === account.accountId) {
            balance -= Math.abs(transaction.amount);
          } else if (transaction.type === 'transfer') {
            if (transaction.accountId === account.accountId) {
              balance -= Math.abs(transaction.amount);
            }
            if (transaction.toAccountId === account.accountId) {
              balance += Math.abs(transaction.amount);
            }
          }
        });

        // Update account balance
        await this.db.run(
          `UPDATE accounts_${bankId}_${year} 
           SET current_balance = ? 
           WHERE account_id = ?`,
          [balance, account.accountId]
        );
      }

      await this.saveToIndexedDB();
    } catch (error) {
      console.error('Error recalculating account balances:', error);
      throw error;
    }
  }
}

export default DatabaseService;