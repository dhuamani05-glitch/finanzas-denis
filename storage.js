/**
 * storage.js - Motor de almacenamiento local para Finanzas Denis
 */

const Storage = {
    KEYS: {
        TRANSACTIONS: 'fd_transactions',
        BUDGETS: 'fd_budgets',
        SETTINGS: 'fd_settings',
        CATEGORIES: 'fd_categories',
        AUTH: 'fd_auth'
    },

    DEFAULT_CATEGORIES: [
        {id:'c1',name:'Alimentacion',type:'expense',icon:'\u{1F355}'},
        {id:'c2',name:'Transporte',type:'expense',icon:'\u{1F697}'},
        {id:'c3',name:'Vivienda',type:'expense',icon:'\u{1F3E0}'},
        {id:'c4',name:'Servicios',type:'expense',icon:'\u{1F4A1}'},
        {id:'c5',name:'Salud',type:'expense',icon:'\u{1F48A}'},
        {id:'c6',name:'Educacion',type:'expense',icon:'\u{1F393}'},
        {id:'c7',name:'Entretenimiento',type:'expense',icon:'\u{1F3AC}'},
        {id:'c8',name:'Ropa',type:'expense',icon:'\u{1F454}'},
        {id:'c9',name:'Ahorro',type:'expense',icon:'\u{1F4B3}'},
        {id:'c10',name:'Otros Gastos',type:'expense',icon:'\u{1F4C4}'},
        {id:'c11',name:'Salario',type:'income',icon:'\u{1F4B0}'},
        {id:'c12',name:'Freelance',type:'income',icon:'\u{1F4BB}'},
        {id:'c13',name:'Inversiones',type:'income',icon:'\u{1F4C8}'},
        {id:'c14',name:'Ventas',type:'income',icon:'\u{1F6D2}'},
        {id:'c15',name:'Otros Ingresos',type:'income',icon:'\u{1F4B5}'}
    ],

    // ===== Categorias =====
    getCategories() {
        try {
            const cats = JSON.parse(localStorage.getItem(this.KEYS.CATEGORIES));
            return cats && cats.length > 0 ? cats : this.DEFAULT_CATEGORIES;
        } catch { return this.DEFAULT_CATEGORIES; }
    },

    saveCategories(cats) {
        localStorage.setItem(this.KEYS.CATEGORIES, JSON.stringify(cats));
    },

    addCategory(cat) {
        const cats = this.getCategories();
        cat.id = 'c' + Date.now().toString(36);
        cats.push(cat);
        this.saveCategories(cats);
        return cat;
    },

    updateCategory(id, data) {
        const cats = this.getCategories();
        const i = cats.findIndex(c => c.id === id);
        if (i !== -1) { cats[i] = { ...cats[i], ...data }; this.saveCategories(cats); }
    },

    deleteCategory(id) {
        const cats = this.getCategories().filter(c => c.id !== id);
        this.saveCategories(cats);
    },

    categoryHasTransactions(name) {
        return this.getTransactions().some(t => t.category === name);
    },

    getCategoryIcon(name) {
        const cat = this.getCategories().find(c => c.name === name);
        return cat ? cat.icon : '\u{1F4B2}';
    },

    // ===== Autenticacion =====
    getAuth() {
        try { return JSON.parse(localStorage.getItem(this.KEYS.AUTH)) || {enabled:false,pin:null,salt:null,biometric:false,securityQuestion:null,securityAnswer:null}; }
        catch { return null; }
    },

    saveAuth(data) {
        localStorage.setItem(this.KEYS.AUTH, JSON.stringify(data));
    },

    isAuthEnabled() {
        const auth = this.getAuth();
        return auth && auth.enabled && auth.pin;
    },

    async hashPin(pin) {
        const enc = new TextEncoder().encode(pin + 'fd_salt_2024');
        const hash = await crypto.subtle.digest('SHA-256', enc);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    async verifyPin(pin) {
        const auth = this.getAuth();
        if (!auth || !auth.pin) return false;
        const hashed = await this.hashPin(pin);
        return hashed === auth.pin;
    },

    verifySecurityAnswer(answer) {
        const auth = this.getAuth();
        if (!auth || !auth.securityAnswer) return false;
        return auth.securityAnswer.toLowerCase().trim() === answer.toLowerCase().trim();
    },

    // ===== Transacciones =====
    getTransactions() {
        try { return JSON.parse(localStorage.getItem(this.KEYS.TRANSACTIONS)) || []; }
        catch { return []; }
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
        this.saveTransactions(this.getTransactions().filter(t => t.id !== id));
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
        try { return JSON.parse(localStorage.getItem(this.KEYS.BUDGETS)) || []; }
        catch { return []; }
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
        if (index !== -1) { budgets[index] = { ...budgets[index], ...data }; this.saveBudgets(budgets); }
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

    clearAll() {
        localStorage.removeItem(this.KEYS.TRANSACTIONS);
        localStorage.removeItem(this.KEYS.BUDGETS);
    }
};
