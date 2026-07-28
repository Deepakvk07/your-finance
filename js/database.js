// Supabase Async CRUD & Per-User Local Vault State Manager

let supabaseClient = null;

const DEFAULT_USER_FINANCE_TEMPLATE = {
    accounts: [],
    transactions: [],
    customCategories: [],
    notifications: []
};

let appState = DEFAULT_USER_FINANCE_TEMPLATE;

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
