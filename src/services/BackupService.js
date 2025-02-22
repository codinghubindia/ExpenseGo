import DatabaseService from './DatabaseService';
import dayjs from 'dayjs';
import CryptoJS from 'crypto-js';

class BackupService {
  static ENCRYPTION_KEY = 'ExpenseGo-Secure-Key-2024';
  
  static BACKUP_FORMATS = {
    DEFAULT: {
      extension: 'egbackup',
      mime: 'application/octet-stream',
      description: 'ExpenseGo Backup'
    },
    ENCRYPTED: {
      extension: 'egsecure',
      mime: 'application/octet-stream',
      description: 'ExpenseGo Encrypted Backup'
    },
    PORTABLE: {
      extension: 'egexport',
      mime: 'application/json',
      description: 'ExpenseGo Portable Export'
    }
  };

  static PRODUCTION_CONFIG = {
    maxBackupSize: 10 * 1024 * 1024, // 10MB
    compressionLevel: 9,
    maxRetries: 3
  };

  static async createBackup(format = 'DEFAULT', retryCount = this.PRODUCTION_CONFIG.maxRetries) {
    try {
      const backup = await this.prepareBackup();
      const backupString = JSON.stringify(backup);
      
      let processedData;
      let fileExtension;
      
      // Validate format
      if (!this.BACKUP_FORMATS[format]) {
        format = 'DEFAULT'; // Fallback to DEFAULT if invalid format provided
      }
      
      if (format === 'ENCRYPTED') {
        processedData = this.encryptData(backupString);
        fileExtension = this.BACKUP_FORMATS.ENCRYPTED.extension;
      } else {
        processedData = backupString;
        fileExtension = this.BACKUP_FORMATS[format].extension;
      }

      const blob = new Blob([processedData], {
        type: this.BACKUP_FORMATS[format].mime
      });
      
      if (blob.size > this.PRODUCTION_CONFIG.maxBackupSize) {
        throw new Error('Backup size exceeds limit');
      }

      const timestamp = dayjs().format('YYYY-MM-DD_HH-mm');
      const fileName = `ExpenseGo_Backup_${timestamp}.${fileExtension}`;

      return {
        blob,
        fileName,
        format
      };
    } catch (error) {
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.createBackup(format, retryCount - 1);
      }
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  static async restoreBackup(file, retryCount = this.PRODUCTION_CONFIG.maxRetries) {
    try {
      const fileContent = await this.readFileContent(file);
      let backupData;

      const isEncrypted = file.name.endsWith(this.BACKUP_FORMATS.ENCRYPTED.extension);

      try {
        if (isEncrypted) {
          const decryptedData = this.decryptData(fileContent);
          backupData = JSON.parse(decryptedData);
        } else {
          backupData = JSON.parse(fileContent);
        }
      } catch (error) {
        throw new Error('Invalid backup file format or corrupted data');
      }

      if (!this.validateBackupData(backupData)) {
        throw new Error('Invalid backup data structure');
      }

      await this.restoreData(backupData);

      return true;
    } catch (error) {
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.restoreBackup(file, retryCount - 1);
      }
      throw new Error(`Restore failed: ${error.message}`);
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
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('File reading failed'));
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

  static async restoreData(backupData) {
      await DatabaseService.initializeDatabase();
    await DatabaseService.beginTransaction();
      
    try {
      const year = new Date().getFullYear();
      const bankId = 1; // Default bank ID

      // Drop existing tables and create fresh ones
      const bankTables = await DatabaseService.db.exec(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND 
        (name LIKE 'accounts_${bankId}_%' OR 
         name LIKE 'categories_${bankId}_%' OR 
         name LIKE 'transactions_${bankId}_%')
      `);

      if (bankTables[0]?.values) {
        for (const [tableName] of bankTables[0].values) {
          await DatabaseService.db.exec(`DROP TABLE IF EXISTS "${tableName}"`);
        }
      }

      await DatabaseService.createBankYearTables(bankId, year);

      // Create a map to store account ID mappings and initial balances
      const accountIdMap = new Map();
      const accountBalances = new Map();

      // First pass: Create/Update accounts with zero balance
      for (const account of backupData.data.accounts) {
        const existingAccount = await DatabaseService.db.exec(`
          SELECT account_id, is_default 
          FROM accounts_${bankId}_${year}
            WHERE name = ?
          `, [account.name]);

        if (existingAccount[0]?.values?.length > 0) {
          const [existingId, isDefault] = existingAccount[0].values[0];
          accountIdMap.set(account.accountId, existingId);
          
          if (!isDefault) {
            // Set initial balance to 0, we'll update it after processing transactions
            await DatabaseService.db.exec(`
              UPDATE accounts_${bankId}_${year}
              SET current_balance = 0,
                  initial_balance = 0,
                  type = ?,
                  currency = ?,
                  color_code = ?,
                  icon = ?,
                  notes = ?
              WHERE account_id = ?
            `, [
              account.type,
              account.currency,
              account.colorCode || account.color,
              account.icon,
              account.notes,
              existingId
            ]);
          }
          accountBalances.set(existingId, 0);
        } else {
          const accountData = {
            ...account,
            bankId: bankId,
            year: year,
            initialBalance: 0,
            currentBalance: 0
          };
          const newId = await DatabaseService.addAccount(bankId, year, accountData);
          accountIdMap.set(account.accountId, newId);
          accountBalances.set(newId, 0);
        }
      }

      // Restore categories
      for (const category of backupData.data.categories) {
        const categoryData = {
          ...category,
          bankId: bankId,
          year: year
        };
        await DatabaseService.addCategory(bankId, year, categoryData);
      }

      // Restore transactions and update balances
      for (const transaction of backupData.data.transactions) {
        const newAccountId = accountIdMap.get(transaction.accountId);
        const newToAccountId = transaction.toAccountId ? accountIdMap.get(transaction.toAccountId) : null;

        const transactionData = {
          ...transaction,
          bankId: bankId,
          year: year,
          accountId: newAccountId,
          toAccountId: newToAccountId
        };

        // Update balances based on transaction type
        const amount = Number(transaction.amount);
        if (transaction.type === 'expense') {
          accountBalances.set(newAccountId, accountBalances.get(newAccountId) - Math.abs(amount));
        } else if (transaction.type === 'income') {
          accountBalances.set(newAccountId, accountBalances.get(newAccountId) + Math.abs(amount));
        } else if (transaction.type === 'transfer' && newToAccountId) {
          accountBalances.set(newAccountId, accountBalances.get(newAccountId) - Math.abs(amount));
          accountBalances.set(newToAccountId, accountBalances.get(newToAccountId) + Math.abs(amount));
        }

        await DatabaseService.db.exec(`
          INSERT INTO transactions_${bankId}_${year} (
            transaction_id, type, amount, date, account_id, to_account_id, category_id,
            description, payment_method, location, notes, tags, attachments,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          transactionData.transactionId,
          transactionData.type,
          amount,
          transactionData.date,
          newAccountId,
          newToAccountId,
          transactionData.categoryId,
          transactionData.description || '',
          transactionData.paymentMethod || 'cash',
          transactionData.location || '',
          transactionData.notes || '',
          JSON.stringify(transactionData.tags || []),
          JSON.stringify(transactionData.attachments || []),
          transactionData.createdAt || new Date().toISOString(),
          transactionData.updatedAt || new Date().toISOString()
        ]);
      }

      // Finally, update account balances
      for (const [accountId, balance] of accountBalances) {
        await DatabaseService.db.exec(`
          UPDATE accounts_${bankId}_${year}
          SET current_balance = ?
          WHERE account_id = ?
        `, [balance, accountId]);
      }

      await DatabaseService.commitTransaction();
      await DatabaseService.saveToIndexedDB();
    } catch (error) {
      await DatabaseService.rollbackTransaction();
      throw error;
    }
  }

  static async getSchema() {
    const tables = await DatabaseService.db.exec(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    
    return tables[0].values.map(([sql]) => sql);
  }

  static async prepareBackup() {
    const bankId = 1; // TODO: Get from context
    const year = new Date().getFullYear();

    const [accounts, categories, transactions] = await Promise.all([
      DatabaseService.getAccounts(bankId, year),
      DatabaseService.getCategories(bankId, year),
      DatabaseService.getTransactions(bankId, year)
    ]);

    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        schema: await this.getSchema(),
        accounts,
        categories,
        transactions
      }
    };
  }

  static async downloadBackup(format = 'DEFAULT') {
    try {
      // Validate format
      if (!this.BACKUP_FORMATS[format]) {
        format = 'DEFAULT';
      }

      const { blob, fileName } = await this.createBackup(format);
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      throw new Error(`Download failed: ${error.message}`);
    }
  }
}

export default BackupService;