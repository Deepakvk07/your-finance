// Universal UI Components: Custom Windows-11 Style Select Popovers, Toast Alerts, & Helpers

// Universal Floating Toast Notification Engine
function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
        success: 'fa-circle-check',
        info: 'fa-circle-info',
        warning: 'fa-triangle-exclamation',
        danger: 'fa-circle-xmark'
    };

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${icons[type] || 'fa-circle-info'} toast-icon"></i>
        <div class="toast-message">${escapeHtml(message)}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Universal Custom Windows-11 Style Dropdown Popover Engine
function setupCustomSelect(selectId) {
    const selectEl = document.getElementById(selectId);
    if (!selectEl) return;

    let wrapper = selectEl.closest('.custom-select-wrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';
        selectEl.parentNode.insertBefore(wrapper, selectEl);
        wrapper.appendChild(selectEl);
    }

    selectEl.style.display = 'none';

    let trigger = wrapper.querySelector('.custom-select-trigger');
    let menu = wrapper.querySelector('.custom-select-menu');

    if (!trigger) {
        trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        wrapper.appendChild(trigger);

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllCustomSelects(wrapper);
            const isOpen = wrapper.classList.toggle('open');
            if (menu) menu.classList.toggle('active', isOpen);
        });
    }

    if (!menu) {
        menu = document.createElement('div');
        menu.className = 'custom-select-menu';
        wrapper.appendChild(menu);
    }

    const selectedOpt = selectEl.options[selectEl.selectedIndex] || selectEl.options[0];
    trigger.innerHTML = `
        <span class="selected-text">${selectedOpt ? escapeHtml(selectedOpt.text) : ''}</span>
        <i class="fa-solid fa-chevron-down chevron"></i>
    `;

    menu.innerHTML = '';
    Array.from(selectEl.options).forEach((opt) => {
        const item = document.createElement('div');
        item.className = `custom-select-option ${opt.selected ? 'selected' : ''}`;
        item.innerHTML = `<span>${escapeHtml(opt.text)}</span>`;
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            selectEl.value = opt.value;
            selectEl.dispatchEvent(new Event('change'));

            wrapper.classList.remove('open');
            menu.classList.remove('active');

            setupCustomSelect(selectId);
        });
        menu.appendChild(item);
    });
}

function closeAllCustomSelects(exceptWrapper) {
    document.querySelectorAll('.custom-select-wrapper').forEach(w => {
        if (w !== exceptWrapper) {
            w.classList.remove('open');
            const menu = w.querySelector('.custom-select-menu');
            if (menu) menu.classList.remove('active');
        }
    });
}

document.addEventListener('click', () => closeAllCustomSelects());

// Format Rupee Currency helper (INR format)
function formatRupee(amount) {
    return '₹' + Number(amount || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatAccountShortNumber(num) {
    if (!num) return '';
    const str = String(num).trim();
    if (str.length > 6) {
        return '•••• ' + str.slice(-4);
    }
    return str;
}

// Toggle Visibility of Linked Account Selection based on Payment Method (UPI/GPay or Card vs Cash)
function toggleAccountSelectionVisibility() {
    const paymentVal = document.getElementById('exp-payment')?.value;
    const accountGroup = document.getElementById('exp-account-group');

    if (!accountGroup) return;

    if (paymentVal === 'UPI / GPay' || paymentVal === 'Card') {
        accountGroup.style.display = 'block';
    } else {
        accountGroup.style.display = 'none';
    }
}

// Populate Account/Card Dropdown Selection in Add Expense Modal
function populateAccountSelectOptions(selectedAccountName) {
    const accountSelect = document.getElementById('exp-account-select');
    if (!accountSelect) return;

    let optionsHTML = '';

    const defaultAccounts = [
        "Primary Bank Account",
        "HDFC Credit Card",
        "SBI Savings Account"
    ];

    if (appState.accounts && appState.accounts.length > 0) {
        appState.accounts.forEach(acc => {
            const shortNum = formatAccountShortNumber(acc.number || acc.type);
            const label = shortNum ? `${acc.name} (${shortNum})` : acc.name;
            optionsHTML += `<option value="${escapeHtml(acc.name)}">${escapeHtml(label)}</option>`;
        });
    }

    defaultAccounts.forEach(def => {
        if (!appState.accounts || !appState.accounts.some(a => a.name === def)) {
            optionsHTML += `<option value="${escapeHtml(def)}">${escapeHtml(def)}</option>`;
        }
    });

    accountSelect.innerHTML = optionsHTML;

    if (selectedAccountName) {
        accountSelect.value = selectedAccountName;
    }

    setupCustomSelect('exp-account-select');
}

// Populate Category Options in Add Expense Modal & Filter Dropdowns
function populateCategoryOptions(selectedCat) {
    const expCatSelect = document.getElementById('exp-category');
    const filterCatSelect = document.getElementById('filter-category');

    const defaultCats = [
        "Food & Dining",
        "Housing",
        "Shopping",
        "Utilities",
        "Transportation",
        "Entertainment",
        "Income"
    ];

    const customCats = appState.customCategories || [];
    const allCats = [...defaultCats, ...customCats.filter(c => !defaultCats.includes(c))];

    if (expCatSelect) {
        expCatSelect.innerHTML = allCats.map(c => `
            <option value="${escapeHtml(c)}">${c === 'Income' ? 'Income (Credit)' : escapeHtml(c)}</option>
        `).join('');
        if (selectedCat) expCatSelect.value = selectedCat;
        setupCustomSelect('exp-category');
    }

    if (filterCatSelect) {
        const currentFilterVal = filterCatSelect.value;
        filterCatSelect.innerHTML = `
            <option value="all">All Categories</option>
            ${allCats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)}
        `;
        if (currentFilterVal) filterCatSelect.value = currentFilterVal;
        setupCustomSelect('filter-category');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m];
    });
}
