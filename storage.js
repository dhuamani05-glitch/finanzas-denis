/**
 * storage.js - Motor de almacenamiento local para Finanzas Denis
 * Usa localStorage para persistir datos en el dispositivo
 */

const Storage = {
    KEYS: {
        TRANSACTIONS: 'fd_transactions',
        BUDGETS: 'fd_budgets',
        SETTINGS: 'fd_settings'
    },

    // ===== Transacciones =====
    getTransactions() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.TRANSACTIONS)) || [];
        } catch {
            return [];
        }
    },

    saveTransactions(transactions) {
        localStorage.setItem(this.KEYS.TRANSACTIONS, JSON.stringify(transactions));
    },

    addTransaction(transaction) {
        const transactions = this.getTransactions();
        transaction.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        transaction.createdAt = new Date().toISOString();
        transactions.unshift(transaction);
        this.saveTransactions(transactions);
        return transaction;
    },

    updateTransaction(id, data) {
        const transactions = this.getTransactions();
        const index = transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            transactions[index] = { ...transactions[index], ...data };
            this.saveTransactions(transactions);
        }
    },

    deleteTransaction(id) {
        const transactions = this.getTransactions().filter(t => t.id !== id);
        this.saveTransactions(transactions);
    },

    getTransactionsByMonth(year, month) {
        return this.getTransactions().filter(t => {
            const d = new Date(t.date + 'T12:00:00');
            return d.getFullYear() === year && d.getMonth() === month;
        });
    },

    // ===== Totales =====
    getMonthlyTotals(year, month) {
        const transactions = this.getTransactionsByMonth(year, month);
        const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        return { income, expense, balance: income - expense };
    },

    getCategoryTotals(year, month, type) {
        const transactions = this.getTransactionsByMonth(year, month).filter(t => t.type === type);
        const totals = {};
        transactions.forEach(t => { totals[t.category] = (totals[t.category] || 0) + t.amount; });
        return totals;
    },

    // ===== Presupuestos =====
    getBudgets() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.BUDGETS)) || [];
        } catch {
            return [];
        }
    },

    saveBudgets(budgets) {
        localStorage.setItem(this.KEYS.BUDGETS, JSON.stringify(budgets));
    },

    addBudget(budget) {
        const budgets = this.getBudgets();
        budget.id = Date.now().toString(36);
        budgets.push(budget);
        this.saveBudgets(budgets);
    },

    updateBudget(id, data) {
        const budgets = this.getBudgets();
        const index = budgets.findIndex(b => b.id === id);
        if (index !== -1) {
            budgets[index] = { ...budgets[index], ...data };
            this.saveBudgets(budgets);
        }
    },

    deleteBudget(id) {
        this.saveBudgets(this.getBudgets().filter(b => b.id !== id));
    },

    getBudgetStatus(year, month) {
        const budgets = this.getBudgets();
        const catTotals = this.getCategoryTotals(year, month, 'expense');
        return budgets.map(b => {
            const spent = catTotals[b.category] || 0;
            const percentage = Math.min((spent / b.amount) * 100, 150);
            let status = 'safe';
            if (percentage >= 100) status = 'danger';
            else if (percentage >= 80) status = 'warning';
            return { ...b, spent, percentage, status };
        });
    },

    // ===== Configuracion =====
    getSettings() {
        return JSON.parse(localStorage.getItem(this.KEYS.SETTINGS)) || { currency: 'S/. ', theme: 'dark' };
    },

    saveSetting(key, value) {
        const settings = this.getSettings();
        settings[key] = value;
        localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
    },

    // ===== Tendencia 6 meses =====
    getLast6MonthsTrend() {
        const months = [];
        const now = new Date();
        const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const totals = this.getMonthlyTotals(d.getFullYear(), d.getMonth());
            months.push({ label: MONTH_NAMES[d.getMonth()], ...totals });
        }
        return months;
    },

    // ===== Export CSV =====
    exportToCSV() {
        const transactions = this.getTransactions();
        if (transactions.length === 0) return null;
        const header = 'Fecha,Tipo,Categoria,Monto,Descripcion';
        const rows = transactions.map(t =>
            `${t.date},${t.type === 'income' ? 'Ingreso' : 'Gasto'},${t.category},${t.amount},"${(t.description || '').replace(/"/g, '""')}"`
        );
        return header + '\n' + rows.join('\n');
    },

    // ===== Clear =====
    clearAll() {
        localStorage.removeItem(this.KEYS.TRANSACTIONS);
        localStorage.removeItem(this.KEYS.BUDGETS);
    }
};
