// View Routing, Dashboard Renderers, Expense Log Table, & Modal Action Handlers

function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-item');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });
}

function switchTab(targetTab, silent = false) {
    const navButtons = document.querySelectorAll('.nav-item');
    const screenViews = document.querySelectorAll('.screen-view');
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');

    const titles = {
        'home': { title: 'Home', sub: 'Welcome to your personal wealth command center.' },
        'dashboard': { title: 'Financial Dashboard', sub: 'Real-time breakdown of your wealth, income, and expenditure.' },
        'expense-log': { title: 'Expense Log', sub: 'Full searchable ledger of all logged transactions.' },
        'monthly-insights': { title: 'Monthly Insights', sub: 'Financial analytics, category breakdown, and cashflow trajectory.' },
        'about-us': { title: 'About Us', sub: 'Learn more about Your Finance wealth platform, privacy guarantees, and security.' }
    };

    navButtons.forEach(b => b.classList.remove('active'));
    screenViews.forEach(s => s.classList.remove('active'));

    const activeBtn = document.querySelector(`.nav-item[data-tab="${targetTab}"]`);
    const activeView = document.getElementById(`view-${targetTab}`);

    if (activeBtn) activeBtn.classList.add('active');
    if (activeView) activeView.classList.add('active');

    if (titles[targetTab]) {
        pageTitle.innerText = titles[targetTab].title;
        pageSubtitle.innerText = titles[targetTab].sub;
        if (!silent) {
            showToast(`Opened ${titles[targetTab].title}`, 'info', 2000);
        }
    }

    if (targetTab === 'monthly-insights') {
        setTimeout(initCharts, 100);
    }
}

function renderDashboard() {
    const recentTxContainer = document.getElementById('dash-recent-tx');
    const accountsContainer = document.getElementById('accounts-list');

    populateCategoryOptions();

    const incomeList = appState.transactions.filter(t => t.isIncome || t.category === 'Income');
    const expenseList = appState.transactions.filter(t => !t.isIncome && t.category !== 'Income');

    const totalIncome = incomeList.reduce((acc, t) => acc + t.amount, 0);
    const totalExpenses = expenseList.reduce((acc, t) => acc + t.amount, 0);
    const accountsTotal = appState.accounts.reduce((acc, a) => acc + (a.balance || 0), 0);
    const netWorth = accountsTotal + totalIncome - totalExpenses;

    const savingsRate = totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)) : 0;

    const netWorthEl = document.getElementById('dash-networth');
    const incomeEl = document.getElementById('dash-income');
    const expensesEl = document.getElementById('dash-expenses');
    const savingsEl = document.getElementById('dash-savings-rate');

    if (netWorthEl) netWorthEl.innerText = formatRupee(netWorth);
    if (incomeEl) incomeEl.innerText = formatRupee(totalIncome);
    if (expensesEl) expensesEl.innerText = formatRupee(totalExpenses);
    if (savingsEl) savingsEl.innerText = `${savingsRate}%`;

    if (!recentTxContainer || !accountsContainer) return;

    if (!appState.accounts || appState.accounts.length === 0) {
        accountsContainer.innerHTML = `
            <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-dim);">
                <i class="fa-solid fa-credit-card" style="font-size: 2rem; margin-bottom: 0.75rem; opacity: 0.4;"></i>
                <p style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.4rem;">No Linked Accounts or Cards</p>
                <p style="font-size: 0.8rem; margin-bottom: 1rem;">Click "+ Connect Bank Account / Card" to track your account balances.</p>
                <button class="btn btn-secondary" onclick="openAddAccountModal()">+ Connect Account</button>
            </div>
        `;
    } else {
        accountsContainer.innerHTML = appState.accounts.map(acc => `
            <div class="account-item">
                <div class="acc-info">
                    <div class="acc-icon ${acc.class || 'credit'}"><i class="fa-solid ${acc.icon || 'fa-credit-card'}"></i></div>
                    <div>
                        <h4>${escapeHtml(acc.name)}</h4>
                        <span class="acc-number">${acc.number || acc.type} • ${acc.type}</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span class="acc-balance">${formatRupee(acc.balance)}</span>
                    <button class="btn-text" onclick="openEditAccountModal('${escapeHtml(acc.name)}')" title="Edit Account"><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn-text" onclick="deleteAccount('${escapeHtml(acc.name)}')" title="Delete Account" style="color: var(--accent-red);"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }

    const recent = appState.transactions.slice(0, 5);
    if (recent.length === 0) {
        recentTxContainer.innerHTML = `
            <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-dim);">
                <i class="fa-solid fa-receipt" style="font-size: 2rem; margin-bottom: 0.75rem; opacity: 0.4;"></i>
                <p style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.4rem;">No Transactions Recorded</p>
                <p style="font-size: 0.8rem; margin-bottom: 1rem;">Click "+ Add Expense" to log your first transaction.</p>
                <button class="btn btn-primary" onclick="openAddExpenseModal()">+ Add Expense</button>
            </div>
        `;
    } else {
        recentTxContainer.innerHTML = recent.map(tx => {
            const isInc = tx.isIncome || tx.category === 'Income';
            return `
                <div class="tx-item">
                    <div class="tx-details">
                        <div class="tx-icon"><i class="fa-solid ${getCategoryIcon(tx.category)}"></i></div>
                        <div>
                            <div class="tx-title">${escapeHtml(tx.title)}</div>
                            <div class="tx-meta">${tx.category} • ${tx.accountName || tx.payment} • ${tx.date}</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span class="tx-amount ${isInc ? 'pos' : 'neg'}">${isInc ? '+' : '-'}${formatRupee(tx.amount)}</span>
                        <button class="btn-text" onclick="openEditExpenseModal(${tx.id})" title="Edit Transaction"><i class="fa-solid fa-pencil"></i></button>
                        <button class="btn-text" onclick="deleteExpense(${tx.id})" title="Delete Transaction" style="color: var(--accent-red);"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function renderExpenseLog() {
    const tbody = document.getElementById('expense-table-body');
    if (!tbody) return;

    const catFilter = document.getElementById('filter-category').value;
    const payFilter = document.getElementById('filter-payment').value;
    const searchQuery = document.getElementById('global-search').value.toLowerCase();

    let filtered = appState.transactions;

    if (catFilter !== 'all') filtered = filtered.filter(t => t.category === catFilter);
    if (payFilter !== 'all') filtered = filtered.filter(t => t.payment === payFilter);
    if (searchQuery) {
        filtered = filtered.filter(t => 
            t.title.toLowerCase().includes(searchQuery) || 
            t.category.toLowerCase().includes(searchQuery) ||
            t.payment.toLowerCase().includes(searchQuery) ||
            (t.accountName && t.accountName.toLowerCase().includes(searchQuery))
        );
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-dim);">
                    No matching transactions found. Click "+ New Transaction" to log an entry.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(t => {
        const isInc = t.isIncome || t.category === 'Income';
        return `
            <tr>
                <td>${t.date}</td>
                <td><strong>${escapeHtml(t.title)}</strong></td>
                <td><span class="badge-info">${t.category}</span></td>
                <td>${escapeHtml(t.accountName || t.payment)}</td>
                <td>
                    ${t.receipt ? `<button class="btn-text" onclick="showReceiptModal(${t.id})"><i class="fa-solid fa-paperclip"></i> View</button>` : '<span style="color:var(--text-dim);">None</span>'}
                </td>
                <td class="tx-amount ${isInc ? 'pos' : 'neg'}">${isInc ? '+' : '-'}${formatRupee(t.amount)}</td>
                <td>
                    <button class="btn-text" onclick="openEditExpenseModal(${t.id})" title="Edit Transaction"><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn-text" onclick="deleteExpense(${t.id})" title="Delete Transaction" style="color: var(--accent-red);"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function initGlobalSearch() {
    const input = document.getElementById('global-search');
    if (input) {
        input.addEventListener('input', () => renderExpenseLog());
    }
}

function openAddExpenseModal() {
    document.getElementById('exp-edit-id').value = '';
    document.getElementById('expense-modal-title').innerText = "Add Today's Transaction";
    document.getElementById('exp-save-btn').innerText = 'Save Expense';
    document.getElementById('form-add-expense').reset();
    document.getElementById('exp-date').value = new Date().toISOString().split('T')[0];
    
    populateAccountSelectOptions();
    toggleAccountSelectionVisibility();

    setupCustomSelect('exp-category');
    setupCustomSelect('exp-payment');
    setupCustomSelect('exp-account-select');

    document.getElementById('modal-add-expense').classList.add('active');
}

function openEditExpenseModal(id) {
    const tx = appState.transactions.find(t => t.id === id);
    if (!tx) return;

    document.getElementById('exp-edit-id').value = tx.id;
    document.getElementById('expense-modal-title').innerText = 'Edit Transaction';
    document.getElementById('exp-save-btn').innerText = 'Update Transaction';
    document.getElementById('exp-title').value = tx.title;
    document.getElementById('exp-amount').value = tx.amount;
    document.getElementById('exp-category').value = tx.category;
    document.getElementById('exp-date').value = tx.date;
    document.getElementById('exp-payment').value = tx.payment || 'UPI / GPay';

    populateAccountSelectOptions(tx.accountName);
    toggleAccountSelectionVisibility();

    setupCustomSelect('exp-category');
    setupCustomSelect('exp-payment');
    setupCustomSelect('exp-account-select');

    document.getElementById('modal-add-expense').classList.add('active');
}

async function handleAddExpenseSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('exp-edit-id').value;
    const title = document.getElementById('exp-title').value;
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const category = document.getElementById('exp-category').value;
    const payment = document.getElementById('exp-payment').value;
    const accountName = (payment === 'Cash') ? 'Cash' : document.getElementById('exp-account-select').value;
    const date = document.getElementById('exp-date').value;
    const isInc = category === 'Income';

    if (editId) {
        const idx = appState.transactions.findIndex(t => t.id == editId);
        if (idx !== -1) {
            const oldTx = appState.transactions[idx];
            const updatedTx = { ...oldTx, title, amount, category, date, payment, accountName, isIncome: isInc };
            appState.transactions[idx] = updatedTx;

            await dbUpdateTransaction(updatedTx);
            pushNotification('Transaction Updated', `Updated entry for "${title}" (₹${amount.toLocaleString('en-IN')})`, 'info');
        }
    } else {
        const newTx = {
            id: Date.now(),
            title: title,
            amount: amount,
            category: category,
            date: date,
            payment: payment,
            accountName: accountName,
            merchant: title,
            receipt: true,
            isIncome: isInc
        };

        appState.transactions.unshift(newTx);
        await dbInsertTransaction(newTx);
        pushNotification(
            isInc ? 'Income Recorded' : 'Expense Logged',
            `${isInc ? '+' : '-'}₹${amount.toLocaleString('en-IN')} for "${title}" via ${payment}`,
            isInc ? 'emerald' : 'info'
        );
    }

    saveAppState();
    closeModal('modal-add-expense');
    document.getElementById('form-add-expense').reset();

    showToast(editId ? "Transaction updated successfully!" : (isInc ? "Income entry recorded!" : "Expense logged successfully!"), "success");

    renderDashboard();
    renderExpenseLog();
}

async function deleteExpense(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        const index = appState.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            appState.transactions.splice(index, 1);
            saveAppState();
            await dbDeleteTransaction(id);
            showToast("Transaction entry deleted.", "danger");
            renderDashboard();
            renderExpenseLog();
        }
    }
}

function openAddCustomCategoryModal() {
    document.getElementById('custom-cat-name').value = '';
    document.getElementById('modal-add-custom-category').classList.add('active');
}

function handleAddCustomCategorySubmit(e) {
    e.preventDefault();
    const catName = document.getElementById('custom-cat-name').value.trim();
    if (!catName) return;

    if (!appState.customCategories) appState.customCategories = [];

    if (!appState.customCategories.includes(catName)) {
        appState.customCategories.push(catName);
        saveAppState();
    }

    populateCategoryOptions(catName);
    closeModal('modal-add-custom-category');
    showToast(`Custom category "${catName}" added!`, "info");
}

function openAddAccountModal() {
    document.getElementById('acc-edit-name').value = '';
    document.getElementById('acc-modal-title').innerText = 'Connect Bank Account / Card';
    document.getElementById('acc-save-btn').innerText = 'Connect Account / Card';
    document.getElementById('form-add-account').reset();
    setupCustomSelect('acc-type');
    document.getElementById('modal-add-account').classList.add('active');
}

function openEditAccountModal(name) {
    const acc = appState.accounts.find(a => a.name === name);
    if (!acc) return;

    document.getElementById('acc-edit-name').value = acc.name;
    document.getElementById('acc-modal-title').innerText = 'Edit Bank Account / Card';
    document.getElementById('acc-save-btn').innerText = 'Update Account / Card';
    document.getElementById('acc-name').value = acc.name;
    document.getElementById('acc-number').value = acc.number || '';
    document.getElementById('acc-type').value = acc.type;
    document.getElementById('acc-balance').value = acc.balance;

    setupCustomSelect('acc-type');
    document.getElementById('modal-add-account').classList.add('active');
}

function handleAddAccountSubmit(e) {
    e.preventDefault();
    const editName = document.getElementById('acc-edit-name').value;
    const name = document.getElementById('acc-name').value;
    const number = document.getElementById('acc-number').value.trim();
    const type = document.getElementById('acc-type').value;
    const balance = parseFloat(document.getElementById('acc-balance').value);

    let icon = 'fa-credit-card';
    let cls = 'credit';

    if (type === 'Savings') { icon = 'fa-building-columns'; cls = 'savings'; }
    else if (type === 'Deposit') { icon = 'fa-shield-halved'; cls = 'savings'; }
    else if (type === 'Checking') { icon = 'fa-wallet'; cls = 'checking'; }

    if (editName) {
        const acc = appState.accounts.find(a => a.name === editName);
        if (acc) {
            acc.name = name;
            acc.number = number;
            acc.type = type;
            acc.balance = balance;
            acc.icon = icon;
            acc.class = cls;
        }
        showToast("Bank account / card updated!", "info");
    } else {
        const newAcc = {
            name: name,
            type: type,
            number: number || ("•••• " + Math.floor(1000 + Math.random() * 9000)),
            balance: balance,
            icon: icon,
            class: cls
        };
        if (!appState.accounts) appState.accounts = [];
        appState.accounts.push(newAcc);
        showToast("Bank account / card connected successfully!", "success");
    }

    saveAppState();
    closeModal('modal-add-account');
    document.getElementById('form-add-account').reset();
    renderDashboard();
}

function deleteAccount(name) {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
        appState.accounts = appState.accounts.filter(a => a.name !== name);
        saveAppState();
        showToast(`Account "${name}" deleted.`, "danger");
        renderDashboard();
    }
}

function showReceiptModal(id) {
    const tx = appState.transactions.find(t => t.id === id);
    if (!tx) return;

    const receiptBody = document.getElementById('receipt-body');
    receiptBody.innerHTML = `
        <div style="text-align: center; margin-bottom: 1.5rem;">
            <div style="font-size: 2.2rem; font-weight: 800; color: ${tx.isIncome ? 'var(--accent-emerald)' : '#FFFFFF'}; margin-bottom: 0.4rem;">
                ${tx.isIncome ? '+' : '-'}${formatRupee(tx.amount)}
            </div>
            <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-main);">${escapeHtml(tx.title)}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${tx.date} • ${tx.payment}</div>
        </div>
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-card); border-radius: 12px; padding: 1rem; font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.6rem;">
            <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-muted);">Transaction ID</span><span>#${tx.id}</span></div>
            <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-muted);">Category</span><span>${tx.category}</span></div>
            <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-muted);">Source Account</span><span>${escapeHtml(tx.accountName || 'Primary Bank Account')}</span></div>
            <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-muted);">Vault Status</span><span style="color: var(--accent-emerald); font-weight: 600;"><i class="fa-solid fa-shield-halved"></i> Encrypted</span></div>
        </div>
    `;

    document.getElementById('modal-receipt').classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

function getCategoryIcon(cat) {
    switch (cat) {
        case 'Housing': return 'fa-house';
        case 'Food & Dining': return 'fa-utensils';
        case 'Shopping': return 'fa-bag-shopping';
        case 'Utilities': return 'fa-bolt';
        case 'Transportation': return 'fa-car';
        case 'Entertainment': return 'fa-film';
        case 'Income': return 'fa-circle-arrow-down';
        default: return 'fa-receipt';
    }
}
