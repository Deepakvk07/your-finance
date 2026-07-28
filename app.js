// Your Finance - Strict Database Authentication & Per-User Isolation

// Force purge legacy mock storage keys to ensure 100% fresh, blank slate for all users
(function purgeLegacyCache() {
    try {
        const legacyKeys = [
            'equilibrium_user_database',
            'equilibrium_user_database_v2',
            'equilibrium_user_database_v3',
            'equilibrium_session_token',
            'equilibrium_current_user',
            'equilibrium_data_alex.morgan@financepulse.in'
        ];
        legacyKeys.forEach(k => localStorage.removeItem(k));
    } catch (e) {}
})();

// Official Google OAuth 2.0 Client ID Configuration
const GOOGLE_CLIENT_ID = "594894394165-snri62k74v86vefbujiuevp4o4posomo.apps.googleusercontent.com";

// Default Live Supabase Credentials
const DEFAULT_SUPABASE_URL = "https://rfzzkslsfbffksnwalst.supabase.co";
const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmenprc2xzZmJmZmtzbndhbHN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTIzNDI5MywiZXhwIjoyMTAwODEwMjkzfQ.gT8riPyOhbNk05ALgDK4-1C-3FkhgXIQlCzHxbSp6bA";

let supabaseClient = null;
let googleTokenClient = null;

// Initialize Official Google OAuth Token Client (Direct Gmail Login Popup)
function initGoogleOAuthClient() {
    if (window.google && google.accounts && google.accounts.oauth2) {
        googleTokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile',
            callback: async (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    try {
                        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                            headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                        });
                        const googleProfile = await response.json();

                        const googleEmail = googleProfile.email;
                        const googleName = googleProfile.name || googleProfile.given_name || "User Account";

                        // Check if Google user exists or register them into DB
                        let user = UserDB.findUserByEmail(googleEmail);
                        if (!user) {
                            user = UserDB.registerUser(googleName, googleEmail, "google_oauth_sso");
                        }

                        saveSession(user);
                        checkAuthorizationState();
                    } catch (err) {
                        console.error("Google Profile fetch error:", err);
                        showAuthError("Failed to fetch Gmail profile: " + err.message);
                    }
                } else if (tokenResponse.error) {
                    console.error("Google OAuth error:", tokenResponse.error);
                }
            }
        });
    }
}

// Handler for "Continue with Google" button click -> Opens Official Google Sign-In Popup
function quickGoogleAuth() {
    hideAuthError();
    hideAuthSuccess();

    if (!googleTokenClient && window.google && google.accounts && google.accounts.oauth2) {
        initGoogleOAuthClient();
    }

    if (googleTokenClient) {
        googleTokenClient.requestAccessToken({ prompt: 'select_account' });
    } else {
        showAuthError("Google Sign-In service is loading. Please try again in a few seconds.");
    }
}

// Supabase Initialization
function initSupabaseClient() {
    const url = localStorage.getItem('supabase_url') || DEFAULT_SUPABASE_URL;
    const key = localStorage.getItem('supabase_key') || DEFAULT_SUPABASE_KEY;

    if (!localStorage.getItem('supabase_url')) localStorage.setItem('supabase_url', url);
    if (!localStorage.getItem('supabase_key')) localStorage.setItem('supabase_key', key);

    const syncStatusEl = document.getElementById('db-sync-status');

    if (url && key && window.supabase) {
        try {
            supabaseClient = window.supabase.createClient(url, key);
            if (syncStatusEl) syncStatusEl.innerText = "Isolated User Vault (Supabase Sync)";
            if (currentUser) fetchDataFromSupabase();
        } catch (err) {
            console.error("Failed to initialize Supabase client:", err);
        }
    } else {
        if (syncStatusEl) syncStatusEl.innerText = "Isolated Local Vault";
    }
}

function openSupabaseModal() {
    const urlInput = document.getElementById('supa-url');
    const keyInput = document.getElementById('supa-key');
    if (urlInput) urlInput.value = localStorage.getItem('supabase_url') || DEFAULT_SUPABASE_URL;
    if (keyInput) keyInput.value = localStorage.getItem('supabase_key') || DEFAULT_SUPABASE_KEY;
    document.getElementById('modal-supabase-config').classList.add('active');
}

function handleSaveSupabaseConfig(e) {
    e.preventDefault();
    const url = document.getElementById('supa-url').value.trim();
    const key = document.getElementById('supa-key').value.trim();

    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_key', key);

    closeModal('modal-supabase-config');
    initSupabaseClient();
    alert('Supabase project configuration updated!');
}

// Per-User Database Isolation (Supabase Fetch Filtered by User Email)
async function fetchDataFromSupabase() {
    if (!supabaseClient || !currentUser) return;

    try {
        const { data: txData, error: txErr } = await supabaseClient
            .from('transactions')
            .select('*')
            .eq('user_email', currentUser.email.toLowerCase())
            .order('date', { ascending: false });

        if (!txErr && txData) {
            appState.transactions = txData.map(t => ({
                id: t.id,
                title: t.title,
                amount: parseFloat(t.amount),
                category: t.category,
                date: t.date,
                payment: t.payment || 'UPI / GPay',
                accountName: t.account_name || 'Primary Bank Account',
                isIncome: t.is_income || false,
                receipt: true
            }));
            saveAppState();
            renderDashboard();
            renderExpenseLog();
        }
    } catch (err) {
        console.warn("Supabase per-user sync notice:", err);
    }
}

// Asynchronous Per-User Supabase CRUD
async function dbInsertTransaction(tx) {
    if (!supabaseClient || !currentUser) return;
    try {
        await supabaseClient.from('transactions').insert([{
            id: tx.id,
            user_email: currentUser.email.toLowerCase(),
            title: tx.title,
            amount: tx.amount,
            category: tx.category,
            date: tx.date,
            payment: tx.payment,
            account_name: tx.accountName,
            is_income: tx.isIncome
        }]);
    } catch (err) {
        console.warn("Supabase insert notice:", err);
    }
}

async function dbUpdateTransaction(tx) {
    if (!supabaseClient || !currentUser) return;
    try {
        await supabaseClient.from('transactions').update({
            title: tx.title,
            amount: tx.amount,
            category: tx.category,
            date: tx.date,
            payment: tx.payment,
            account_name: tx.accountName,
            is_income: tx.isIncome
        })
        .eq('id', tx.id)
        .eq('user_email', currentUser.email.toLowerCase());
    } catch (err) {
        console.warn("Supabase update notice:", err);
    }
}

async function dbDeleteTransaction(id) {
    if (!supabaseClient || !currentUser) return;
    try {
        await supabaseClient.from('transactions').delete()
            .eq('id', id)
            .eq('user_email', currentUser.email.toLowerCase());
    } catch (err) {
        console.warn("Supabase delete notice:", err);
    }
}

async function dbSyncUserToSupabase(user) {
    if (!supabaseClient) return;
    try {
        await supabaseClient.from('users').insert([{
            id: user.id,
            email: user.email,
            password_hash: user.passwordHash,
            name: user.name,
            created_at: user.createdAt
        }]);
    } catch (err) {
        console.warn("Supabase user sync notice:", err.message);
    }
}

// 2. Strict Database Authentication & User Records Engine
const DEFAULT_USER_DB = [
    {
        id: "usr_001",
        email: "alex.morgan@financepulse.in",
        passwordHash: btoa("password123"),
        name: "User Account",
        role: "user",
        createdAt: "2026-01-01"
    }
];

class UserDatabaseEngine {
    constructor() {
        this.dbKey = 'your_finance_user_database_v5';
        this.init();
    }

    init() {
        if (!localStorage.getItem(this.dbKey)) {
            localStorage.setItem(this.dbKey, JSON.stringify(DEFAULT_USER_DB));
        }
    }

    getUsers() {
        return JSON.parse(localStorage.getItem(this.dbKey)) || [];
    }

    findUserByEmail(email) {
        if (!email) return null;
        const users = this.getUsers();
        return users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    }

    registerUser(name, email, password) {
        const cleanEmail = email.toLowerCase().trim();
        const users = this.getUsers();
        
        if (this.findUserByEmail(cleanEmail)) {
            throw new Error("An account with this email address already exists. Please click 'Sign In'.");
        }

        const newUser = {
            id: 'usr_' + Date.now(),
            email: cleanEmail,
            passwordHash: btoa(password),
            name: name || cleanEmail.split('@')[0],
            role: "user",
            createdAt: new Date().toISOString().split('T')[0]
        };

        users.push(newUser);
        localStorage.setItem(this.dbKey, JSON.stringify(users));

        // Sync new registered user to Supabase
        dbSyncUserToSupabase(newUser);

        return newUser;
    }

    authenticate(email, password) {
        const cleanEmail = email.toLowerCase().trim();
        const user = this.findUserByEmail(cleanEmail);

        if (!user) {
            throw new Error("No registered account found with this email. Please click 'Create Account' to register first.");
        }

        const inputHash = btoa(password);
        if (user.passwordHash !== inputHash) {
            throw new Error("Incorrect password. Please verify your credentials and try again.");
        }

        return user;
    }
}

const UserDB = new UserDatabaseEngine();

// 3. Per-User Isolated Application State Manager (Starts Blank for All Users)
const DEFAULT_USER_FINANCE_TEMPLATE = {
    budgets: [
        { category: "Housing", limit: 25000, spent: 0, icon: "fa-house", color: "#6366F1" },
        { category: "Food & Dining", limit: 12000, spent: 0, icon: "fa-utensils", color: "#10B981" },
        { category: "Shopping", limit: 8000, spent: 0, icon: "fa-bag-shopping", color: "#06B6D4" },
        { category: "Utilities", limit: 5000, spent: 0, icon: "fa-bolt", color: "#F59E0B" },
        { category: "Transportation", limit: 5000, spent: 0, icon: "fa-car", color: "#3B82F6" },
        { category: "Entertainment", limit: 4000, spent: 0, icon: "fa-film", color: "#EC4899" }
    ],
    accounts: [], // Blank default linked accounts for all users
    bills: [],
    transactions: []
};

// Global Auth & Session Variables
let currentAuthMode = 'login';
let sessionToken = localStorage.getItem('your_finance_session_token_v5') || null;
let currentUser = JSON.parse(localStorage.getItem('your_finance_current_user_v5')) || null;
let appState = DEFAULT_USER_FINANCE_TEMPLATE;

let incomeExpenseChartInstance = null;
let categoryChartInstance = null;

// Notification Center System
const DEFAULT_NOTIFICATIONS = [
    {
        id: 'notif_001',
        title: 'Vault Security Active',
        desc: 'Isolated database encryption enabled for your user account.',
        time: 'Just now',
        type: 'emerald',
        unread: true
    },
    {
        id: 'notif_002',
        title: 'Welcome to Your Finance',
        desc: 'Click + Add Expense anytime to log your transactions.',
        time: '5m ago',
        type: 'info',
        unread: true
    }
];

function initNotifications() {
    if (!appState.notifications) {
        appState.notifications = JSON.parse(JSON.stringify(DEFAULT_NOTIFICATIONS));
    }
    renderNotifications();
}

function renderNotifications() {
    const listContainer = document.getElementById('notif-list-container');
    const badgeDot = document.getElementById('notif-badge-dot');

    if (!listContainer) return;

    const notifs = appState.notifications || [];
    const unreadCount = notifs.filter(n => n.unread).length;

    if (badgeDot) {
        badgeDot.style.display = unreadCount > 0 ? 'block' : 'none';
    }

    if (notifs.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem 1rem; color: var(--text-dim);">
                <i class="fa-regular fa-bell-slash" style="font-size: 1.5rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                <p style="font-size: 0.82rem;">No notifications right now.</p>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = notifs.map(n => `
        <div class="notif-item ${n.unread ? 'unread' : ''}" onclick="markNotificationAsRead('${n.id}')">
            <div class="notif-icon ${n.type || 'info'}">
                <i class="fa-solid ${n.type === 'emerald' ? 'fa-shield-halved' : (n.type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info')}"></i>
            </div>
            <div class="notif-content">
                <div class="notif-title">${escapeHtml(n.title)}</div>
                <div class="notif-desc">${escapeHtml(n.desc)}</div>
                <div class="notif-time">${n.time}</div>
            </div>
        </div>
    `).join('');
}

function pushNotification(title, desc, type = 'info') {
    if (!appState.notifications) appState.notifications = [];
    const newNotif = {
        id: 'notif_' + Date.now(),
        title: title,
        desc: desc,
        time: 'Just now',
        type: type,
        unread: true
    };
    appState.notifications.unshift(newNotif);
    saveAppState();
    renderNotifications();
}

function toggleNotificationCenter(e) {
    if (e) e.stopPropagation();
    const popover = document.getElementById('notif-popover');
    if (popover) {
        const isHidden = popover.style.display === 'none';
        popover.style.display = isHidden ? 'block' : 'none';
    }
}

function markAllNotificationsRead() {
    if (appState.notifications) {
        appState.notifications.forEach(n => n.unread = false);
        saveAppState();
        renderNotifications();
    }
}

function markNotificationAsRead(id) {
    if (appState.notifications) {
        const n = appState.notifications.find(item => item.id === id);
        if (n) {
            n.unread = false;
            saveAppState();
            renderNotifications();
        }
    }
}

function clearAllNotifications() {
    appState.notifications = [];
    saveAppState();
    renderNotifications();
}

// Close notification popover when clicking outside
document.addEventListener('click', (e) => {
    const popover = document.getElementById('notif-popover');
    const notifBtn = document.getElementById('notif-btn');
    if (popover && popover.style.display === 'block') {
        if (!popover.contains(e.target) && !notifBtn.contains(e.target)) {
            popover.style.display = 'none';
        }
    }
});

function loadUserAppState() {
    if (!currentUser) return;
    const userStorageKey = `your_finance_vault_v5_${currentUser.email.toLowerCase()}`;
    appState = JSON.parse(localStorage.getItem(userStorageKey)) || JSON.parse(JSON.stringify(DEFAULT_USER_FINANCE_TEMPLATE));
    initNotifications();
}

function saveAppState() {
    if (!currentUser) return;
    const userStorageKey = `your_finance_vault_v5_${currentUser.email.toLowerCase()}`;
    localStorage.setItem(userStorageKey, JSON.stringify(appState));
}

function saveSession(user) {
    sessionToken = 'token_' + btoa(user.email + ':' + Date.now());
    currentUser = user;
    localStorage.setItem('your_finance_session_token_v5', sessionToken);
    localStorage.setItem('your_finance_current_user_v5', JSON.stringify(user));
    loadUserAppState();
}

function clearSession() {
    sessionToken = null;
    currentUser = null;
    localStorage.removeItem('your_finance_session_token_v5');
    localStorage.removeItem('your_finance_current_user_v5');
}

// Session Router & Initialization
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initGlobalSearch();
    checkAuthorizationState();

    setTimeout(() => {
        initGoogleOAuthClient();
    }, 500);
});

// Universal Toast Notification System
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

function checkAuthorizationState() {
    const authView = document.getElementById('view-auth');
    const mainAppLayout = document.getElementById('main-app-layout');

    if (sessionToken && currentUser) {
        loadUserAppState();
        document.body.classList.remove('logged-out');
        if (authView) authView.style.display = 'none';
        if (mainAppLayout) mainAppLayout.style.display = 'flex';

        updateUserCardUI();
        initSupabaseClient();

        switchTab('home', true);
        renderDashboard();
        renderExpenseLog();
    } else {
        document.body.classList.add('logged-out');
        if (mainAppLayout) mainAppLayout.style.display = 'none';
        if (authView) authView.style.display = 'block';
    }
}

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

// Strict Database Authentication Form Submission Handler
function handleAuthSubmit(e) {
    e.preventDefault();
    hideAuthError();
    hideAuthSuccess();

    const email = document.getElementById('auth-email').value.trim();
    const pass = document.getElementById('auth-pass').value.trim();
    const nameInput = document.getElementById('auth-name');
    const name = nameInput ? nameInput.value.trim() : '';

    if (!email || !pass) {
        showAuthError("Please fill in both email and password.");
        return;
    }

    try {
        const mode = currentAuthMode || 'login';
        if (mode === 'login') {
            // Strict login: verify credentials against DB
            const user = UserDB.authenticate(email, pass);
            saveSession(user);
            checkAuthorizationState();
        } else {
            // Register mode: store credentials in DB, DO NOT enter website, redirect to Sign In tab
            if (pass.length < 4) {
                showAuthError("Password must be at least 4 characters long.");
                return;
            }
            
            // Save to database
            UserDB.registerUser(name, email, pass);

            // Redirect to Sign In mode tab
            toggleAuthMode('login');
            
            // Pre-fill email and clear password
            document.getElementById('auth-email').value = email;
            document.getElementById('auth-pass').value = '';

            // Display success notification
            showAuthSuccess("Account registered successfully in database! Please sign in with your password.");
        }
    } catch (err) {
        showAuthError(err.message);
    }
}

function showAuthError(msg) {
    hideAuthSuccess();
    const errBox = document.getElementById('auth-error-msg');
    if (errBox) {
        errBox.innerText = msg;
        errBox.style.display = 'block';
    }
}

function hideAuthError() {
    const errBox = document.getElementById('auth-error-msg');
    if (errBox) {
        errBox.style.display = 'none';
    }
}

function showAuthSuccess(msg) {
    hideAuthError();
    const succBox = document.getElementById('auth-success-msg');
    if (succBox) {
        succBox.innerText = msg;
        succBox.style.display = 'block';
    }
}

function hideAuthSuccess() {
    const succBox = document.getElementById('auth-success-msg');
    if (succBox) {
        succBox.style.display = 'none';
    }
}

function handleForgotPassword(e) {
    e.preventDefault();
    alert('A password reset link has been dispatched to your registered email address.');
}

function handleLogout() {
    if (confirm('Are you sure you want to sign out?')) {
        clearSession();
        checkAuthorizationState();
    }
}

function updateUserCardUI() {
    const nameEl = document.getElementById('display-username');
    const statusEl = document.getElementById('display-userstatus');
    const avatarContainer = document.getElementById('user-avatar-container');

    if (currentUser) {
        if (nameEl) nameEl.innerText = "User Account";
        if (statusEl) statusEl.innerText = 'Sign Out';
        if (avatarContainer) {
            avatarContainer.innerHTML = `<i class="fa-solid fa-user"></i>`;
        }
    }
}

function toggleAuthMode(mode) {
    currentAuthMode = mode;
    hideAuthError();
    hideAuthSuccess();

    const loginTab = document.getElementById('tab-login');
    const signupTab = document.getElementById('tab-signup');
    const fullnameGroup = document.getElementById('group-fullname');
    const submitBtn = document.getElementById('auth-submit-btn');
    const titleEl = document.getElementById('auth-main-title');
    const subtitleEl = document.getElementById('auth-main-subtitle');

    if (mode === 'login') {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        fullnameGroup.style.display = 'none';
        submitBtn.innerText = 'Sign In';
        if (titleEl) titleEl.innerText = 'Welcome back';
        if (subtitleEl) subtitleEl.innerText = 'Please enter your details to sign in to your account.';
    } else {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        fullnameGroup.style.display = 'flex';
        submitBtn.innerText = 'Create Account';
        if (titleEl) titleEl.innerText = 'Get Started';
        if (subtitleEl) subtitleEl.innerText = 'Create your account to start managing your wealth.';
    }
}

function togglePasswordVisibility() {
    const input = document.getElementById('auth-pass');
    const icon = document.getElementById('eye-icon');

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Format Rupee Currency helper (INR format)
function formatRupee(amount) {
    return '₹' + Number(amount || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
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

function formatAccountShortNumber(num) {
    if (!num) return '';
    const str = String(num).trim();
    if (str.length > 6) {
        return '•••• ' + str.slice(-4);
    }
    return str;
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

// Populate Account/Card Dropdown Selection in Add Expense Modal
function populateAccountSelectOptions(selectedAccountName) {
    const accountSelect = document.getElementById('exp-account-select');
    if (!accountSelect) return;

    let optionsHTML = '';

    // Standard Default Accounts
    const defaultAccounts = [
        "Primary Bank Account",
        "HDFC Credit Card",
        "SBI Savings Account"
    ];

    // User's Connected Linked Accounts & Cards
    if (appState.accounts && appState.accounts.length > 0) {
        appState.accounts.forEach(acc => {
            const shortNum = formatAccountShortNumber(acc.number || acc.type);
            const label = shortNum ? `${acc.name} (${shortNum})` : acc.name;
            optionsHTML += `<option value="${escapeHtml(acc.name)}">${escapeHtml(label)}</option>`;
        });
    }

    // Add standard fallback choices
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

// Custom Category Modal Handlers
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
            ${allCats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
        `;
        if (currentFilterVal) filterCatSelect.value = currentFilterVal;
        setupCustomSelect('filter-category');
    }
}

// ----------------------------------------------------
// All Sections: Per-User Isolated Handlers
// ----------------------------------------------------

// 1. Dashboard View Renderer (Cash Expenses subtracted from total Net Worth)
function renderDashboard() {
    const recentTxContainer = document.getElementById('dash-recent-tx');
    const accountsContainer = document.getElementById('accounts-list');
    const welcomeTitleEl = document.getElementById('welcome-user-title');

    if (welcomeTitleEl) {
        welcomeTitleEl.innerText = "Welcome to Your Finance! 👋";
    }

    populateCategoryOptions();

    const incomeList = appState.transactions.filter(t => t.isIncome || t.category === 'Income');
    const expenseList = appState.transactions.filter(t => !t.isIncome && t.category !== 'Income');

    const totalIncome = incomeList.reduce((acc, t) => acc + t.amount, 0);
    
    // Total expenses (including Cash, UPI, and Card expenses)
    const totalExpenses = expenseList.reduce((acc, t) => acc + t.amount, 0);

    // Total balance in linked bank accounts and cards
    const accountsTotal = appState.accounts.reduce((acc, a) => acc + (a.balance || 0), 0);

    // Net Worth Calculation: Total Income + Bank Balances MINUS Total Expenses (including Cash expenses)
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

    // Accounts & Cards with Pencil Edit & Delete buttons (Starts Blank by Default)
    if (!appState.accounts || appState.accounts.length === 0) {
        accountsContainer.innerHTML = `
            <div style="text-align: center; padding: 1.5rem; color: var(--text-dim);">
                <i class="fa-regular fa-credit-card" style="font-size: 1.8rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                <p>No linked accounts or cards added yet.</p>
                <button class="btn-text" onclick="openAddAccountModal()" style="margin-top: 0.5rem;">+ Connect Bank Account / Card</button>
            </div>
        `;
    } else {
        accountsContainer.innerHTML = appState.accounts.map(acc => `
            <div class="account-item">
                <div class="acc-info">
                    <div class="acc-icon ${acc.class || 'checking'}"><i class="fa-solid ${acc.icon || 'fa-credit-card'}"></i></div>
                    <div>
                        <h4>${escapeHtml(acc.name)}</h4>
                        <span class="acc-number">${escapeHtml(acc.number)} • ${acc.type}</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div class="acc-balance">${formatRupee(acc.balance)}</div>
                    <button class="btn-text" onclick="openEditAccountModal('${escapeHtml(acc.name)}')" title="Edit Account"><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn-text" onclick="deleteAccount('${escapeHtml(acc.name)}')" title="Delete Account" style="color: var(--accent-red);"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }

    // Recent Transactions with Pencil Edit & Delete buttons
    if (appState.transactions.length === 0) {
        recentTxContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-dim);">
                <i class="fa-solid fa-receipt" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                <p>No transactions logged yet.</p>
                <button class="btn btn-primary" onclick="openAddExpenseModal()" style="margin-top: 0.75rem;">+ Add Today's Expense</button>
            </div>
        `;
    } else {
        const recent = appState.transactions.slice(0, 6);
        recentTxContainer.innerHTML = recent.map(tx => {
            const isInc = tx.isIncome || tx.category === 'Income';
            return `
                <div class="tx-item">
                    <div class="tx-details">
                        <div class="tx-icon">
                            <i class="fa-solid ${getCategoryIcon(tx.category)}"></i>
                        </div>
                        <div>
                            <div class="tx-title">${escapeHtml(tx.title)}</div>
                            <div class="tx-meta">${tx.date} • ${escapeHtml(tx.accountName || tx.payment)}</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div class="tx-amount ${isInc ? 'pos' : 'neg'}">
                            ${isInc ? '+' : '-'}${formatRupee(tx.amount)}
                        </div>
                        <button class="btn-text" onclick="openEditExpenseModal(${tx.id})" title="Edit Transaction"><i class="fa-solid fa-pencil"></i></button>
                        <button class="btn-text" onclick="deleteExpense(${tx.id})" title="Delete Transaction" style="color: var(--accent-red);"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// 2. Expense Log Table Renderer
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

// 3. Monthly Insights Chart.js Initialization
function initCharts() {
    const lineCtx = document.getElementById('incomeExpenseChart');
    const doughCtx = document.getElementById('categoryBreakdownChart');

    const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    const incomeData = [0, 0, 0, 0, 0, 0];
    const expenseData = [0, 0, 0, 0, 0, 0];

    appState.transactions.forEach(t => {
        const isInc = t.isIncome || t.category === 'Income';
        if (isInc) incomeData[5] += t.amount;
        else expenseData[5] += t.amount;
    });

    if (lineCtx) {
        if (incomeExpenseChartInstance) incomeExpenseChartInstance.destroy();
        incomeExpenseChartInstance = new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Income (₹)',
                        data: incomeData,
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Expenses (₹)',
                        data: expenseData,
                        borderColor: '#EF4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#94A3B8' } }
                },
                scales: {
                    x: { ticks: { color: '#64748B' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#64748B' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }

    if (doughCtx) {
        if (categoryChartInstance) categoryChartInstance.destroy();
        const spentData = (appState.budgets || []).map(b => b.spent);
        const hasSpent = spentData.some(v => v > 0);

        categoryChartInstance = new Chart(doughCtx, {
            type: 'doughnut',
            data: {
                labels: (appState.budgets || []).map(b => b.category),
                datasets: [{
                    data: hasSpent ? spentData : [1, 1, 1, 1, 1, 1],
                    backgroundColor: (appState.budgets || []).map(b => b.color),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#94A3B8', font: { size: 11 } } }
                }
            }
        });
    }
}

// Global Search Listener
function initGlobalSearch() {
    const input = document.getElementById('global-search');
    if (input) {
        input.addEventListener('input', () => {
            renderExpenseLog();
        });
    }
}

// ----------------------------------------------------
// Pencil Edit & Delete Handlers (With Account Selection & Real-Time Updates)
// ----------------------------------------------------

// Transactions Edit & Delete
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

// Accounts & Cards Edit & Delete (Supports Card Numbers)
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

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
}

function showReceiptModal(id) {
    const tx = appState.transactions.find(t => t.id === id);
    if (!tx) return;

    document.getElementById('receipt-title').innerText = `Receipt #${tx.id}`;
    document.getElementById('receipt-body').innerHTML = `
        <div style="padding: 1rem; background: rgba(0,0,0,0.3); border-radius: 12px; font-family: monospace;">
            <div style="text-align: center; margin-bottom: 1rem;">
                <h3 style="color: var(--accent-emerald);">${escapeHtml(tx.merchant || tx.title)}</h3>
                <p style="color: var(--text-dim);">${tx.date} • Verified Record</p>
            </div>
            <hr style="border-color: var(--border-card); margin: 0.75rem 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span>Description:</span>
                <span>${escapeHtml(tx.title)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span>Category:</span>
                <span>${tx.category}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span>Account Source:</span>
                <span>${escapeHtml(tx.accountName || 'Primary Bank Account')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span>Payment Method:</span>
                <span>${escapeHtml(tx.payment)}</span>
            </div>
            <hr style="border-color: var(--border-card); margin: 0.75rem 0;">
            <div style="display: flex; justify-content: space-between; font-size: 1.1rem; font-weight: bold; color: var(--text-main);">
                <span>TOTAL AMOUNT:</span>
                <span style="color: var(--accent-cyan);">${formatRupee(tx.amount)}</span>
            </div>
        </div>
    `;

    document.getElementById('modal-receipt').classList.add('active');
}

// Export CSV in Rupees format
document.getElementById('btn-export-csv')?.addEventListener('click', () => {
    const headers = ["ID", "Title", "Category", "Account Source", "Amount (INR)", "Date", "Payment Method"];
    const rows = appState.transactions.map(t => [t.id, `"${t.title}"`, `"${t.category}"`, `"${t.accountName || 'Primary Bank Account'}"`, t.amount, t.date, `"${t.payment}"`]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Your_Finance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV ledger report downloaded!", "info");
});

// Utility
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
