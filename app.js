/**
 * app.js - Logica principal de Finanzas Denis
 */

const App = {
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    currentFilter: 'all',
    editingTransactionId: null,

    // Nombres de meses en espanol
    MONTHS: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
             'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],

    // Iconos por categoria
    CATEGORY_ICONS: {
        'Alimentacion': '&#127829;',
        'Transporte': '&#128663;',
        'Vivienda': '&#127968;',
        'Servicios': '&#128161;',
        'Salud': '&#128138;',
        'Educacion': '&#127891;',
        'Entretenimiento': '&#127916;',
        'Ropa': '&#128084;',
        'Ahorro': '&#128179;',
        'Otros Gastos': '&#128196;',
        'Salario': '&#128176;',
        'Freelance': '&#128187;',
        'Inversiones': '&#128200;',
        'Ventas': '&#128722;',
        'Otros Ingresos': '&#128181;'
    },

    init() {
        this.bindEvents();
        this.loadSettings();
        this.render();

        // Hide splash after load
        setTimeout(() => {
            const splash = document.getElementById('splash');
            splash.classList.add('fade-out');
            document.getElementById('app').classList.remove('hidden');
            setTimeout(() => splash.remove(), 400);
        }, 800);
    },

    // ===== Event Binding =====
    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => this.navigateTo(btn.dataset.page));
        });

        // Month navigation
        document.getElementById('btn-prev-month').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('btn-next-month').addEventListener('click', () => this.changeMonth(1));

        // FAB
        document.getElementById('fab-add').addEventListener('click', () => this.openTransactionModal());

        // See all transactions
        document.getElementById('btn-see-all').addEventListener('click', () => this.navigateTo('transactions'));

        // Transaction form
        document.getElementById('form-transaction').addEventListener('submit', (e) => this.handleTransactionSubmit(e));

        // Type toggle
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => this.toggleTransactionType(btn));
        });

        // Budget
        document.getElementById('btn-add-budget').addEventListener('click', () => this.openBudgetModal());
        document.getElementById('form-budget').addEventListener('submit', (e) => this.handleBudgetSubmit(e));

        // Filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => this.filterTransactions(tab.dataset.filter));
        });

        // Export CSV
        document.getElementById('btn-export-csv').addEventListener('click', () => this.exportCSV());

        // Theme toggle button
        document.getElementById('btn-toggle-theme').addEventListener('click', () => this.toggleTheme());

        // Settings
        document.getElementById('btn-settings').addEventListener('click', () => this.openModal('modal-settings'));
        document.getElementById('setting-currency').addEventListener('change', (e) => {
            Storage.saveSetting('currency', e.target.value);
            this.render();
        });
        document.getElementById('setting-theme').addEventListener('change', (e) => {
            Storage.saveSetting('theme', e.target.value);
            this.applyTheme(e.target.value);
        });
        document.getElementById('btn-clear-data').addEventListener('click', () => this.clearAllData());

        // Modal close handlers
        document.querySelectorAll('.modal-overlay, .btn-close-modal, .btn-cancel-modal').forEach(el => {
            el.addEventListener('click', () => this.closeAllModals());
        });
    },

    // ===== Navigation =====
    navigateTo(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`page-${page}`).classList.add('active');

        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');

        const titles = { dashboard: 'Dashboard', transactions: 'Movimientos', budgets: 'Presupuestos', reports: 'Reportes' };
        document.getElementById('header-title').textContent = titles[page] || 'Dashboard';

        if (page === 'transactions') this.renderAllTransactions();
        if (page === 'budgets') this.renderBudgets();
        if (page === 'reports') this.renderReports();
    },

    // ===== Month Navigation =====
    changeMonth(delta) {
        this.currentMonth += delta;
        if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
        if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
        this.render();
    },

    // ===== Render =====
    render() {
        const currency = Storage.getSettings().currency;
        const totals = Storage.getMonthlyTotals(this.currentYear, this.currentMonth);

        // Update month label
        document.getElementById('current-month-label').textContent =
            `${this.MONTHS[this.currentMonth]} ${this.currentYear}`;

        // Update balance card
        document.getElementById('balance-total').textContent = this.formatMoney(totals.balance, currency);
        document.getElementById('total-income').textContent = this.formatMoney(totals.income, currency);
        document.getElementById('total-expense').textContent = this.formatMoney(totals.expense, currency);

        // Color balance
        const balanceEl = document.getElementById('balance-total');
        balanceEl.style.color = totals.balance >= 0 ? 'var(--income)' : 'var(--expense)';

        // Render recent transactions
        this.renderRecentTransactions();

        // Render budget alerts
        this.renderBudgetAlerts();

        // Render charts
        if (typeof Charts !== 'undefined') {
            Charts.renderCategoryChart(this.currentYear, this.currentMonth);
            Charts.renderIncomeCategoryChart(this.currentYear, this.currentMonth);
            Charts.renderTrendChart();
        }
    },

    renderRecentTransactions() {
        const container = document.getElementById('recent-transactions');
        const transactions = Storage.getTransactionsByMonth(this.currentYear, this.currentMonth).slice(0, 5);

        if (transactions.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay transacciones este mes</p>';
            return;
        }

        container.innerHTML = transactions.map(t => this.createTransactionHTML(t)).join('');
        this.bindTransactionActions(container);
    },

    renderAllTransactions() {
        const container = document.getElementById('all-transactions');
        let transactions = Storage.getTransactionsByMonth(this.currentYear, this.currentMonth);

        if (this.currentFilter !== 'all') {
            transactions = transactions.filter(t => t.type === this.currentFilter);
        }

        if (transactions.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay transacciones</p>';
            return;
        }

        container.innerHTML = transactions.map(t => this.createTransactionHTML(t, true)).join('');
        this.bindTransactionActions(container);
    },

    createTransactionHTML(t, showActions = false) {
        const currency = Storage.getSettings().currency;
        const icon = this.CATEGORY_ICONS[t.category] || '&#128178;';
        const date = new Date(t.date + 'T12:00:00');
        const dateStr = date.toLocaleDateString('es', { day: 'numeric', month: 'short' });
        const sign = t.type === 'income' ? '+' : '-';

        return `
        <div class="transaction-item" data-id="${t.id}">
            <div class="trans-icon ${t.type}">${icon}</div>
            <div class="trans-info">
                <div class="category">${t.category}</div>
                <div class="description">${t.description || ''}</div>
            </div>
            <div class="trans-right">
                <div class="trans-amount ${t.type}">${sign}${this.formatMoney(t.amount, currency)}</div>
                <div class="trans-date">${dateStr}</div>
            </div>
            ${showActions ? `
            <button class="btn-icon btn-edit-trans" data-id="${t.id}" aria-label="Editar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon btn-delete-trans" data-id="${t.id}" aria-label="Eliminar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--expense)" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
            ` : ''}
        </div>`;
    },

    bindTransactionActions(container) {
        container.querySelectorAll('.btn-edit-trans').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editTransaction(btn.dataset.id);
            });
        });

        container.querySelectorAll('.btn-delete-trans').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteTransaction(btn.dataset.id);
            });
        });
    },

    // ===== Transaction Modal =====
    openTransactionModal(transaction = null) {
        this.editingTransactionId = transaction ? transaction.id : null;
        const form = document.getElementById('form-transaction');
        form.reset();

        document.getElementById('modal-trans-title').textContent =
            transaction ? 'Editar Transaccion' : 'Nueva Transaccion';

        if (transaction) {
            document.getElementById('trans-id').value = transaction.id;
            document.getElementById('trans-type').value = transaction.type;
            document.getElementById('trans-amount').value = transaction.amount;
            document.getElementById('trans-category').value = transaction.category;
            document.getElementById('trans-date').value = transaction.date;
            document.getElementById('trans-description').value = transaction.description || '';

            document.querySelectorAll('.toggle-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.type === transaction.type);
            });
            this.updateCategoryVisibility(transaction.type);
        } else {
            document.getElementById('trans-date').value = new Date().toISOString().split('T')[0];
            this.updateCategoryVisibility('expense');
        }

        this.openModal('modal-transaction');
    },

    toggleTransactionType(btn) {
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('trans-type').value = btn.dataset.type;
        this.updateCategoryVisibility(btn.dataset.type);
    },

    updateCategoryVisibility(type) {
        const select = document.getElementById('trans-category');
        const expenseGroup = document.getElementById('expense-categories');
        const incomeGroup = document.getElementById('income-categories');

        if (type === 'income') {
            expenseGroup.style.display = 'none';
            incomeGroup.style.display = 'block';
            select.value = 'Salario';
        } else {
            expenseGroup.style.display = 'block';
            incomeGroup.style.display = 'none';
            select.value = 'Alimentacion';
        }
    },

    handleTransactionSubmit(e) {
        e.preventDefault();

        const data = {
            type: document.getElementById('trans-type').value,
            amount: parseFloat(document.getElementById('trans-amount').value),
            category: document.getElementById('trans-category').value,
            date: document.getElementById('trans-date').value,
            description: document.getElementById('trans-description').value.trim()
        };

        if (this.editingTransactionId) {
            Storage.updateTransaction(this.editingTransactionId, data);
            this.showToast('Transaccion actualizada', 'success');
        } else {
            Storage.addTransaction(data);
            this.showToast('Transaccion guardada', 'success');
        }

        this.closeAllModals();
        this.render();
        this.renderAllTransactions();
    },

    editTransaction(id) {
        const transactions = Storage.getTransactions();
        const t = transactions.find(t => t.id === id);
        if (t) this.openTransactionModal(t);
    },

    deleteTransaction(id) {
        if (confirm('Eliminar esta transaccion?')) {
            Storage.deleteTransaction(id);
            this.showToast('Transaccion eliminada', 'success');
            this.render();
            this.renderAllTransactions();
        }
    },

    // ===== Filter =====
    filterTransactions(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.filter-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.filter === filter);
        });
        this.renderAllTransactions();
    },

    // ===== Budgets =====
    openBudgetModal(budget = null) {
        const form = document.getElementById('form-budget');
        form.reset();

        if (budget) {
            document.getElementById('budget-id').value = budget.id;
            document.getElementById('budget-category').value = budget.category;
            document.getElementById('budget-amount').value = budget.amount;
        } else {
            document.getElementById('budget-id').value = '';
        }

        this.openModal('modal-budget');
    },

    handleBudgetSubmit(e) {
        e.preventDefault();

        const id = document.getElementById('budget-id').value;
        const data = {
            category: document.getElementById('budget-category').value,
            amount: parseFloat(document.getElementById('budget-amount').value)
        };

        // Check for duplicate category
        const existing = Storage.getBudgets();
        const duplicate = existing.find(b => b.category === data.category && b.id !== id);
        if (duplicate) {
            this.showToast('Ya existe un presupuesto para esta categoria', 'error');
            return;
        }

        if (id) {
            Storage.updateBudget(id, data);
            this.showToast('Presupuesto actualizado', 'success');
        } else {
            Storage.addBudget(data);
            this.showToast('Presupuesto creado', 'success');
        }

        this.closeAllModals();
        this.renderBudgets();
        this.renderBudgetAlerts();
    },

    renderBudgets() {
        const container = document.getElementById('budgets-list');
        const budgetStatus = Storage.getBudgetStatus(this.currentYear, this.currentMonth);
        const currency = Storage.getSettings().currency;

        if (budgetStatus.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay presupuestos definidos.<br>Crea uno para controlar tus gastos.</p>';
            return;
        }

        container.innerHTML = budgetStatus.map(b => `
            <div class="budget-item">
                <div class="budget-header">
                    <h4>${this.CATEGORY_ICONS[b.category] || ''} ${b.category}</h4>
                    <div class="budget-amounts">
                        <strong>${this.formatMoney(b.spent, currency)}</strong> / ${this.formatMoney(b.amount, currency)}
                    </div>
                </div>
                <div class="budget-bar">
                    <div class="budget-bar-fill ${b.status}" style="width: ${b.percentage}%"></div>
                </div>
                <div class="budget-percentage">${Math.round(b.percentage)}% usado</div>
                <div class="budget-actions">
                    <button class="btn-sm btn-edit" onclick="App.openBudgetModal({id:'${b.id}', category:'${b.category}', amount:${b.amount}})">Editar</button>
                    <button class="btn-sm btn-delete" onclick="App.deleteBudget('${b.id}')">Eliminar</button>
                </div>
            </div>
        `).join('');
    },

    deleteBudget(id) {
        if (confirm('Eliminar este presupuesto?')) {
            Storage.deleteBudget(id);
            this.showToast('Presupuesto eliminado', 'success');
            this.renderBudgets();
            this.renderBudgetAlerts();
        }
    },

    renderBudgetAlerts() {
        const container = document.getElementById('budget-alerts');
        const alertsList = document.getElementById('alerts-list');
        const budgetStatus = Storage.getBudgetStatus(this.currentYear, this.currentMonth);
        const alerts = budgetStatus.filter(b => b.status !== 'safe');

        if (alerts.length === 0) {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        alertsList.innerHTML = alerts.map(a => `
            <div class="alert-item ${a.status}">
                <span class="alert-icon">${a.status === 'danger' ? '&#9888;' : '&#9888;'}</span>
                <span class="alert-text">
                    <strong>${a.category}</strong>: ${a.status === 'danger' ? 'Presupuesto excedido' : 'Cerca del limite'} (${Math.round(a.percentage)}%)
                </span>
            </div>
        `).join('');
    },

    // ===== Reports =====
    renderReports() {
        this.renderCategorySummary('expense', 'category-summary', 'Sin gastos este mes');
        this.renderCategorySummary('income', 'income-category-summary', 'Sin ingresos este mes');
        if (typeof Charts !== 'undefined') {
            Charts.renderComparisonChart();
        }
    },

    renderCategorySummary(type, containerId, emptyMsg) {
        const container = document.getElementById(containerId);
        const catTotals = Storage.getCategoryTotals(this.currentYear, this.currentMonth, type);
        const currency = Storage.getSettings().currency;
        const colors = Charts ? Charts.COLORS : [];

        const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

        if (sorted.length === 0) {
            container.innerHTML = `<p class="empty-state">${emptyMsg}</p>`;
            return;
        }

        container.innerHTML = sorted.map(([cat, amount], i) => `
            <div class="category-summary-item">
                <div class="cat-info">
                    <span class="cat-dot" style="background:${colors[i % colors.length] || '#4361ee'}"></span>
                    <span>${cat}</span>
                </div>
                <span class="cat-amount ${type}">${this.formatMoney(amount, currency)}</span>
            </div>
        `).join('');
    },

    // ===== Export CSV =====
    exportCSV() {
        const csv = Storage.exportToCSV();
        if (!csv) {
            this.showToast('No hay datos para exportar', 'warning');
            return;
        }

        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finanzas_denis_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('CSV exportado', 'success');
    },

    // ===== Settings =====
    loadSettings() {
        const settings = Storage.getSettings();
        document.getElementById('setting-currency').value = settings.currency;
        document.getElementById('setting-theme').value = settings.theme || 'dark';
        this.applyTheme(settings.theme || 'dark');
    },

    // ===== Theme =====
    toggleTheme() {
        const settings = Storage.getSettings();
        const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
        Storage.saveSetting('theme', newTheme);
        this.applyTheme(newTheme);
        document.getElementById('setting-theme').value = newTheme;
    },

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        // Update theme icons
        const darkIcon = document.getElementById('theme-icon-dark');
        const lightIcon = document.getElementById('theme-icon-light');
        if (theme === 'light') {
            darkIcon.classList.add('hidden');
            lightIcon.classList.remove('hidden');
            document.querySelector('meta[name="theme-color"]').content = '#f0f2f5';
        } else {
            darkIcon.classList.remove('hidden');
            lightIcon.classList.add('hidden');
            document.querySelector('meta[name="theme-color"]').content = '#1a1a2e';
        }
        // Update chart colors if Charts exists
        if (typeof Charts !== 'undefined' && Charts.updateThemeColors) {
            Charts.updateThemeColors(theme);
        }
    },

    clearAllData() {
        if (confirm('Estas seguro? Se borraran TODAS las transacciones y presupuestos.')) {
            Storage.clearAll();
            this.showToast('Datos eliminados', 'success');
            this.render();
            this.renderBudgets();
            this.closeAllModals();
        }
    },

    // ===== Modals =====
    openModal(id) {
        document.getElementById(id).classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    },

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
        document.body.style.overflow = '';
        this.editingTransactionId = null;
    },

    // ===== Toast =====
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    // ===== Helpers =====
    formatMoney(amount, currency = 'S/. ') {
        const num = Math.abs(Number(amount));
        return `${currency}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
