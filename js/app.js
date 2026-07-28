// Your Finance - Main Application Bootstrap & Entry Point

// Self-executing cache purge for legacy keys
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

// Document Ready Initialization
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initGlobalSearch();
    checkAuthorizationState();

    // Export CSV Listener
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

    // Initialize custom selects on filter dropdowns
    setupCustomSelect('filter-category');
    setupCustomSelect('filter-payment');

    // Category and Payment Filter listeners
    document.getElementById('filter-category')?.addEventListener('change', () => renderExpenseLog());
    document.getElementById('filter-payment')?.addEventListener('change', () => renderExpenseLog());
});
