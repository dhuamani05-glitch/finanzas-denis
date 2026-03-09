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
        transaction.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        transaction.createdAt = new Date().toISOString();
        transactions.unshift(transaction);
        this.saveTransactions(transactions);
        return transaction;
    },

    updateTransaction(id, updates) {
        const transactions = this.getTransactions();
        const idx = transactions.findIndex(t => t.id === id);
        if (idx !== -1) {
            transactions[idx] = { ...transactions[idx], ...updates };
            this.saveTransactions(transactions);
            return transactions[idx];
        }
        return null;
    },

    deleteTransaction(id) {
        const transactions = this.getTransactions().filter(t => t.id !== id);
        this.saveTransactions(transactions);
    },

    getTransactionsByMonth(year, month) {
        return this.getTransactions().filter(t => {
            const d = new Date(t.date);
            return d.getFullYear() === year && d.getMonth() === month;
        });
    },

    getMonthlyTotals(year, month) {
        const transactions = this.getTransactionsByMonth(year, month);
        let income = 0, expense = 0;
        transactions.forEach(t => {
            if (t.type === 'income') income += Number(t.amount);
            else expense += Number(t.amount);
        });
        return { income, expense, balance: income - expense };
    },

    getCategoryTotals(year, month, type = 'expense') {
        const transactions = this.getTransactionsByMonth(year, month)
            .filter(t => t.type === type);
        const totals = {};
        transactions.forEach(t => {
            totals[t.category] = (totals[t.category] || 0) + Number(t.amount);
        });
        return totals;
    },

    getLast6MonthsTrend() {
        const months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const totals = this.getMonthlyTotals(d.getFullYear(), d.getMonth());
            months.push({
                label: d.toLocaleDateString('es', { month: 'short' }),
                year: d.getFullYear(),
                month: d.getMonth(),
                ...totals
            });
        }
        return months;
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
        budget.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        budgets.push(budget);
        this.saveBudgets(budgets);
        return budget;
    },

    updateBudget(id, updates) {
        const budgets = this.getBudgets();
        const idx = budgets.findIndex(b => b.id === id);
        if (idx !== -1) {
            budgets[idx] = { ...budgets[idx], ...updates };
            this.saveBudgets(budgets);
            return budgets[idx];
        }
        return null;
    },

    deleteBudget(id) {
        const budgets = this.getBudgets().filter(b => b.id !== id);
        this.saveBudgets(budgets);
    },

    getBudgetStatus(year, month) {
        const budgets = this.getBudgets();
        const catTotals = this.getCategoryTotals(year, month, 'expense');
        return budgets.map(b => {
            const spent = catTotals[b.category] || 0;
            const percentage = b.amount > 0 ? (spent / b.amount) * 100 : 0;
            return {
                ...b,
                spent,
                remaining: b.amount - spent,
                percentage: Math.min(percentage, 100),
                status: percentage >= 100 ? 'danger' : percentage >= 75 ? 'warning' : 'safe'
            };
        });
    },

    // ===== Configuracion =====
    getSettings() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.SETTINGS)) || { currency: '$' };
        } catch {
            return { currency: '$' };
        }
    },

    saveSetting(key, value) {
        const settings = this.getSettings();
        settings[key] = value;
        localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
    },

    // ===== Utilidades =====
    clearAll() {
        localStorage.removeItem(this.KEYS.TRANSACTIONS);
        localStorage.removeItem(this.KEYS.BUDGETS);
    },

    exportToCSV() {
        const transactions = this.getTransactions();
        if (transactions.length === 0) return null;

        const headers = ['Fecha', 'Tipo', 'Categoria', 'Monto', 'Descripcion'];
        const rows = transactions.map(t => [
            t.date,
            t.type === 'income' ? 'Ingreso' : 'Gasto',
            t.category,
            t.amount,
            t.description || ''
        ]);

        const csv = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        return csv;
    }
};
