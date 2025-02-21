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

  static handleError(error, context) {
    // In production, you might want to log to a service like Sentry
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error(`${context}:`, error);
    }
    throw error;
  }

  static async initializeDatabase() {
    try {
      if (this.db) {
        return;
      }

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
    } catch (error) {
      this.handleError(error, 'Database initialization failed');
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
  }

  static async createBankYearTables(bankId, year) {
    try {
      // Create accounts table
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

      await this.saveToIndexedDB();
      return true;
    } catch (error) {
      this.handleError(error, 'Error creating tables');
    }
  }

  static async createDefaultCategories(bankId, year) {
    try {
      const defaultCategories = [
        // Income categories
        { name: 'Salary', type: 'income', icon: '💰', colorCode: '#4CAF50' },
        { name: 'Investment', type: 'income', icon: '📈', colorCode: '#2196F3' },
        { name: 'Other Income', type: 'income', icon: '💵', colorCode: '#9C27B0' },

        // Expense categories
        { name: 'Food & Dining', type: 'expense', icon: '🍽️', colorCode: '#F44336' },
        { name: 'Transportation', type: 'expense', icon: '🚗', colorCode: '#FF9800' },
        { name: 'Shopping', type: 'expense', icon: '🛒', colorCode: '#E91E63' },
        { name: 'Bills & Utilities', type: 'expense', icon: '📱', colorCode: '#3F51B5' },
        { name: 'Healthcare', type: 'expense', icon: '🏥', colorCode: '#009688' },
        { name: 'Entertainment', type: 'expense', icon: '🎬', colorCode: '#673AB7' },
        { name: 'Other Expenses', type: 'expense', icon: '📝', colorCode: '#795548' }
      ];

      // Check if default categories already exist
      const existing = await this.db.exec(`
        SELECT name, type FROM categories_${bankId}_${year}
        WHERE is_default = 1
      `);

      const existingCategories = existing[0]?.values?.map(([name, type]) => ({ name, type })) || [];

      // Only insert categories that don't exist
      for (const category of defaultCategories) {
        const exists = existingCategories.some(
          ec => ec.name === category.name && ec.type === category.type
        );

        if (!exists) {
          await this.db.exec(`
            INSERT INTO categories_${bankId}_${year} 
            (name, type, icon, color_code, is_default, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, ?, ?)
          `, [
            category.name,
            category.type,
            category.icon,
            category.colorCode,
            dayjs().format('YYYY-MM-DD HH:mm:ss'),
            dayjs().format('YYYY-MM-DD HH:mm:ss')
          ]);
        }
      }

      await this.saveToIndexedDB();
      return true;
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

  static async deleteAccount(bankId, year, accountId) {
    try {
      await this.initializeDatabase();
      
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
  static async createTransaction(bankId, year, transaction) {
    try {
      await this.initializeDatabase();
      await this.createBankYearTables(bankId, year);
      const tableName = `transactions_${bankId}_${year}`;

      // Format transaction data
      const transactionData = {
        transaction_id: transaction.transactionId || Date.now(),
        type: transaction.type || 'expense',
        amount: Number(transaction.amount || 0),
        date: dayjs(transaction.date).format('YYYY-MM-DD'),
        account_id: parseInt(transaction.accountId || transaction.account_id, 10),
        to_account_id: transaction.toAccountId || transaction.to_account_id ? 
          parseInt(transaction.toAccountId || transaction.to_account_id, 10) : null,
        category_id: parseInt(transaction.categoryId || transaction.category_id, 10),
        description: transaction.description || '',
        payment_method: transaction.paymentMethod || transaction.payment_method || 'cash',
        location: transaction.location || '',
        notes: transaction.notes || '',
        tags: JSON.stringify(transaction.tags || []),
        attachments: JSON.stringify(transaction.attachments || []),
        created_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        updated_at: dayjs().format('YYYY-MM-DD HH:mm:ss')
      };

      // Create SQL query
      const columns = Object.keys(transactionData).join(', ');
      const placeholders = Object.keys(transactionData).map(() => '?').join(', ');
      const values = Object.values(transactionData);

      // Insert transaction
      await this.db.exec(`
        INSERT INTO ${tableName} (${columns})
        VALUES (${placeholders})
      `, values);

      // Update account balances
      if (transaction.type === 'expense') {
        await this.updateAccountBalance(bankId, year, transaction.accountId, -transaction.amount);
      } else if (transaction.type === 'income') {
        await this.updateAccountBalance(bankId, year, transaction.accountId, transaction.amount);
      } else if (transaction.type === 'transfer' && transaction.toAccountId) {
        await this.updateAccountBalance(bankId, year, transaction.accountId, -transaction.amount);
        await this.updateAccountBalance(bankId, year, transaction.toAccountId, transaction.amount);
      }

      await this.saveToIndexedDB();
      return transactionData.transaction_id;
    } catch (error) {
      this.handleError(error, 'Error creating transaction');
    }
  }

  static async getTransactions(bankId, year, filters = {}) {
    try {
      await this.initializeDatabase();
      
      let query = `
        SELECT 
          t.transaction_id,
          t.type,
          t.amount,
          t.date,
          t.account_id,
          t.to_account_id,
          t.category_id,
          t.description,
          t.payment_method,
          t.location,
          t.notes,
          t.tags,
          t.attachments,
          t.created_at,
          t.updated_at,
          a.name as account_name,
          c.name as category_name,
          ta.name as to_account_name
        FROM transactions_${bankId}_${year} t
        LEFT JOIN accounts_${bankId}_${year} a ON t.account_id = a.account_id
        LEFT JOIN categories_${bankId}_${year} c ON t.category_id = c.category_id
        LEFT JOIN accounts_${bankId}_${year} ta ON t.to_account_id = ta.account_id
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

      return result[0]?.values.map(row => ({
        transactionId: row[0],
        type: row[1],
        amount: Number(row[2]),
        date: row[3],
        accountId: row[4],
        toAccountId: row[5],
        categoryId: row[6],
        description: row[7],
        paymentMethod: row[8],
        location: row[9],
        notes: row[10],
        tags: this.parseJSONSafely(row[11]),
        attachments: this.parseJSONSafely(row[12]),
        createdAt: row[13],
        updatedAt: row[14],
        accountName: row[15],
        categoryName: row[16],
        toAccountName: row[17]
      })) || [];
    } catch (error) {
      this.handleError(error, 'Error getting transactions');
    }
  }

  static async deleteTransaction(bankId, year, transactionId) {
    try {
      await this.initializeDatabase();
      await this.db.exec('BEGIN TRANSACTION');

      try {
        // Get the transaction details before deleting
        const result = await this.db.exec(`
          SELECT account_id, to_account_id, type, amount
          FROM transactions_${bankId}_${year}
          WHERE transaction_id = ?
        `, [transactionId]);

        if (!result[0]?.values?.length) {
          throw new Error('Transaction not found');
        }

        const [accountId, toAccountId, type, amount] = result[0].values[0];

        // Reverse the account balance changes
        if (type === 'transfer' && toAccountId) {
          await this.updateAccountBalance(bankId, year, accountId, Math.abs(amount));
          await this.updateAccountBalance(bankId, year, toAccountId, -Math.abs(amount));
        } else {
          await this.updateAccountBalance(bankId, year, accountId, -amount);
        }

        // Delete the transaction
        await this.db.exec(`
          DELETE FROM transactions_${bankId}_${year}
          WHERE transaction_id = ?
        `, [transactionId]);

        await this.db.exec('COMMIT');
        await this.saveToIndexedDB();
      } catch (error) {
        await this.db.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      this.handleError(error, 'Error deleting transaction');
    }
  }

  static async updateTransaction(bankId, year, transactionId, transactionData) {
    try {
      await this.initializeDatabase();
      await this.db.exec('BEGIN TRANSACTION');

      try {
        // Get the old transaction details
        const oldResult = await this.db.exec(`
          SELECT account_id, to_account_id, type, amount
          FROM transactions_${bankId}_${year}
          WHERE transaction_id = ?
        `, [transactionId]);

        if (!oldResult[0]?.values?.length) {
          throw new Error('Transaction not found');
        }

        const [oldAccountId, oldToAccountId, oldType, oldAmount] = oldResult[0].values[0];

        // Reverse the old transaction's effect on account balances
        if (oldType === 'transfer' && oldToAccountId) {
          await this.updateAccountBalance(bankId, year, oldAccountId, Math.abs(oldAmount));
          await this.updateAccountBalance(bankId, year, oldToAccountId, -Math.abs(oldAmount));
        } else if (oldType === 'expense') {
          await this.updateAccountBalance(bankId, year, oldAccountId, Math.abs(oldAmount));
        } else if (oldType === 'income') {
          await this.updateAccountBalance(bankId, year, oldAccountId, -Math.abs(oldAmount));
        }

        // Update the transaction
        const {
          accountId,
          toAccountId,
          categoryId,
          type,
          amount,
          date,
          description,
          paymentMethod,
          location
        } = transactionData;

        const dateStr = dayjs(date).format('YYYY-MM-DD HH:mm:ss');
        const actualCategoryId = type === 'transfer' ? null : categoryId;
        const actualAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);

        // Remove is_recurring from the UPDATE query
        await this.db.exec(`
          UPDATE transactions_${bankId}_${year}
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
          accountId,
          toAccountId || null,
          actualCategoryId,
          type,
          actualAmount,
          dateStr,
          description || '',
          paymentMethod || '',
          location || '',
          transactionId
        ]);

        // Apply the new transaction's effect on account balances
        if (type === 'transfer' && toAccountId) {
          await this.updateAccountBalance(bankId, year, accountId, -Math.abs(amount));
          await this.updateAccountBalance(bankId, year, toAccountId, Math.abs(amount));
        } else if (type === 'expense') {
          await this.updateAccountBalance(bankId, year, accountId, -Math.abs(amount));
        } else if (type === 'income') {
          await this.updateAccountBalance(bankId, year, accountId, Math.abs(amount));
        }

        await this.db.exec('COMMIT');
        await this.saveToIndexedDB();
      } catch (error) {
        await this.db.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      this.handleError(error, 'Error updating transaction');
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
      accountId,
      toAccountId,
      categoryId,
      type,
      amount,
      date,
      description,
      paymentMethod,
      location,
      isRecurring,
      createdAt,
      updatedAt,
      accountName,
      categoryName
    ] = row;

    return {
      transactionId,
      accountId,
      toAccountId,
      categoryId,
      type: String(type),
      amount: Number(amount),
      date: dayjs(date),
      description,
      paymentMethod,
      location,
      isRecurring: Boolean(isRecurring),
      createdAt,
      updatedAt,
      accountName,
      categoryName
    };
  }

  static async updateAccountBalance(bankId, year, accountId, amount) {
    try {
      await this.db.exec(`
        UPDATE accounts_${bankId}_${year}
        SET 
          current_balance = current_balance + ?,
          updated_at = ?
        WHERE account_id = ?
      `, [amount, dayjs().format('YYYY-MM-DD HH:mm:ss'), accountId]);
    } catch (error) {
      this.handleError(error, 'Error updating account balance');
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
      
      const result = await this.db.exec(`
        SELECT DISTINCT
          category_id,
          name,
          type,
          parent_category_id,
          color_code,
          icon,
          is_default,
          created_at,
          updated_at
        FROM categories_${bankId}_${year}
        GROUP BY name, type
        ORDER BY name
      `);

      return result[0]?.values.map(row => ({
        categoryId: row[0],
        name: row[1],
        type: row[2],
        parentCategoryId: row[3],
        colorCode: row[4],
        icon: row[5],
        isDefault: Boolean(row[6]),
        createdAt: row[7],
        updatedAt: row[8]
      })) || [];
    } catch (error) {
      this.handleError(error, 'Error getting categories');
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

      await this.createBankYearTables(bankId, year);
      const tableName = `transactions_${bankId}_${year}`;
      
      const transactionData = {
        transaction_id: transaction.transactionId || transaction.transaction_id || Date.now(),
        type: transaction.type || 'expense',
        amount: Number(transaction.amount || 0),
        date: dayjs(transaction.date).format('YYYY-MM-DD'),
        account_id: parseInt(transaction.accountId || transaction.account_id, 10),
        to_account_id: transaction.toAccountId || transaction.to_account_id ? 
          parseInt(transaction.toAccountId || transaction.to_account_id, 10) : null,
        category_id: parseInt(transaction.categoryId || transaction.category_id, 10),
        description: transaction.description || '',
        payment_method: transaction.paymentMethod || transaction.payment_method || 'cash',
        location: transaction.location || '',
        notes: transaction.notes || '',
        tags: JSON.stringify(transaction.tags || []),
        attachments: JSON.stringify(transaction.attachments || []),
        created_at: dayjs(transaction.createdAt || transaction.created_at).format('YYYY-MM-DD HH:mm:ss'),
        updated_at: dayjs(transaction.updatedAt || transaction.updated_at).format('YYYY-MM-DD HH:mm:ss')
      };

      const columns = Object.keys(transactionData).join(', ');
      const placeholders = Object.keys(transactionData).map(() => '?').join(', ');
      const values = Object.values(transactionData);

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
      this.handleError(error, 'Error adding transaction');
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
}

export default DatabaseService;