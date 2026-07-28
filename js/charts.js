// Chart.js Line & Category Breakdown Doughnut Charts Engine

let incomeExpenseChartInstance = null;
let categoryChartInstance = null;

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
        const categoryMap = {};
        appState.transactions.forEach(t => {
            if (!t.isIncome && t.category !== 'Income') {
                categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
            }
        });

        const labels = Object.keys(categoryMap);
        const data = Object.values(categoryMap);
        const defaultColors = ['#10B981', '#06B6D4', '#6366F1', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6'];

        categoryChartInstance = new Chart(doughCtx, {
            type: 'doughnut',
            data: {
                labels: labels.length > 0 ? labels : ['Food & Dining', 'Housing', 'Shopping'],
                datasets: [{
                    data: data.length > 0 ? data : [1, 1, 1],
                    backgroundColor: defaultColors,
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
