/**
 * app.js - Logica principal de Finanzas Denis
 */

const App = {
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    currentFilter: 'all',
    editingTransactionId: null,
    pinBuffer: '',
    setupPinBuffer: '',
    setupPinStep: 0,
    setupPinFirst: '',
    catViewType: 'expense',

    MONTHS: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
             'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],

    EMOJI_OPTIONS: [
        '\u{1F355}','\u{1F697}','\u{1F3E0}','\u{1F4A1}','\u{1F48A}','\u{1F393}','\u{1F3AC}','\u{1F454}',
        '\u{1F4B3}','\u{1F4C4}','\u{1F4B0}','\u{1F4BB}','\u{1F4C8}','\u{1F6D2}','\u{1F4B5}',
        '\u{1F436}','\u{1F3CB}','\u{2708}','\u{1F4F1}','\u{1F381}','\u{1F527}','\u{1F3E2}',
        '\u{2615}','\u{1F37D}','\u{1F3B5}','\u{1F4DA}','\u{1F489}','\u{1F6BF}','\u{26BD}','\u{1F3AE}'
    ],

    async init() {
        if (Storage.isAuthEnabled()) {
            this.showLockScreen();
        } else {
            this.startApp();
        }
    },

    startApp() {
        document.getElementById('lock-screen').classList.add('hidden');
        this.bindEvents();
        this.loadSettings();
        this.populateCategorySelects();
        this.render();

        setTimeout(() => {
            const splash = document.getElementById('splash');
            splash.classList.add('fade-out');
            document.getElementById('app').classList.remove('hidden');
            setTimeout(() => splash.remove(), 400);
        }, 800);
    },

    // ===== Lock Screen =====
    showLockScreen() {
        const splash = document.getElementById('splash');
        if (splash) splash.remove();
        document.getElementById('app').classList.add('hidden');
        const ls = document.getElementById('lock-screen');
        ls.classList.remove('hidden');
        this.pinBuffer = '';
        this.updatePinDots('pin-dots', 0);
        document.getElementById('lock-error').classList.add('hidden');
        this.bindLockEvents();

        const auth = Storage.getAuth();
        if (auth && auth.biometric) this.tryBiometric();
    },

    bindLockEvents() {
        document.querySelectorAll('#lock-screen .pin-key[data-digit]').forEach(k => {
            k.onclick = () => this.handlePinInput(k.dataset.digit);
        });
        document.getElementById('btn-pin-delete').onclick = () => this.handlePinDelete();
        document.getElementById('btn-biometric').onclick = () => this.tryBiometric();
        document.getElementById('btn-forgot-pin').onclick = () => this.showForgotPin();

        document.querySelectorAll('.btn-close-modal-lock').forEach(el => {
            el.onclick = () => document.getElementById('modal-forgot-pin').classList.add('hidden');
        });

        document.getElementById('form-forgot-pin').onsubmit = (e) => {
            e.preventDefault();
            this.handleForgotPin();
        };
    },

    handlePinInput(digit) {
        if (this.pinBuffer.length >= 4) return;
        this.pinBuffer += digit;
        this.updatePinDots('pin-dots', this.pinBuffer.length);
        document.getElementById('lock-error').classList.add('hidden');

        if (this.pinBuffer.length === 4) {
            setTimeout(() => this.verifyAndUnlock(), 200);
        }
    },

    handlePinDelete() {
        if (this.pinBuffer.length > 0) {
            this.pinBuffer = this.pinBuffer.slice(0, -1);
            this.updatePinDots('pin-dots', this.pinBuffer.length);
        }
    },

    async verifyAndUnlock() {
        const ok = await Storage.verifyPin(this.pinBuffer);
        if (ok) {
            this.startApp();
        } else {
            document.getElementById('lock-error').classList.remove('hidden');
            this.pinBuffer = '';
            this.updatePinDots('pin-dots', 0);
            document.getElementById('lock-screen').classList.add('shake');
            setTimeout(() => document.getElementById('lock-screen').classList.remove('shake'), 500);
        }
    },

    updatePinDots(containerId, count) {
        const dots = document.getElementById(containerId).querySelectorAll('.pin-dot');
        dots.forEach((d, i) => d.classList.toggle('filled', i < count));
    },

    async tryBiometric() {
        const auth = Storage.getAuth();
        if (!auth || !auth.biometric || !auth.credentialId) return;
        try {
            if (!window.PublicKeyCredential) return;
            const challenge = new Uint8Array(32);
            crypto.getRandomValues(challenge);
            const cred = await navigator.credentials.get({
                publicKey: {
                    challenge,
                    allowCredentials: [{
                        id: Uint8Array.from(atob(auth.credentialId), c => c.charCodeAt(0)),
                        type: 'public-key'
                    }],
                    timeout: 60000,
                    userVerification: 'required'
                }
            });
            if (cred) this.startApp();
        } catch (e) { console.log('Biometric failed:', e); }
    },

    showForgotPin() {
        const auth = Storage.getAuth();
        if (!auth || !auth.securityQuestion) {
            alert('No hay pregunta de seguridad configurada. Borra los datos del navegador para resetear.');
            return;
        }
        const questions = {
            mascota: 'Nombre de tu primera mascota',
            ciudad: 'Ciudad donde naciste',
            madre: 'Segundo nombre de tu madre',
            escuela: 'Nombre de tu primera escuela'
        };
        document.getElementById('forgot-question-text').textContent = questions[auth.securityQuestion] || auth.securityQuestion;
        document.getElementById('forgot-answer').value = '';
        document.getElementById('forgot-error').classList.add('hidden');
        document.getElementById('modal-forgot-pin').classList.remove('hidden');
    },

    handleForgotPin() {
        const answer = document.getElementById('forgot-answer').value;
        if (Storage.verifySecurityAnswer(answer)) {
            const auth = Storage.getAuth();
            auth.pin = null;
            auth.enabled = false;
            Storage.saveAuth(auth);
            document.getElementById('modal-forgot-pin').classList.add('hidden');
            this.startApp();
            this.showToast('PIN desactivado. Configura uno nuevo en Ajustes.', 'success');
        } else {
            document.getElementById('forgot-error').classList.remove('hidden');
        }
    },

    // ===== Event Binding =====
    bindEvents() {
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => this.navigateTo(btn.dataset.page));
        });
        document.getElementById('btn-prev-month').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('btn-next-month').addEventListener('click', () => this.changeMonth(1));
        document.getElementById('fab-add').addEventListener('click', () => this.openTransactionModal());
        document.getElementById('btn-see-all').addEventListener('click', () => this.navigateTo('transactions'));
        document.getElementById('form-transaction').addEventListener('submit', (e) => this.handleTransactionSubmit(e));
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => this.toggleTransactionType(btn));
        });
        document.getElementById('btn-add-budget').addEventListener('click', () => this.openBudgetModal());
        document.getElementById('form-budget').addEventListener('submit', (e) => this.handleBudgetSubmit(e));
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => this.filterTransactions(tab.dataset.filter));
        });
        document.getElementById('btn-export-csv').addEventListener('click', () => this.exportCSV());
        document.getElementById('btn-toggle-theme').addEventListener('click', () => this.toggleTheme());

        // Settings
        document.getElementById('btn-settings').addEventListener('click', () => {
            this.loadSecuritySettings();
            this.openModal('modal-settings');
        });
        document.getElementById('setting-currency').addEventListener('change', (e) => {
            Storage.saveSetting('currency', e.target.value);
            this.render();
        });
        document.getElementById('setting-theme').addEventListener('change', (e) => {
            Storage.saveSetting('theme', e.target.value);
            this.applyTheme(e.target.value);
        });
        document.getElementById('btn-clear-data').addEventListener('click', () => this.clearAllData());

        // Categories
        document.getElementById('btn-manage-categories').addEventListener('click', () => {
            this.closeAllModals();
            this.renderCategoryList();
            this.openModal('modal-categories');
        });
        document.querySelectorAll('.cat-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.catViewType = tab.dataset.catType;
                this.renderCategoryList();
            });
        });
        document.getElementById('btn-add-category').addEventListener('click', () => this.openCategoryForm());
        document.getElementById('form-category').addEventListener('submit', (e) => this.handleCategorySubmit(e));

        // Security
        document.getElementById('setting-pin-toggle').addEventListener('change', (e) => this.handlePinToggle(e.target.checked));
        document.getElementById('btn-change-pin').addEventListener('click', () => this.openSetupPin('change'));
        document.getElementById('btn-setup-security-q').addEventListener('click', () => this.openModal('modal-security-q'));
        document.getElementById('setting-bio-toggle').addEventListener('change', (e) => this.handleBioToggle(e.target.checked));
        document.getElementById('form-security-q').addEventListener('submit', (e) => this.handleSecurityQSubmit(e));

        // Setup PIN pad
        document.querySelectorAll('#modal-setup-pin .pin-key[data-setup-digit]').forEach(k => {
            k.addEventListener('click', () => this.handleSetupPinInput(k.dataset.setupDigit));
        });
        document.getElementById('btn-setup-pin-del').addEventListener('click', () => this.handleSetupPinDelete());

        // Modal close
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

    changeMonth(delta) {
        this.currentMonth += delta;
        if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
        if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
        this.render();
    },

    // ===== Categories Dynamic =====
    populateCategorySelects() {
        const cats = Storage.getCategories();
        const transSelect = document.getElementById('trans-category');
        const budgetSelect = document.getElementById('budget-category');

        const expenseCats = cats.filter(c => c.type === 'expense');
        const incomeCats = cats.filter(c => c.type === 'income');

        transSelect.innerHTML = '';
        const expGroup = document.createElement('optgroup');
        expGroup.label = 'Gastos';
        expGroup.id = 'expense-categories';
        expenseCats.forEach(c => {
            const o = document.createElement('option');
            o.value = c.name;
            o.textContent = c.icon + ' ' + c.name;
            expGroup.appendChild(o);
        });
        transSelect.appendChild(expGroup);

        const incGroup = document.createElement('optgroup');
        incGroup.label = 'Ingresos';
        incGroup.id = 'income-categories';
        incGroup.style.display = 'none';
        incomeCats.forEach(c => {
            const o = document.createElement('option');
            o.value = c.name;
            o.textContent = c.icon + ' ' + c.name;
            incGroup.appendChild(o);
        });
        transSelect.appendChild(incGroup);

        budgetSelect.innerHTML = '';
        expenseCats.forEach(c => {
            const o = document.createElement('option');
            o.value = c.name;
            o.textContent = c.icon + ' ' + c.name;
            budgetSelect.appendChild(o);
        });
    },

    updateCategoryVisibility(type) {
        const expenseGroup = document.getElementById('expense-categories');
        const incomeGroup = document.getElementById('income-categories');
        if (type === 'income') {
            expenseGroup.style.display = 'none';
            incomeGroup.style.display = 'block';
            const firstIncome = incomeGroup.querySelector('option');
            if (firstIncome) document.getElementById('trans-category').value = firstIncome.value;
        } else {
            expenseGroup.style.display = 'block';
            incomeGroup.style.display = 'none';
            const firstExpense = expenseGroup.querySelector('option');
            if (firstExpense) document.getElementById('trans-category').value = firstExpense.value;
        }
    },

    // ===== Category Management =====
    renderCategoryList() {
        const cats = Storage.getCategories().filter(c => c.type === this.catViewType);
        const container = document.getElementById('categories-list');
        if (cats.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay categorias</p>';
            return;
        }
        container.innerHTML = cats.map(c => {
            const hasT = Storage.categoryHasTransactions(c.name);
            return `<div class="cat-list-item">
                <span class="cat-list-icon">${c.icon}</span>
                <span class="cat-list-name">${c.name}</span>
                <div class="cat-list-actions">
                    <button class="btn-sm btn-edit" onclick="App.openCategoryForm('${c.id}')">Editar</button>
                    ${hasT ? '<span class="cat-in-use">En uso</span>' : `<button class="btn-sm btn-delete" onclick="App.deleteCategoryItem('${c.id}')">Eliminar</button>`}
                </div>
            </div>`;
        }).join('');
    },

    openCategoryForm(id) {
        const form = document.getElementById('form-category');
        form.reset();
        document.getElementById('cat-type-val').value = this.catViewType;

        if (id) {
            const cat = Storage.getCategories().find(c => c.id === id);
            if (!cat) return;
            document.getElementById('modal-cat-title').textContent = 'Editar Categoria';
            document.getElementById('cat-id').value = cat.id;
            document.getElementById('cat-name').value = cat.name;
            document.getElementById('cat-icon').value = cat.icon;
            document.getElementById('cat-type-val').value = cat.type;
        } else {
            document.getElementById('modal-cat-title').textContent = 'Nueva Categoria';
            document.getElementById('cat-id').value = '';
            document.getElementById('cat-icon').value = this.EMOJI_OPTIONS[0];
        }

        this.renderEmojiGrid();
        document.getElementById('modal-categories').classList.add('hidden');
        this.openModal('modal-category-form');
    },

    renderEmojiGrid() {
        const grid = document.getElementById('emoji-grid');
        const selected = document.getElementById('cat-icon').value || this.EMOJI_OPTIONS[0];
        grid.innerHTML = this.EMOJI_OPTIONS.map(e =>
            `<button type="button" class="emoji-opt ${e === selected ? 'active' : ''}" data-emoji="${e}">${e}</button>`
        ).join('');
        grid.querySelectorAll('.emoji-opt').forEach(btn => {
            btn.addEventListener('click', () => {
                grid.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById('cat-icon').value = btn.dataset.emoji;
            });
        });
    },

    handleCategorySubmit(e) {
        e.preventDefault();
        const id = document.getElementById('cat-id').value;
        const data = {
            name: document.getElementById('cat-name').value.trim(),
            type: document.getElementById('cat-type-val').value,
            icon: document.getElementById('cat-icon').value
        };
        if (!data.name) return;

        if (id) {
            Storage.updateCategory(id, data);
            this.showToast('Categoria actualizada', 'success');
        } else {
            const existing = Storage.getCategories();
            if (existing.some(c => c.name.toLowerCase() === data.name.toLowerCase())) {
                this.showToast('Ya existe esa categoria', 'error');
                return;
            }
            Storage.addCategory(data);
            this.showToast('Categoria creada', 'success');
        }
        this.populateCategorySelects();
        this.closeAllModals();
        this.renderCategoryList();
        this.openModal('modal-categories');
    },

    deleteCategoryItem(id) {
        const cat = Storage.getCategories().find(c => c.id === id);
        if (!cat) return;
        if (Storage.categoryHasTransactions(cat.name)) {
            this.showToast('No se puede eliminar, tiene transacciones', 'error');
            return;
        }
        if (confirm(`Eliminar categoria "${cat.name}"?`)) {
            Storage.deleteCategory(id);
            this.populateCategorySelects();
            this.renderCategoryList();
            this.showToast('Categoria eliminada', 'success');
        }
    },

    // ===== Render =====
    render() {
        const currency = Storage.getSettings().currency;
        const totals = Storage.getMonthlyTotals(this.currentYear, this.currentMonth);
        document.getElementById('current-month-label').textContent = `${this.MONTHS[this.currentMonth]} ${this.currentYear}`;
        document.getElementById('balance-total').textContent = this.formatMoney(totals.balance, currency);
        document.getElementById('total-income').textContent = this.formatMoney(totals.income, currency);
        document.getElementById('total-expense').textContent = this.formatMoney(totals.expense, currency);
        const balanceEl = document.getElementById('balance-total');
        balanceEl.style.color = totals.balance >= 0 ? 'var(--income)' : 'var(--expense)';
        this.renderRecentTransactions();
        
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
        if (this.currentFilter !== 'all') transactions = transactions.filter(t => t.type === this.currentFilter);
        if (transactions.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay transacciones</p>';
            return;
        }
        container.innerHTML = transactions.map(t => this.createTransactionHTML(t, true)).join('');
        this.bindTransactionActions(container);
    },

    createTransactionHTML(t, showActions = false) {
        const currency = Storage.getSettings().currency;
        const icon = Storage.getCategoryIcon(t.category);
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
            </button>` : ''}
        </div>`;
    },
    bindTransactionActions(){document.querySelectorAll('.tx-edit').forEach(b=>b.onclick=()=>this.editTransaction(b.dataset.id));document.querySelectorAll('.tx-delete').forEach(b=>b.onclick=()=>this.deleteTransaction(b.dataset.id));},
    openTransactionModal(edit=null){document.getElementById('modal-title-tx').textContent=edit?'Editar Transacción':'Nueva Transacción';document.getElementById('trans-id').value=edit?edit.id:'';document.getElementById('trans-description').value=edit?edit.description:'';document.getElementById('trans-amount').value=edit?edit.amount:'';document.getElementById('trans-date').value=edit?edit.date:new Date().toISOString().split('T')[0];const typeVal=edit?edit.type:'expense';document.querySelectorAll('.type-btn').forEach(b=>{b.classList.toggle('active',b.dataset.type===typeVal);});this.currentType=typeVal;this.populateCategorySelects();this.updateCategoryVisibility();if(edit){document.getElementById('trans-category').value=edit.category;}this.openModal('modal-transaction');},
    toggleTransactionType(type){this.currentType=type;document.querySelectorAll('.type-btn').forEach(b=>b.classList.toggle('active',b.dataset.type===type));this.updateCategoryVisibility();},
    handleTransactionSubmit(e){e.preventDefault();const id=document.getElementById('trans-id').value;const data={type:this.currentType,category:document.getElementById('trans-category').value,amount:parseFloat(document.getElementById('trans-amount').value),description:document.getElementById('trans-description').value,date:document.getElementById('trans-date').value};if(!data.category||!data.amount||!data.date){this.showToast('Completa los campos requeridos','error');return;}if(id){Storage.updateTransaction(id,data);this.showToast('Transacción actualizada');}else{Storage.addTransaction(data);this.showToast('Transacción agregada');}this.closeModal('modal-transaction');this.render();},
    editTransaction(id){const t=Storage.getTransactions().find(t=>t.id===id);if(t)this.openTransactionModal(t);},
    deleteTransaction(id){if(confirm('¿Eliminar esta transacción?')){Storage.deleteTransaction(id);this.showToast('Transacción eliminada');this.render();}},
    filterTransactions(){const search=document.getElementById('search-input').value.toLowerCase();const type=document.getElementById('filter-type').value;const all=Storage.getTransactionsByMonth(this.currentDate.getFullYear(),this.currentDate.getMonth());const filtered=all.filter(t=>{const matchType=type==='all'||t.type===type;const matchSearch=!search||t.description?.toLowerCase().includes(search)||t.category.toLowerCase().includes(search);return matchType&&matchSearch;});const c=document.getElementById('all-transactions-list');if(!c)return;c.innerHTML=filtered.length?filtered.map(t=>this.createTransactionHTML(t)).join(''):'<p class="empty-msg">No hay transacciones</p>';this.bindTransactionActions();},
    renderBudgets(){const c=document.getElementById('budgets-list');if(!c)return;const y=this.currentDate.getFullYear(),m=this.currentDate.getMonth();const statuses=Storage.getBudgetStatus(y,m);const settings=Storage.getSettings();c.innerHTML=statuses.length?statuses.map(b=>`<div class="budget-item"><div class="budget-header"><span class="budget-cat">${Storage.getCategoryIcon(b.category)} ${b.category}</span><span class="budget-amounts">${settings.currency}${b.spent.toFixed(2)} / ${settings.currency}${b.amount.toFixed(2)}</span></div><div class="progress-bar"><div class="progress-fill ${b.status}" style="width:${b.percentage}%"></div></div><div class="budget-footer"><span class="budget-remaining ${b.status}">Queda: ${settings.currency}${b.remaining.toFixed(2)}</span><div class="budget-actions"><button class="btn-icon budget-edit" data-id="${b.id}">✏️</button><button class="btn-icon budget-delete" data-id="${b.id}">🗑️</button></div></div></div>`).join(''):'<p class="empty-msg">No hay presupuestos configurados</p>';document.querySelectorAll('.budget-edit').forEach(b=>b.onclick=()=>this.editBudget(b.dataset.id));document.querySelectorAll('.budget-delete').forEach(b=>b.onclick=()=>this.deleteBudget(b.dataset.id));},
    openBudgetModal(edit=null){document.getElementById('budget-id').value=edit?edit.id:'';document.getElementById('budget-amount').value=edit?edit.amount:'';this.populateCategorySelects();if(edit)document.getElementById('budget-category').value=edit.category;this.openModal('modal-budget');},
    handleBudgetSubmit(e){e.preventDefault();const id=document.getElementById('budget-id').value;const data={category:document.getElementById('budget-category').value,amount:parseFloat(document.getElementById('budget-amount').value)};if(!data.category||!data.amount){this.showToast('Completa los campos','error');return;}if(id){Storage.updateBudget(id,data);this.showToast('Presupuesto actualizado');}else{Storage.addBudget(data);this.showToast('Presupuesto agregado');}this.closeModal('modal-budget');this.renderBudgets();},
    editBudget(id){const b=Storage.getBudgets().find(b=>b.id===id);if(b)this.openBudgetModal(b);},
    deleteBudget(id){if(confirm('¿Eliminar este presupuesto?')){Storage.deleteBudget(id);this.showToast('Presupuesto eliminado');this.renderBudgets();}},
    renderReports(){if(typeof Charts==='undefined')return;const y=this.currentDate.getFullYear(),m=this.currentDate.getMonth();const totals=Storage.getMonthlyTotals(y,m);const settings=Storage.getSettings();const balEl=document.getElementById('report-balance');const incEl=document.getElementById('report-income');const expEl=document.getElementById('report-expense');if(balEl)balEl.textContent=settings.currency+totals.balance.toFixed(2);if(incEl)incEl.textContent=settings.currency+totals.income.toFixed(2);if(expEl)expEl.textContent=settings.currency+totals.expense.toFixed(2);const catTotals=Storage.getCategoryTotals(y,m,'expense');Charts.renderCategoryChart(catTotals);Charts.renderTrendChart(Storage.getLast6MonthsTrend());this.renderCategorySummary(catTotals,settings);const incCatTotals=Storage.getCategoryTotals(y,m,'income');Charts.renderIncomeCategoryChart(incCatTotals);},
    renderCategorySummary(catTotals,settings){const c=document.getElementById('category-summary');if(!c)return;const sorted=Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);const total=sorted.reduce((s,e)=>s+e[1],0);c.innerHTML=sorted.length?sorted.map(([cat,amt])=>{const pct=total>0?((amt/total)*100).toFixed(1):0;return `<div class="cat-summary-item"><span class="cat-summary-icon">${Storage.getCategoryIcon(cat)}</span><div class="cat-summary-info"><div class="cat-summary-header"><span>${cat}</span><span>${settings.currency}${amt.toFixed(2)}</span></div><div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div></div><span class="cat-summary-pct">${pct}%</span></div>`;}).join(''):'<p class="empty-msg">Sin gastos este mes</p>';},
    exportCSV(){const csv=Storage.exportToCSV();if(!csv){this.showToast('No hay datos para exportar','error');return;}const blob=new Blob([csv],{type:'text/csv'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='finanzas_denis_'+new Date().toISOString().slice(0,10)+'.csv';a.click();URL.revokeObjectURL(url);this.showToast('CSV exportado');},
    loadSettings(){const s=Storage.getSettings();this.applyTheme(s.theme||'dark');const curr=document.getElementById('currency-select');if(curr)curr.value=s.currency||'S/. ';this.loadSecuritySettings();},
    loadSecuritySettings(){const auth=Storage.getAuth()||{};const pinToggle=document.getElementById('pin-toggle');const bioToggle=document.getElementById('bio-toggle');const changePin=document.getElementById('btn-change-pin');const secQ=document.getElementById('btn-security-q');if(pinToggle)pinToggle.checked=auth.enabled||false;if(bioToggle)bioToggle.checked=auth.biometric||false;if(changePin)changePin.style.display=auth.enabled?'inline-block':'none';if(secQ)secQ.style.display=auth.enabled?'inline-block':'none';if(bioToggle)bioToggle.closest('.setting-item').style.display=auth.enabled?'flex':'none';},
    toggleTheme(){const s=Storage.getSettings();const newTheme=s.theme==='dark'?'light':'dark';Storage.saveSetting('theme',newTheme);this.applyTheme(newTheme);},
    applyTheme(theme){document.body.setAttribute('data-theme',theme);const icon=document.getElementById('theme-icon');if(icon)icon.textContent=theme==='dark'?'🌙':'☀️';},
    handlePinToggle(enabled){if(enabled){this.openSetupPin(false);}else{const auth=Storage.getAuth();auth.enabled=false;auth.pin=null;auth.salt=null;auth.biometric=false;Storage.saveAuth(auth);this.loadSecuritySettings();this.showToast('PIN desactivado');}},
    openSetupPin(isChange=false){this.setupPinStep=1;this.setupPinValue='';this.setupPinFirst='';this.isChangingPin=isChange;document.getElementById('setup-pin-msg').textContent='Ingresa tu nuevo PIN de 4 dígitos';document.querySelectorAll('.pin-dot-setup').forEach(d=>d.classList.remove('filled'));this.openModal('modal-setup-pin');},
    handleSetupPinInput(digit){if(this.setupPinValue.length>=4)return;this.setupPinValue+=digit;document.querySelectorAll('.pin-dot-setup')[this.setupPinValue.length-1]?.classList.add('filled');if(this.setupPinValue.length===4){if(this.setupPinStep===1){this.setupPinFirst=this.setupPinValue;this.setupPinValue='';this.setupPinStep=2;document.getElementById('setup-pin-msg').textContent='Confirma tu PIN';document.querySelectorAll('.pin-dot-setup').forEach(d=>d.classList.remove('filled'));}else{if(this.setupPinValue===this.setupPinFirst){this.savePinSetup(this.setupPinValue);}else{this.showToast('Los PINs no coinciden','error');this.setupPinValue='';this.setupPinStep=1;this.setupPinFirst='';document.getElementById('setup-pin-msg').textContent='Ingresa tu nuevo PIN de 4 dígitos';document.querySelectorAll('.pin-dot-setup').forEach(d=>d.classList.remove('filled'));}}}},
    handleSetupPinDelete(){if(this.setupPinValue.length>0){this.setupPinValue=this.setupPinValue.slice(0,-1);const dots=document.querySelectorAll('.pin-dot-setup');dots[this.setupPinValue.length]?.classList.remove('filled');}},
    async savePinSetup(pin){const auth=Storage.getAuth();const result=await Storage.hashPin(pin);auth.pin=result.hash;auth.salt=result.salt;auth.enabled=true;Storage.saveAuth(auth);this.closeModal('modal-setup-pin');this.loadSecuritySettings();if(!auth.securityQuestion){this.openModal('modal-security-q');}else{this.showToast('PIN configurado');}},
    handleBioToggle(enabled){const auth=Storage.getAuth();auth.biometric=enabled;Storage.saveAuth(auth);this.showToast(enabled?'Biometría activada':'Biometría desactivada');},
    handleSecurityQSubmit(e){e.preventDefault();const q=document.getElementById('security-question').value;const a=document.getElementById('security-answer').value.trim();if(!a){this.showToast('Ingresa una respuesta','error');return;}const auth=Storage.getAuth();auth.securityQuestion=q;auth.securityAnswer=a.toLowerCase();Storage.saveAuth(auth);this.closeModal('modal-security-q');this.showToast('Pregunta de seguridad guardada');},
    clearAllData(){if(confirm('¿Eliminar TODOS los datos? Esta acción no se puede deshacer.')){Storage.clearAll();this.showToast('Datos eliminados');this.render();this.renderBudgets();}},
    openModal(id){document.getElementById(id)?.classList.add('active');},
    closeModal(id){document.getElementById(id)?.classList.remove('active');},
    showToast(msg,type='success'){let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t);}t.textContent=msg;t.className='toast '+type+' show';setTimeout(()=>t.classList.remove('show'),2500);},
    formatMoney(n){const s=Storage.getSettings();return s.currency+Number(n).toFixed(2);}
};
document.addEventListener('DOMContentLoaded',()=>App.init());
