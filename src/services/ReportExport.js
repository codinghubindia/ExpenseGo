import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';

class ReportExport {
  static FORMATS = {
    PDF: 'pdf',
    EXCEL: 'xlsx',
    CSV: 'csv'
  };

  static async exportTransactions(transactions, accounts, categories, format, currency) {
    const formattedData = transactions.map(transaction => ({
      date: dayjs(transaction.date).format('YYYY-MM-DD'),
      type: transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1),
      description: transaction.description,
      amount: this.formatAmount(transaction.amount, currency),
      account: accounts.find(a => a.accountId === transaction.accountId)?.name || '',
      category: categories.find(c => c.categoryId === transaction.categoryId)?.name || '',
      paymentMethod: transaction.paymentMethod,
      location: transaction.location || ''
    }));

    switch (format) {
      case this.FORMATS.PDF:
        return this.exportToPDF(formattedData, currency);
      case this.FORMATS.EXCEL:
        return this.exportToExcel(formattedData);
      case this.FORMATS.CSV:
        return this.exportToCSV(formattedData);
      default:
        throw new Error('Unsupported export format');
    }
  }

  static formatAmount(amount, currency) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: 2
    }).format(Math.abs(amount));
  }

  static exportToPDF(data, currency) {
    const doc = new jsPDF();
    
    // Add header
    doc.setFontSize(20);
    doc.text('Transaction Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on ${dayjs().format('YYYY-MM-DD HH:mm')}`, 14, 22);
    
    // Add table
    doc.autoTable({
      head: [['Date', 'Type', 'Description', 'Amount', 'Account', 'Category', 'Payment', 'Location']],
      body: data.map(row => [
        row.date,
        row.type,
        row.description,
        row.amount,
        row.account,
        row.category,
        row.paymentMethod,
        row.location
      ]),
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 66, 66] }
    });

    // Save PDF
    doc.save(`Transactions_${dayjs().format('YYYY-MM-DD')}.pdf`);
  }

  static exportToExcel(data) {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(
      new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `Transactions_${dayjs().format('YYYY-MM-DD')}.xlsx`
    );
  }

  static exportToCSV(data) {
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    saveAs(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      `Transactions_${dayjs().format('YYYY-MM-DD')}.csv`
    );
  }
}

export default ReportExport;