import DatabaseService from './DatabaseService';
import dayjs from 'dayjs';

class BackupService {
  // Define backup formats and extensions
  static BACKUP_FORMATS = {
    DEFAULT: {
      extension: 'backup',
      mime: 'application/octet-stream',
      description: 'ExpenseGo Backup'
    },
    ENCRYPTED: {
      extension: 'secure',
      mime: 'application/octet-stream',
      description: 'ExpenseGo Encrypted Backup'
    },
    PORTABLE: {
      extension: 'export',
      mime: 'application/json',
      description: 'ExpenseGo Portable Export'
    }
  };

  static async createBackup(format = 'DEFAULT') {
    try {
      const bankId = 1; // TODO: Get from context
      const year = new Date().getFullYear();

      // Get all data
      const [
        accounts,
        categories,
        transactions
      ] = await Promise.all([
        DatabaseService.getAccounts(bankId, year),
        DatabaseService.getCategories(bankId, year),
        DatabaseService.getTransactions(bankId, year)
      ]);

      // Create backup object
      const backup = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        format: format,
        data: {
          schema: await this.getSchema(),
          accounts,
          categories,
          transactions
        }
      };

      const formatConfig = this.BACKUP_FORMATS[format] || this.BACKUP_FORMATS.DEFAULT;
      const blob = new Blob(
        [JSON.stringify(backup, null, 2)], 
        { type: formatConfig.mime }
      );
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ExpenseGo_${dayjs().format('YYYY-MM-DD')}.${formatConfig.extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error('Backup creation failed:', error);
      throw error;
    }
  }

  static async restoreBackup(file) {
    try {
      const backup = await this.readBackupFile(file);
      
      if (!this.validateBackup(backup)) {
        throw new Error('Invalid backup file');
      }

      await DatabaseService.initializeDatabase();
      
      const bankId = 1;
      const year = new Date().getFullYear();

      await DatabaseService.createBankYearTables(bankId, year);

      // Restore accounts with duplicate checking
      if (backup.data.accounts && Array.isArray(backup.data.accounts)) {
        for (const account of backup.data.accounts) {
          // Check if account already exists
          const exists = await DatabaseService.db.exec(`
            SELECT account_id FROM accounts_${bankId}_${year}
            WHERE name = ?
          `, [account.name]);

          if (!exists[0]?.values?.length) {
            await DatabaseService.addAccount(bankId, year, {
              ...account,
              is_default: account.isDefault || 0
            });
          }
        }
      }

      // Ensure default accounts exist
      await DatabaseService.createDefaultAccounts(bankId, year);

      // Rest of restoration process
      if (backup.data.categories && Array.isArray(backup.data.categories)) {
        for (const category of backup.data.categories) {
          await DatabaseService.addCategory(bankId, year, category);
        }
      }

      if (backup.data.transactions && Array.isArray(backup.data.transactions)) {
        for (const transaction of backup.data.transactions) {
          await DatabaseService.addTransaction(bankId, year, transaction);
        }
      }

      // Save all changes to IndexedDB
      await DatabaseService.saveToIndexedDB();

      return true;
    } catch (error) {
      console.error('Restore failed:', error);
      throw error;
    }
  }

  static async readBackupFile(file) {
    // Validate file extension
    const extension = file.name.split('.').pop().toLowerCase();
    const isValidExtension = Object.values(this.BACKUP_FORMATS)
      .some(format => format.extension === extension);

    if (!isValidExtension) {
      throw new Error('Invalid backup file type');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const backup = JSON.parse(e.target.result);
          resolve(backup);
        } catch (error) {
          reject(new Error('Invalid backup file format'));
        }
      };
      reader.onerror = () => reject(new Error('Error reading backup file'));
      reader.readAsText(file);
    });
  }

  static validateBackup(backup) {
    // Check version and required fields
    if (!backup.version || !backup.timestamp || !backup.data) {
      return false;
    }

    // Validate format if present
    if (backup.format && !this.BACKUP_FORMATS[backup.format]) {
      return false;
    }

    // Check required data structures
    if (!backup.data.accounts || !backup.data.categories || !backup.data.transactions) {
      return false;
    }

    return true;
  }

  static async getSchema() {
    // Get current database schema
    const tables = await DatabaseService.db.exec(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    
    return tables[0].values.map(([sql]) => sql);
  }
}

export default BackupService;