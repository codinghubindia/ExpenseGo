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
    try {
      await this.initializeDatabase();
      
      // Check if account is default
      const isDefault = await this.db.exec(`
        SELECT is_default FROM accounts_${bankId}_${year}
        WHERE account_id = ?
      `, [accountId]);

      if (isDefault[0]?.values?.[0]?.[0] === 1) {
        throw new Error('Cannot delete default account');
      }

      // First check if account has any transactions
      const transactions = await this.getTransactionsByAccount(bankId, year, accountId);
      if (transactions && transactions.length > 0) {
        throw new Error('Cannot delete account with existing transactions');
      }

      // Delete the account directly instead of soft delete
      await this.db.exec(`
        DELETE FROM accounts_${bankId}_${year}
        WHERE account_id = ?
      `, [accountId]);

      await this.saveToIndexedDB();
      return true;
    } catch (error) {
      this.handleError(error, 'Error deleting account');
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
    let transactionStarted = false;
    try {
      await this.initializeDatabase();
      const tableName = `transactions_${bankId}_${year}`;

      // Get the old transaction details first
      const oldResult = await this.db.exec(`
        SELECT account_id, to_account_id, type, amount
        FROM ${tableName}
        WHERE transaction_id = ?
      `, [transactionId]);

      if (!oldResult[0]?.values?.length) {
        throw new Error('Transaction not found');
      }

      const [oldAccountId, oldToAccountId, oldType, oldAmount] = oldResult[0].values[0];

      // Start transaction after getting old details
      await this.db.exec('BEGIN TRANSACTION');
      transactionStarted = true;

      try {
        // Reverse the old transaction's effect on account balances
        if (oldType === 'transfer' && oldToAccountId) {
          await this.updateAccountBalance(bankId, year, oldAccountId, Math.abs(oldAmount));
          await this.updateAccountBalance(bankId, year, oldToAccountId, -Math.abs(oldAmount));
        } else if (oldType === 'expense') {
          await this.updateAccountBalance(bankId, year, oldAccountId, Math.abs(oldAmount));
        } else if (oldType === 'income') {
          await this.updateAccountBalance(bankId, year, oldAccountId, -Math.abs(oldAmount));
        }

        // Format new transaction data
        const newAmount = transactionData.type.toLowerCase() === 'expense' ? 
          -Math.abs(Number(transactionData.amount)) : 
          Math.abs(Number(transactionData.amount));

        // Update the transaction
        await this.db.exec(`
          UPDATE ${tableName}
          SET account_id = ?,
              to_account_id = ?,
              category_id = ?,
              type = ?,
              amount = ?,
              date = ?,
              description = ?,
              payment_method = ?,
              location = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE transaction_id = ?
        `, [
          transactionData.accountId,
          transactionData.toAccountId || null,
          transactionData.type === 'transfer' ? null : transactionData.categoryId,
          transactionData.type,
          newAmount,
          dayjs(transactionData.date).format('YYYY-MM-DD'),
          transactionData.description || '',
          transactionData.paymentMethod || '',
          transactionData.location || '',
          transactionId
        ]);

        // Apply new transaction's effect on account balances
        await this.updateAccountBalance(bankId, year, transactionData.accountId, newAmount);

        if (transactionData.type === 'transfer' && transactionData.toAccountId) {
          await this.updateAccountBalance(bankId, year, transactionData.toAccountId, Math.abs(newAmount));
        }

        // Commit and save
        await this.db.exec('COMMIT');
        transactionStarted = false;
        await this.saveToIndexedDB();

        // Return updated transaction data
        return {
          transactionId,
          ...transactionData,
          amount: newAmount
        };
      } catch (error) {
        if (transactionStarted) {
          await this.db.exec('ROLLBACK');
        }
        throw error;
      }
    } catch (error) {
      if (transactionStarted) {
        await this.db.exec('ROLLBACK');
      }
      this.handleError(error, 'Error updating transaction');
      throw error;
    }
  }

  static async deleteTransaction(bankId, year, transactionId) {
    let transaction = null;
    try {
      await this.initializeDatabase();
      const tableName = `transactions_${bankId}_${year}`;

      // Get transaction details before starting transaction
      const result = await this.db.exec(`
        SELECT type, amount, account_id, to_account_id
        FROM ${tableName}
        WHERE transaction_id = ?
      `, [transactionId]);

      if (!result[0]?.values?.length) {
        throw new Error('Transaction not found');
      }

      const [type, amount, accountId, toAccountId] = result[0].values[0];
      const transactionAmount = Number(amount); // Keep the sign as stored

      // Start transaction after getting details
      await this.db.exec('BEGIN TRANSACTION');
      transaction = true;

      try {
        // Reverse the balance changes based on transaction type
        await this.updateAccountBalance(bankId, year, accountId, -transactionAmount); // Reverse the original effect

        if (type === 'transfer' && toAccountId) {
          await this.updateAccountBalance(bankId, year, toAccountId, -transactionAmount); // Reverse transfer effect
        }

        // Delete the transaction
        await this.db.exec(`
          DELETE FROM ${tableName}
          WHERE transaction_id = ?
        `, [transactionId]);

        await this.db.exec('COMMIT');
        transaction = null;
        await this.saveToIndexedDB();
        return true;
      } catch (error) {
        if (transaction) {
          await this.db.exec('ROLLBACK');
        }
        throw error;
      }
    } catch (error) {
      if (transaction) {
        await this.db.exec('ROLLBACK');
      }
      this.handleError(error, 'Error deleting transaction');
      throw error;
    }
  }

  static async createTransaction(bankId, year, transactionData) {
    let db = null;
    try {
      await this.validateTransactionData(transactionData, bankId, year);
      await this.initializeDatabase();
      await this.createBankYearTables(bankId, year);
      const tableName = `transactions_${bankId}_${year}`;

      // Format transaction data first
      const formattedData = {
        transaction_id: transactionData.transactionId || Date.now(),
        type: transactionData.type || 'expense',
        amount: transactionData.type.toLowerCase() === 'expense' ? 
          -Math.abs(Number(transactionData.amount)) : 
          Math.abs(Number(transactionData.amount)),
        date: dayjs(transactionData.date).format('YYYY-MM-DD'),
        account_id: parseInt(transactionData.accountId, 10),
        to_account_id: transactionData.toAccountId ? parseInt(transactionData.toAccountId, 10) : null,
        category_id: transactionData.categoryId ? parseInt(transactionData.categoryId, 10) : null,
        description: transactionData.description || '',
        payment_method: transactionData.paymentMethod || 'cash',
        location: transactionData.location || '',
        notes: transactionData.notes || '',
        tags: JSON.stringify(transactionData.tags || []),
        attachments: JSON.stringify(transactionData.attachments || []),
        created_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        updated_at: dayjs().format('YYYY-MM-DD HH:mm:ss')
      };

      // Create a new database connection for this transaction
      db = this.db;

      // Start transaction
      await db.exec('BEGIN TRANSACTION');

      try {
        // Update account balance
        await this.updateAccountBalance(bankId, year, transactionData.accountId, formattedData.amount);

        // Handle transfers
        if (transactionData.type === 'transfer' && transactionData.toAccountId) {
          await this.updateAccountBalance(bankId, year, transactionData.toAccountId, Math.abs(formattedData.amount));
        }

        // Insert transaction
        const columns = Object.keys(formattedData).join(', ');
        const placeholders = Object.keys(formattedData).map(() => '?').join(', ');
        const values = Object.values(formattedData);

        await db.exec(`
          INSERT INTO ${tableName} (${columns})
          VALUES (${placeholders})
        `, values);

        // Commit transaction
        await db.exec('COMMIT');

        // Save to IndexedDB after successful commit
        await this.saveToIndexedDB();
        return formattedData.transaction_id;

      } catch (error) {
        // Rollback on error
        if (db) {
          try {
            await db.exec('ROLLBACK');
          } catch (rollbackError) {
            console.error('Rollback failed:', rollbackError);
          }
        }
        throw error;
      }
    } catch (error) {
      this.handleError(error, 'Error creating transaction');
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
    const [accountId, name, type, initialBalance, currentBalance, currency, colorCode, icon, encryptedAccountNumber, notes, isActive, createdAt, updatedAt] = row;
    return {
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
      isActive: Boolean(isActive),
      createdAt,
      updatedAt
    };
  }

  static mapTransactionRow(row) {
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

    return {
      transactionId,
      type: String(type),
      // Keep the sign of the amount as stored in the database
      amount: Number(amount),
      date: dayjs(date),
      accountId,
      toAccountId,
      categoryId,
      description,
      paymentMethod,
      location,
      notes,
      tags: this.parseJSONSafely(tags),
      attachments: this.parseJSONSafely(attachments),
      createdAt,
      updatedAt,
      accountName,
      categoryName
    };
  }

  static async updateAccountBalance(bankId, year, accountId, amount) {
    try {
      // Get current balance first
      const result = await this.db.exec(`
        SELECT current_balance 
        FROM accounts_${bankId}_${year}
        WHERE account_id = ?
      `, [accountId]);

      if (!result[0]?.values?.length) {
        throw new Error('Account not found');
      }

      const currentBalance = Number(result[0].values[0][0]);
      const newBalance = currentBalance + Number(amount);

      await this.db.exec(`
        UPDATE accounts_${bankId}_${year}
        SET current_balance = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE account_id = ?
      `, [newBalance, accountId]);

    } catch (error) {
      this.handleError(error, 'Error updating account balance');
      throw error;
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

  static async addTransaction(bankId, year, transaction) {
    try {
      if (!transaction) throw new Error('Transaction data is required');

      await this.initializeDatabase();
      await this.createBankYearTables(bankId, year);
      const tableName = `transactions_${bankId}_${year}`;

      // Format transaction data first
      const transactionData = {
        transaction_id: transaction.transactionId || Date.now(),
        type: transaction.type || 'expense',
        // For expenses, store as negative value, for others keep as is
        amount: transaction.type.toLowerCase() === 'expense' ? 
          -Math.abs(Number(transaction.amount || 0)) : 
          Math.abs(Number(transaction.amount || 0)),
        date: dayjs(transaction.date).format('YYYY-MM-DD'),
        account_id: parseInt(transaction.accountId, 10),
        to_account_id: transaction.toAccountId ? parseInt(transaction.toAccountId, 10) : null,
        category_id: transaction.categoryId ? parseInt(transaction.categoryId, 10) : null,
        description: transaction.description || '',
        payment_method: transaction.paymentMethod || 'cash',
        location: transaction.location || '',
        notes: transaction.notes || '',
        tags: JSON.stringify(transaction.tags || []),
        attachments: JSON.stringify(transaction.attachments || []),
        created_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        updated_at: dayjs().format('YYYY-MM-DD HH:mm:ss')
      };

      await this.db.exec('BEGIN TRANSACTION');

      try {
        // Update account balance
        await this.updateAccountBalance(bankId, year, transaction.accountId, transactionData.amount);

        // Handle transfers
        if (transaction.type.toLowerCase() === 'transfer' && transaction.toAccountId) {
          await this.updateAccountBalance(bankId, year, transaction.toAccountId, Math.abs(transactionData.amount));
        }

        // Insert transaction
        const columns = Object.keys(transactionData).join(', ');
        const placeholders = Object.keys(transactionData).map(() => '?').join(', ');
        const values = Object.values(transactionData);

        await this.db.exec(`
          INSERT INTO ${tableName} (${columns})
          VALUES (${placeholders})
        `, values);

        await this.db.exec('COMMIT');
        await this.saveToIndexedDB();
        return transactionData.transaction_id;
      } catch (error) {
        await this.db.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      this.handleError(error, 'Error adding transaction');
      throw error;
    }
  }

  // Add helper method for safe JSON parsing
  static parseJSONSafely(str) {
    try {
      return str ? JSON.parse(str) : [];
    } catch (e) {
      this.handleError(e, 'Error parsing JSON');
      return [];
    }
  }

  static async updateCategory(bankId, year, categoryId, categoryData) {
    try {
      await this.initializeDatabase();
      const tableName = `categories_${bankId}_${year}`;

      // Check if category with same name exists (excluding current category)
      const existing = await this.db.exec(`
        SELECT category_id FROM ${tableName}
        WHERE name = ? AND type = ? AND category_id != ?
      `, [categoryData.name, categoryData.type, categoryId]);

      if (existing[0]?.values?.length > 0) {
        throw new Error('A category with this name already exists');
      }

      const query = `
        UPDATE ${tableName}
        SET 
          name = ?,
          type = ?,
          parent_category_id = ?,
          color_code = ?,
          icon = ?,
          updated_at = ?
        WHERE category_id = ?
      `;

      await this.db.exec(query, [
        categoryData.name,
        categoryData.type,
        categoryData.parentCategoryId || null,
        categoryData.colorCode || categoryData.color || '#000000',
        categoryData.icon || '📁',
        dayjs().format('YYYY-MM-DD HH:mm:ss'),
        categoryId
      ]);

      await this.saveToIndexedDB();
      return true;
    } catch (error) {
      this.handleError(error, 'Error updating category');
    }
  }

  static async deleteCategory(bankId, year, categoryId) {
    try {
      await this.initializeDatabase();
      const tableName = `categories_${bankId}_${year}`;

      // Check if category is used in any transactions
      const transactions = await this.db.exec(`
        SELECT COUNT(*) FROM transactions_${bankId}_${year}
        WHERE category_id = ?
      `, [categoryId]);

      if (transactions[0]?.values[0][0] > 0) {
        throw new Error('Cannot delete category: it is used in transactions');
      }

      // Check if category is default
      const isDefault = await this.db.exec(`
        SELECT is_default FROM ${tableName}
        WHERE category_id = ?
      `, [categoryId]);

      if (isDefault[0]?.values[0][0] === 1) {
        throw new Error('Cannot delete default category');
      }

      await this.db.exec(`
        DELETE FROM ${tableName}
        WHERE category_id = ?
      `, [categoryId]);

      await this.saveToIndexedDB();
      return true;
    } catch (error) {
      this.handleError(error, 'Error deleting category');
    }
  }

  static async createCategory(bankId, year, categoryData) {
    try {
      await this.initializeDatabase();
      const tableName = `categories_${bankId}_${year}`;

      // Check if category with same name exists
      const existing = await this.db.exec(`
        SELECT category_id FROM ${tableName}
        WHERE name = ? AND type = ?
      `, [categoryData.name, categoryData.type]);

      if (existing[0]?.values?.length > 0) {
        throw new Error('A category with this name already exists');
      }

      const categoryId = Date.now();
      const query = `
        INSERT INTO ${tableName} (
          category_id,
          name,
          type,
          parent_category_id,
          color_code,
          icon,
          is_default,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.exec(query, [
        categoryId,
        categoryData.name,
        categoryData.type,
        categoryData.parentCategoryId || null,
        categoryData.colorCode || categoryData.color || '#000000',
        categoryData.icon || '📁',
        0, // not a default category
        dayjs().format('YYYY-MM-DD HH:mm:ss'),
        dayjs().format('YYYY-MM-DD HH:mm:ss')
      ]);

      await this.saveToIndexedDB();
      return categoryId;
    } catch (error) {
      this.handleError(error, 'Error creating category');
    }
  }

  static async cleanupDuplicateCategories(bankId, year) {
    try {
      await this.initializeDatabase();
      const tableName = `categories_${bankId}_${year}`;

      // Find duplicates
      const duplicates = await this.db.exec(`
        WITH duplicates AS (
          SELECT 
            name,
            type,
            MIN(category_id) as keep_id,
            COUNT(*) as count
          FROM ${tableName}
          GROUP BY name, type
          HAVING count > 1
        )
        SELECT d.name, d.type, d.keep_id, c.category_id
        FROM duplicates d
        JOIN ${tableName} c ON c.name = d.name AND c.type = d.type
        WHERE c.category_id != d.keep_id
      `);

      if (duplicates[0]?.values?.length > 0) {
        // Update transactions to point to the kept category
        for (const [name, type, keepId, deleteId] of duplicates[0].values) {
          // Update transactions
          await this.db.exec(`
            UPDATE transactions_${bankId}_${year}
            SET category_id = ?
            WHERE category_id = ?
          `, [keepId, deleteId]);

          // Delete duplicate category
          await this.db.exec(`
            DELETE FROM ${tableName}
            WHERE category_id = ?
          `, [deleteId]);
        }

        await this.saveToIndexedDB();
      }

      return true;
    } catch (error) {
      this.handleError(error, 'Error cleaning up duplicate categories');
    }
  }

  static async getTransactionsByAccount(bankId, year, accountId) {
    try {
      await this.initializeDatabase();
      const result = await this.db.exec(`
        SELECT * FROM transactions_${bankId}_${year}
        WHERE account_id = ? OR to_account_id = ?
      `, [accountId, accountId]);
      return result || [];
    } catch (error) {
      this.handleError(error, 'Error getting transactions by account');
      return [];
    }
  }

  static async createDefaultAccounts(bankId, year) {
    try {
      for (const defaultAccount of this.DEFAULT_ACCOUNTS) {
        try {
          // Check if default account exists
          const exists = await this.db.exec(`
            SELECT account_id FROM accounts_${bankId}_${year}
            WHERE name = ? AND is_default = 1
          `, [defaultAccount.name]);

          if (!exists[0]?.values?.length) {
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
          }
        } catch (error) {
          this.handleError(error, `Error creating default account: ${defaultAccount.name}`);
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
}

export default DatabaseService;