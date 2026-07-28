// Notification Center Engine & Drawer System

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
        showToast("All notifications marked as read", "info");
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
    showToast("Notifications cleared", "info");
}

document.addEventListener('click', (e) => {
    const popover = document.getElementById('notif-popover');
    const notifBtn = document.getElementById('notif-btn');
    if (popover && popover.style.display === 'block') {
        if (!popover.contains(e.target) && !notifBtn.contains(e.target)) {
            popover.style.display = 'none';
        }
    }
});
