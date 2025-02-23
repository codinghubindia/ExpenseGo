import DatabaseService from './DatabaseService';
import dayjs from 'dayjs';
import CryptoJS from 'crypto-js';
import { openDB } from 'idb';

class BackupService {
  static ENCRYPTION_KEY = 'ExpenseGo-Secure-Key-2024';
  
  static BACKUP_FORMATS = {
    DEFAULT: {
      extension: 'egsecure',
      mime: 'application/octet-stream',
      description: 'ExpenseGo Encrypted Backup',
      version: '1.0'
    }
  };

  static CONFIG = {
    maxBackupSize: 10 * 1024 * 1024, // 10MB
    compressionLevel: 9,
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    chunkSize: 1000, // Process records in chunks
    defaultBank: 1
  };

  static async createBackup(format = 'DEFAULT', options = {}) {
    const retryCount = options.retryCount ?? this.CONFIG.maxRetries;
    
    try {
      // Validate format
      if (!this.BACKUP_FORMATS[format]) {
        format = 'DEFAULT';
      }

      // Initialize database connection if not already initialized
      await DatabaseService.initializeDatabase();

      // Prepare backup data with metadata
      const backupData = await this.prepareBackupData();
      
      // Validate backup data before processing
      if (!backupData || !backupData.accounts || !backupData.categories || !backupData.transactions) {
        throw new Error('Invalid backup data structure');
      }

      const backup = {
        version: this.BACKUP_FORMATS[format].version,
        timestamp: dayjs().toISOString(),
        format,
        metadata: {
          appVersion: '1.0.0',
          platform: navigator.platform,
          userAgent: navigator.userAgent,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        data: backupData
      };

      // Validate the complete backup object
      if (!this.validateBackupData(backup)) {
        throw new Error('Backup validation failed');
      }

      // Convert to string with proper error handling
      let backupString;
      try {
        backupString = JSON.stringify(backup, null, 2);
      } catch (error) {
        throw new Error(`JSON stringification failed: ${error.message}`);
      }

      // Process backup based on format
      let processedData;
      try {
        processedData = format === 'ENCRYPTED' 
          ? this.encryptData(backupString)
          : backupString;
      } catch (error) {
        throw new Error(`Data processing failed: ${error.message}`);
      }

      // Create blob with error handling
      let blob;
      try {
        blob = new Blob([processedData], {
        type: this.BACKUP_FORMATS[format].mime
      });
      } catch (error) {
        throw new Error(`Blob creation failed: ${error.message}`);
      }

      if (blob.size > this.CONFIG.maxBackupSize) {
        throw new Error(`Backup size (${blob.size} bytes) exceeds limit (${this.CONFIG.maxBackupSize} bytes)`);
      }

      if (blob.size === 0) {
        throw new Error('Generated backup is empty');
      }

      const fileName = this.generateBackupFileName(format);

      return { blob, fileName, format };
    } catch (error) {
      if (retryCount > 0) {
        console.warn(`Backup attempt failed, retrying... (${retryCount} attempts remaining)`);
        await new Promise(resolve => setTimeout(resolve, this.CONFIG.retryDelay));
        return this.createBackup(format, { ...options, retryCount: retryCount - 1 });
      }
      throw new Error(`Backup creation failed: ${error.message}`);
    }
  }

  static async restoreBackup(backupData) {
    if (!backupData?.data?.accounts || !backupData?.data?.transactions) {
      throw new Error('Invalid backup data structure');
    }

    const year = new Date().getFullYear();
    const bankId = this.CONFIG.defaultBank;

    await DatabaseService.beginTransaction();

    try {
      // 1. Create fresh tables
      await DatabaseService.createBankYearTables(bankId, year);
      await DatabaseService.createDefaultCategories(bankId, year);

      // 2. Get the default account ID that was just created
      const defaultAccount = await DatabaseService.db.exec(`
        SELECT account_id FROM accounts_${bankId}_${year}
        WHERE is_default = 1
        LIMIT 1
      `);
      const defaultAccountId = defaultAccount[0]?.values?.[0]?.[0];
      if (!defaultAccountId) {
        throw new Error('Default account not found');
      }

      // 3. Find default account in backup data
      const defaultAccountFromBackup = backupData.data.accounts.find(acc => 
        acc.name.toLowerCase().trim() === 'petty cash' || acc.isDefault
      );

      // 4. Update default account with backup data if found
      if (defaultAccountFromBackup) {
        await DatabaseService.db.exec(`
          UPDATE accounts_${bankId}_${year}
          SET initial_balance = ?,
              current_balance = ?,
              color_code = ?,
              icon = ?
          WHERE account_id = ?
        `, [
          defaultAccountFromBackup.initialBalance || 0,
          0, // Will be recalculated
          defaultAccountFromBackup.colorCode || '#000000',
          defaultAccountFromBackup.icon || '💵',
          defaultAccountId
        ]);
      }

      // 5. Create account mapping and track existing accounts
      const accountMap = new Map();
      const existingAccounts = new Set(['petty cash']);

      // Map the default account
      if (defaultAccountFromBackup) {
        accountMap.set(defaultAccountFromBackup.accountId, defaultAccountId);
      } else {
        // If no default account in backup, map ID 1 to default account
        accountMap.set(1, defaultAccountId);
      }

      // 6. Create other accounts from backup
      for (const account of backupData.data.accounts) {
        const normalizedName = (account.name || '').toLowerCase().trim();
        if (!account.isDefault && normalizedName !== 'petty cash' && !existingAccounts.has(normalizedName)) {
          existingAccounts.add(normalizedName);

          const result = await DatabaseService.db.exec(`
            INSERT INTO accounts_${bankId}_${year} (
              name, type, currency, initial_balance,
              current_balance, color_code, icon, is_default
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING account_id
          `, [
            account.name,
            account.type || 'cash',
            account.currency || 'INR',
            account.initialBalance || 0,
            0, // Will be recalculated
            account.colorCode || '#000000',
            account.icon || '💰',
            0
          ]);

          if (result[0]?.values?.[0]) {
            accountMap.set(account.accountId, result[0].values[0][0]);
          }
        }
      }

      // 7. Restore transactions
      for (const transaction of backupData.data.transactions) {
        const fromAccountId = accountMap.get(transaction.accountId);
        if (!fromAccountId) continue;

        const toAccountId = transaction.toAccountId ? 
          accountMap.get(transaction.toAccountId) : null;

        await DatabaseService.db.exec(`
          INSERT INTO transactions_${bankId}_${year} (
            type, amount, date, account_id,
            to_account_id, category_id, description, payment_method,
            tags, attachments
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          transaction.type,
          transaction.amount,
          transaction.date,
          fromAccountId,
          toAccountId,
          transaction.categoryId,
          transaction.description || '',
          transaction.paymentMethod || 'cash',
          JSON.stringify(transaction.tags || []),
          JSON.stringify(transaction.attachments || [])
        ]);
      }

      // 8. Update balances
      await DatabaseService.db.exec(`
        UPDATE accounts_${bankId}_${year}
        SET current_balance = initial_balance
      `);

      // 9. Calculate income/expense transactions
      await DatabaseService.db.exec(`
        UPDATE accounts_${bankId}_${year}
        SET current_balance = current_balance + (
          SELECT COALESCE(SUM(
            CASE 
              WHEN type = 'income' THEN amount
              WHEN type = 'expense' THEN -amount
              ELSE 0
            END
          ), 0)
          FROM transactions_${bankId}_${year}
          WHERE account_id = accounts_${bankId}_${year}.account_id
            AND type IN ('income', 'expense')
        )
      `);

      // 10. Calculate transfer transactions
      await DatabaseService.db.exec(`
        UPDATE accounts_${bankId}_${year}
        SET current_balance = current_balance - (
          SELECT COALESCE(SUM(amount), 0)
          FROM transactions_${bankId}_${year}
          WHERE account_id = accounts_${bankId}_${year}.account_id
            AND type = 'transfer'
        ) + (
          SELECT COALESCE(SUM(amount), 0)
          FROM transactions_${bankId}_${year}
          WHERE to_account_id = accounts_${bankId}_${year}.account_id
            AND type = 'transfer'
        )
      `);

      // 11. Commit changes
      await DatabaseService.commitTransaction();
      await DatabaseService.saveToIndexedDB();

      return true;
    } catch (error) {
      await DatabaseService.rollbackTransaction();
      throw error;
    }
  }

  static async handlePendingRestore() {
    try {
      const pendingRestore = localStorage.getItem('pendingRestore');
      const restoreInitiated = localStorage.getItem('restoreInitiated');

      if (!pendingRestore || !restoreInitiated) {
        return false;
      }

      // Clear the flags first to prevent loops
      localStorage.removeItem('pendingRestore');
      localStorage.removeItem('restoreInitiated');

      const backupData = JSON.parse(pendingRestore);
      
      // Initialize database
      await DatabaseService.initializeDatabase();
      const year = new Date().getFullYear();
      const bankId = this.CONFIG.defaultBank;

      // Begin transaction
      await DatabaseService.beginTransaction();

      try {
        // 1. Create fresh tables and default data
        await DatabaseService.createBankYearTables(bankId, year);
        await DatabaseService.createDefaultCategories(bankId, year);

        // 2. Get the default account (Petty Cash)
        const defaultAccount = await DatabaseService.db.exec(`
          SELECT account_id FROM accounts_${bankId}_${year}
          WHERE is_default = 1
          LIMIT 1
        `);

        const defaultAccountId = defaultAccount[0]?.values?.[0]?.[0];
        if (!defaultAccountId) {
          throw new Error('Failed to find default account');
        }

        // 3. Create account mapping
        const accountMap = new Map();
        const existingAccounts = new Set(['petty cash']);

        // Map default account
        const defaultAccountFromBackup = backupData.data.accounts.find(acc => acc.isDefault);
        if (defaultAccountFromBackup) {
          accountMap.set(defaultAccountFromBackup.accountId, defaultAccountId);
        }

        // 4. Create other accounts from backup
        for (const account of backupData.data.accounts) {
          const normalizedName = (account.name || '').toLowerCase().trim();
          if (!account.isDefault && !existingAccounts.has(normalizedName)) {
            existingAccounts.add(normalizedName);

            const accountData = [
              String(account.name || ''),
              String(account.type || 'cash'),
              String(account.currency || 'INR'),
              Number(account.initialBalance || 0),
              0, // Will be recalculated
              String(account.colorCode || '#000000'),
              String(account.icon || '💰'),
              0
            ];

            const result = await DatabaseService.db.exec(`
              INSERT INTO accounts_${bankId}_${year} (
                name, type, currency, initial_balance,
                current_balance, color_code, icon, is_default
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              RETURNING account_id
            `, accountData);

            if (result[0]?.values?.[0]) {
              accountMap.set(account.accountId, result[0].values[0][0]);
            }
          }
        }

        // 5. Restore transactions
        for (const transaction of backupData.data.transactions) {
          const fromAccountId = accountMap.get(transaction.accountId);
          if (!fromAccountId) continue;

          const toAccountId = transaction.toAccountId ? 
            accountMap.get(transaction.toAccountId) : null;

          const transactionData = [
            String(transaction.type || 'expense'),
            Number(transaction.amount || 0),
            String(transaction.date || new Date().toISOString()),
            Number(fromAccountId),
            toAccountId ? Number(toAccountId) : null,
            Number(transaction.categoryId || 1),
            String(transaction.description || ''),
            String(transaction.paymentMethod || 'cash'),
            JSON.stringify(transaction.tags || []),
            JSON.stringify(transaction.attachments || [])
          ];

          await DatabaseService.db.exec(`
            INSERT INTO transactions_${bankId}_${year} (
              type, amount, date, account_id,
              to_account_id, category_id, description, payment_method,
              tags, attachments
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, transactionData);
        }

        // 6. Update account balances
        await DatabaseService.db.exec(`
          UPDATE accounts_${bankId}_${year}
          SET current_balance = initial_balance
        `);

        // Calculate income/expense transactions
        await DatabaseService.db.exec(`
          UPDATE accounts_${bankId}_${year}
          SET current_balance = current_balance + (
            SELECT COALESCE(SUM(
              CASE 
                WHEN type = 'income' THEN amount
                WHEN type = 'expense' THEN -amount
                ELSE 0
              END
            ), 0)
            FROM transactions_${bankId}_${year}
            WHERE account_id = accounts_${bankId}_${year}.account_id
              AND type IN ('income', 'expense')
          )
        `);

        // Calculate transfer transactions
        await DatabaseService.db.exec(`
          UPDATE accounts_${bankId}_${year}
          SET current_balance = current_balance - (
            SELECT COALESCE(SUM(amount), 0)
            FROM transactions_${bankId}_${year}
            WHERE account_id = accounts_${bankId}_${year}.account_id
              AND type = 'transfer'
          ) + (
            SELECT COALESCE(SUM(amount), 0)
            FROM transactions_${bankId}_${year}
            WHERE to_account_id = accounts_${bankId}_${year}.account_id
              AND type = 'transfer'
          )
        `);

        // 7. Commit and save
        await DatabaseService.commitTransaction();
        await DatabaseService.saveToIndexedDB();

        return true;
      } catch (error) {
        console.error('Restore error:', error);
        await DatabaseService.rollbackTransaction();
        throw error;
      }
    } catch (error) {
      console.error('Post-reload restore failed:', error);
      throw new Error(`Post-reload restore failed: ${error.message}`);
    }
  }

  static async prepareBackupData() {
    try {
      const bankId = this.CONFIG.defaultBank;
      const year = new Date().getFullYear();

      // Get all required data with better error handling
      let banks, accounts, categories, transactions;
      try {
        [banks, accounts, categories, transactions] = await Promise.all([
          DatabaseService.getBanks(),
          DatabaseService.getAccounts(bankId, year),
          DatabaseService.getCategories(bankId, year),
          DatabaseService.getTransactions(bankId, year)
        ]);

        // Log data for debugging
        console.log('Fetched Data:', {
          banks: banks?.length,
          accounts: accounts?.length,
          categories: categories?.length,
          transactions: transactions?.length
        });
      } catch (error) {
        throw new Error(`Failed to fetch data: ${error.message}`);
      }

      // Validate data existence with better error messages
      if (!banks?.length) throw new Error('No banks found');
      if (!accounts?.length) throw new Error('No accounts found');
      if (!categories?.length) throw new Error('No categories found');

      // Get schema
      const schema = await this.getSchema();

      // Process data with proper structure and type checking
      const backupData = {
        schema,
        banks: banks.map(bank => ({
          bankId: Number(bank.bankId),
          name: String(bank.name || ''),
          description: String(bank.description || ''),
          isDefault: Boolean(bank.isDefault),
          createdAt: bank.createdAt || new Date().toISOString(),
          updatedAt: bank.updatedAt || new Date().toISOString()
        })),
        accounts: accounts.map(account => ({
          accountId: Number(account.accountId),
          bankId: Number(account.bankId),
          name: String(account.name || ''),
          type: String(account.type || 'cash'),
          currency: String(account.currency || 'INR'),
          initialBalance: Number(account.initialBalance || 0),
          currentBalance: Number(account.currentBalance || 0),
          colorCode: String(account.colorCode || '#000000'),
          icon: String(account.icon || '💰'),
          isDefault: Boolean(account.isDefault),
          createdAt: account.createdAt || new Date().toISOString(),
          updatedAt: account.updatedAt || new Date().toISOString()
        })),
        categories: categories.map(category => ({
          categoryId: Number(category.categoryId),
          bankId: Number(category.bankId),
          name: String(category.name || ''),
          type: String(category.type || 'expense'),
          colorCode: String(category.colorCode || '#000000'),
          icon: String(category.icon || '📁'),
          isDefault: Boolean(category.isDefault),
          createdAt: category.createdAt || new Date().toISOString(),
          updatedAt: category.updatedAt || new Date().toISOString()
        })),
        transactions: (transactions || []).map(transaction => ({
          transactionId: Number(transaction.transactionId),
          type: String(transaction.type || 'expense'),
          amount: Number(transaction.amount || 0),
          date: transaction.date || new Date().toISOString(),
          accountId: Number(transaction.accountId),
          toAccountId: transaction.toAccountId ? Number(transaction.toAccountId) : null,
          categoryId: Number(transaction.categoryId),
          description: String(transaction.description || ''),
          paymentMethod: String(transaction.paymentMethod || 'cash'),
          tags: Array.isArray(transaction.tags) ? transaction.tags : 
                typeof transaction.tags === 'string' ? JSON.parse(transaction.tags) : [],
          attachments: Array.isArray(transaction.attachments) ? transaction.attachments :
                      typeof transaction.attachments === 'string' ? JSON.parse(transaction.attachments) : [],
          createdAt: transaction.createdAt || new Date().toISOString(),
          updatedAt: transaction.updatedAt || new Date().toISOString()
        })),
        metadata: {
          bankId: Number(bankId),
          year: Number(year),
          timestamp: new Date().toISOString(),
          recordCounts: {
            banks: banks.length,
            accounts: accounts.length,
            categories: categories.length,
            transactions: transactions?.length || 0
          }
        }
      };

      // Log processed data for debugging
      console.log('Processed Data Structure:', {
        banks: backupData.banks[0],
        accounts: backupData.accounts[0],
        categories: backupData.categories[0],
        transactions: backupData.transactions[0]
      });

      // Validate the prepared data
      const isValid = this.validateBackupDataStructure(backupData);
      if (!isValid) {
        throw new Error('Generated backup data is invalid');
      }

      return backupData;
    } catch (error) {
      console.error('Data preparation failed:', error);
      throw new Error(`Failed to prepare backup data: ${error.message}`);
    }
  }

  static async restoreData(data) {
    const year = new Date().getFullYear();
    const bankId = this.CONFIG.defaultBank;

    await DatabaseService.beginTransaction();
    
    try {
      // 1. Create tables
      await DatabaseService.createBankYearTables(bankId, year);

      // 2. Create default categories
      await DatabaseService.createDefaultCategories(bankId, year);

      // 3. Create default account (Petty Cash)
      await DatabaseService.db.exec(`
        INSERT INTO accounts_${bankId}_${year} (
          name, type, currency, initial_balance,
          current_balance, color_code, icon, is_default
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'Petty Cash',
        'cash',
        'INR',
        0,
        0,
        '#000000',
        '💵',
        1
      ]);

      // 4. Create other accounts from backup
      const accountMap = new Map();
      for (const account of data.accounts) {
        if (!account.isDefault) {
          const result = await DatabaseService.db.exec(`
            INSERT INTO accounts_${bankId}_${year} (
              name, type, currency, initial_balance,
              current_balance, color_code, icon, is_default
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING account_id
          `, [
            account.name,
            account.type,
            account.currency,
            account.initialBalance,
            0,
            account.colorCode,
            account.icon,
            0
          ]);

          if (result[0]?.values?.[0]) {
            accountMap.set(account.accountId, result[0].values[0][0]);
          }
        }
      }

      // 5. Restore transactions
      for (const transaction of data.transactions) {
        const fromAccountId = accountMap.get(transaction.accountId);
        if (!fromAccountId) continue; // Skip if account not found

        const toAccountId = transaction.toAccountId ? 
          accountMap.get(transaction.toAccountId) : null;

        await DatabaseService.db.exec(`
          INSERT INTO transactions_${bankId}_${year} (
            type, amount, date, account_id,
            to_account_id, category_id, description, payment_method,
            tags, attachments
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          transaction.type,
          transaction.amount,
          transaction.date,
          fromAccountId,
          toAccountId,
          transaction.categoryId,
          transaction.description,
          transaction.paymentMethod,
          JSON.stringify(transaction.tags),
          JSON.stringify(transaction.attachments)
        ]);
      }

      // 6. Recalculate balances
      await this.recalculateAllBalances(bankId, year);

      // 7. Commit changes
      await DatabaseService.commitTransaction();
      await DatabaseService.saveToIndexedDB();

      // 8. Force reload to refresh app state
      window.location.reload();

      return true;
    } catch (error) {
      await DatabaseService.rollbackTransaction();
      throw error;
    }
  }

  static processAccountsForBackup(accounts) {
    return accounts.map(account => ({
      ...account,
      initialBalance: Number(account.initialBalance),
      currentBalance: Number(account.currentBalance),
      metadata: {
        isDefault: account.isDefault,
        created: account.createdAt,
        updated: account.updatedAt
      }
    }));
  }

  static processCategoriesForBackup(categories) {
    return categories.map(category => ({
      ...category,
      metadata: {
        isDefault: category.isDefault,
        created: category.createdAt,
        updated: category.updatedAt
      }
    }));
  }

  static processTransactionsForBackup(transactions) {
    return transactions.map(transaction => ({
      ...transaction,
      amount: Number(transaction.amount),
      metadata: {
        created: transaction.createdAt,
        updated: transaction.updatedAt,
        tags: transaction.tags ? JSON.parse(transaction.tags) : [],
        attachments: transaction.attachments ? JSON.parse(transaction.attachments) : []
      }
    }));
  }

  static async restoreAccounts(accounts, bankId, year) {
    const accountMap = new Map();
    
    for (const account of accounts) {
      const accountData = {
        ...account,
        bankId,
        year,
        initialBalance: 0, // Will be recalculated
        currentBalance: 0  // Will be recalculated
      };

      const newId = await DatabaseService.addAccount(bankId, year, accountData);
      accountMap.set(account.accountId, newId);
    }

    return accountMap;
  }

  static async restoreCategories(categories, bankId, year) {
    for (const category of categories) {
      const categoryData = {
        ...category,
        bankId,
        year
      };
      await DatabaseService.addCategory(bankId, year, categoryData);
    }
  }

  static async restoreTransactions(transactions, accountMap, bankId, year) {
    try {
      // Sort transactions by date to maintain proper order
      const sortedTransactions = transactions.sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      );

      // Begin a transaction for batch inserts
      await DatabaseService.db.exec('BEGIN TRANSACTION');

      try {
        // Process transactions in chunks
        for (let i = 0; i < sortedTransactions.length; i += this.CONFIG.chunkSize) {
          const chunk = sortedTransactions.slice(i, i + this.CONFIG.chunkSize);
          
          for (const transaction of chunk) {
            const newAccountId = accountMap.get(transaction.accountId);
            const newToAccountId = transaction.toAccountId ? accountMap.get(transaction.toAccountId) : null;

            // Direct SQL insert to bypass all validations
            await DatabaseService.db.exec(`
              INSERT INTO transactions_${bankId}_${year} (
                transaction_id,
                type,
                amount,
                date,
                account_id,
                to_account_id,
                category_id,
                description,
                payment_method,
                tags,
                attachments,
                created_at,
                updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              transaction.transactionId,
              transaction.type,
              Number(transaction.amount),
              transaction.date,
              newAccountId,
              newToAccountId,
              transaction.categoryId,
              transaction.description || '',
              transaction.paymentMethod || 'cash',
              JSON.stringify(transaction.tags || []),
              JSON.stringify(transaction.attachments || []),
              transaction.createdAt || new Date().toISOString(),
              transaction.updatedAt || new Date().toISOString()
            ]);
          }
        }

        // Commit the transaction
        await DatabaseService.db.exec('COMMIT');
      } catch (error) {
        // Rollback on error
        await DatabaseService.db.exec('ROLLBACK');
        throw error;
      }

      // After all transactions are inserted, update account balances
      await this.recalculateAllBalances(bankId, year);

    } catch (error) {
      console.error('Failed to restore transactions:', error);
      throw new Error(`Failed to restore transactions: ${error.message}`);
    }
  }

  static generateBackupFileName(format) {
    const timestamp = dayjs().format('YYYY-MM-DD_HH-mm');
    return `ExpenseGo_Backup_${timestamp}.${this.BACKUP_FORMATS[format].extension}`;
  }

  static async parseBackupData(file, content) {
    const isEncrypted = file.name.endsWith(this.BACKUP_FORMATS.ENCRYPTED.extension);
    
    try {
      if (isEncrypted) {
        const decrypted = this.decryptData(content);
        return JSON.parse(decrypted);
      }
      return JSON.parse(content);
    } catch (error) {
      throw new Error('Invalid backup file format or corrupted data');
    }
  }

  static encryptData(data) {
    try {
      return CryptoJS.AES.encrypt(data, this.ENCRYPTION_KEY).toString();
    } catch (error) {
      throw new Error('Encryption failed');
    }
  }

  static decryptData(encryptedData) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.ENCRYPTION_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw new Error('Decryption failed - Invalid backup file or corrupted data');
    }
  }

  static async readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          const data = JSON.parse(content);
          resolve(data);
        } catch (error) {
          reject(new Error('Invalid backup file format'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read backup file'));
      reader.readAsText(file);
    });
  }

  static validateBackupData(data) {
    const requiredFields = ['version', 'timestamp', 'data'];
    const requiredDataFields = ['schema', 'accounts', 'categories', 'transactions'];
    
    return (
      requiredFields.every(field => data.hasOwnProperty(field)) &&
      requiredDataFields.every(field => data.data.hasOwnProperty(field))
    );
  }

  static async getSchema() {
    const tables = await DatabaseService.db.exec(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    
    return tables[0].values.map(([sql]) => sql);
  }

  static async downloadBackup(format = 'DEFAULT') {
    try {
      // Validate format
      if (!this.BACKUP_FORMATS[format]) {
        format = 'DEFAULT';
      }

      const { blob, fileName } = await this.createBackup(format);
      
      // Validate blob
      if (!blob || blob.size === 0) {
        throw new Error('Invalid backup data generated');
      }

      // Create and validate URL
      const url = URL.createObjectURL(blob);
      if (!url) {
        throw new Error('Failed to create download URL');
      }

      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      }, 100);
      
      return true;
    } catch (error) {
      console.error('Backup download error:', error);
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  static validateBackupDataStructure(data) {
    try {
      if (!data || typeof data !== 'object') {
        console.error('Invalid data object');
        return false;
      }

      // Check required arrays with detailed logging
      const requiredArrays = ['banks', 'accounts', 'categories', 'transactions'];
      for (const key of requiredArrays) {
        if (!Array.isArray(data[key])) {
          console.error(`Missing or invalid array: ${key}`);
          return false;
        }
      }

      // Validate each data type with detailed error logging
      const validBanks = data.banks.every(bank => {
        const isValid = bank && 
          typeof bank === 'object' &&
          typeof bank.bankId === 'number' &&
          typeof bank.name === 'string';
        if (!isValid) console.error('Invalid bank structure:', bank);
        return isValid;
      });

      const validAccounts = data.accounts.every(account => {
        const isValid = account && 
          typeof account === 'object' &&
          typeof account.accountId === 'number' &&
          typeof account.bankId === 'number' &&
          typeof account.name === 'string' &&
          typeof account.type === 'string';
        if (!isValid) console.error('Invalid account structure:', account);
        return isValid;
      });

      const validCategories = data.categories.every(category => {
        const isValid = category &&
          typeof category === 'object' &&
          typeof category.categoryId === 'number' &&
          typeof category.bankId === 'number' &&
          typeof category.name === 'string' &&
          typeof category.type === 'string';
        if (!isValid) console.error('Invalid category structure:', category);
        return isValid;
      });

      const validTransactions = data.transactions.every(transaction => {
        const isValid = transaction &&
          typeof transaction === 'object' &&
          typeof transaction.transactionId === 'number' &&
          typeof transaction.accountId === 'number' &&
          typeof transaction.type === 'string' &&
          !isNaN(Number(transaction.amount)) &&
          transaction.date;
        if (!isValid) console.error('Invalid transaction structure:', transaction);
        return isValid;
      });

      return validBanks && validAccounts && validCategories && validTransactions;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }

  static async clearExistingData(bankId, year) {
    try {
      // Get list of tables to clear
      const tables = [
        `accounts_${bankId}_${year}`,
        `categories_${bankId}_${year}`,
        `transactions_${bankId}_${year}`
      ];

      // Clear each table
      for (const table of tables) {
        await DatabaseService.db.exec(`DELETE FROM ${table}`);
        
        // Reset auto-increment if exists
        try {
          await DatabaseService.db.exec(`
            DELETE FROM sqlite_sequence WHERE name = '${table}'
          `);
        } catch (error) {
          // Ignore if sqlite_sequence doesn't exist
          console.warn(`Could not reset auto-increment for ${table}`);
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to clear existing data:', error);
      throw new Error(`Failed to clear existing data: ${error.message}`);
    }
  }

  static async recalculateAllBalances(bankId, year) {
    try {
      // Begin a transaction for balance updates
      await DatabaseService.db.exec('BEGIN TRANSACTION');

      try {
        // Get all accounts
        const accounts = await DatabaseService.db.exec(`
          SELECT account_id, initial_balance
          FROM accounts_${bankId}_${year}
        `);

        if (!accounts[0]?.values) {
          await DatabaseService.db.exec('COMMIT');
          return;
        }

        // Process each account
        for (const [accountId, initialBalance] of accounts[0].values) {
          let currentBalance = Number(initialBalance || 0);

          // Get all transactions affecting this account
          const transactions = await DatabaseService.db.exec(`
            SELECT 
              type,
              amount,
              account_id,
              to_account_id
            FROM transactions_${bankId}_${year}
            WHERE account_id = ? OR to_account_id = ?
            ORDER BY date ASC, transaction_id ASC
          `, [accountId, accountId]);

          if (transactions[0]?.values) {
            // Calculate balance based on all transaction types
            for (const [type, amount, fromAccountId, toAccountId] of transactions[0].values) {
              const transactionAmount = Number(amount);

              if (type === 'transfer') {
                if (fromAccountId === toAccountId) {
                  // Skip self-transfers
                  continue;
                }
                if (accountId === fromAccountId) {
                  // Money going out
                  currentBalance -= Math.abs(transactionAmount);
                }
                if (accountId === toAccountId) {
                  // Money coming in
                  currentBalance += Math.abs(transactionAmount);
                }
              } else {
                // Handle income/expense
                if (accountId === fromAccountId) {
                  currentBalance += type === 'income' ? 
                    Math.abs(transactionAmount) : 
                    -Math.abs(transactionAmount);
                }
              }
            }
          }

          // Update the account balance
          await DatabaseService.db.exec(`
            UPDATE accounts_${bankId}_${year}
            SET current_balance = ?,
                updated_at = datetime('now')
            WHERE account_id = ?
          `, [currentBalance, accountId]);
        }

        // Commit all balance updates
        await DatabaseService.db.exec('COMMIT');
      } catch (error) {
        await DatabaseService.db.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Failed to recalculate balances:', error);
      throw new Error(`Failed to recalculate balances: ${error.message}`);
    }
  }

  static async clearAllAppData() {
    try {
      // First, close any existing database connections
      if (DatabaseService.db) {
        await DatabaseService.db.close();
        DatabaseService.db = null;
      }

      // Clear IndexedDB completely
      try {
        const databases = await window.indexedDB.databases();
        await Promise.all(
          databases.map(({ name }) => 
            new Promise((resolve, reject) => {
              const request = window.indexedDB.deleteDatabase(name);
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
            })
          )
        );
      } catch (error) {
        console.warn('Failed to clear IndexedDB:', error);
      }

      // Clear all localStorage
      try {
        localStorage.clear();
      } catch (error) {
        console.warn('Failed to clear localStorage:', error);
      }

      // Clear all sessionStorage
      try {
        sessionStorage.clear();
      } catch (error) {
        console.warn('Failed to clear sessionStorage:', error);
      }

      // Reinitialize database
      await DatabaseService.initializeDatabase();

      // Drop all tables
      await DatabaseService.db.exec('BEGIN TRANSACTION');
      try {
        const tables = await DatabaseService.db.exec(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `);

        if (tables[0]?.values) {
          for (const [tableName] of tables[0].values) {
            await DatabaseService.db.exec(`DROP TABLE IF EXISTS ${tableName}`);
          }
        }

        await DatabaseService.db.exec('COMMIT');
      } catch (error) {
        await DatabaseService.db.exec('ROLLBACK');
        throw error;
      }

      // Reset DatabaseService state
      DatabaseService.db = null;

      return true;
    } catch (error) {
      console.error('Failed to clear app data:', error);
      throw new Error(`Failed to clear app data: ${error.message}`);
    }
  }
}

export default BackupService;