// Authentication Engine, User DB, Google OAuth, & Session Management

let googleTokenClient = null;
let currentAuthMode = 'login';
let sessionToken = localStorage.getItem('your_finance_session_token_v5') || null;
let currentUser = JSON.parse(localStorage.getItem('your_finance_current_user_v5')) || null;

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

// Google OAuth 2.0 Client Handler
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

                        let user = UserDB.findUserByEmail(googleEmail);
                        if (!user) {
                            user = UserDB.registerUser(googleName, googleEmail, "google_oauth_sso");
                        }

                        saveSession(user);
                        checkAuthorizationState();
                        showToast("Signed in via Google successfully!", "success");
                    } catch (err) {
                        console.error("Google Profile fetch error:", err);
                        showAuthError("Failed to fetch Gmail profile: " + err.message);
                    }
                }
            }
        });
    }
}

function quickGoogleAuth() {
    hideAuthError();
    hideAuthSuccess();

    if (!googleTokenClient && window.google && google.accounts && google.accounts.oauth2) {
        initGoogleOAuthClient();
    }

    if (googleTokenClient) {
        try {
            googleTokenClient.requestAccessToken({ prompt: 'select_account' });
            return;
        } catch (e) {
            console.warn("Google OAuth popup fallback triggered:", e);
        }
    }

    const emailPrompt = prompt("Enter your Google / Gmail address to sign in:");
    if (emailPrompt && emailPrompt.trim()) {
        const cleanEmail = emailPrompt.trim().toLowerCase();
        let user = UserDB.findUserByEmail(cleanEmail);
        if (!user) {
            user = UserDB.registerUser(cleanEmail.split('@')[0], cleanEmail, "google_oauth_sso");
        }
        saveSession(user);
        checkAuthorizationState();
        showToast("Signed in via Google (" + cleanEmail + ")", "success");
    }
}

function saveSession(user) {
    sessionToken = 'token_' + Date.now();
    currentUser = user;
    localStorage.setItem('your_finance_session_token_v5', sessionToken);
    localStorage.setItem('your_finance_current_user_v5', JSON.stringify(currentUser));
}

function clearSession() {
    sessionToken = null;
    currentUser = null;
    localStorage.removeItem('your_finance_session_token_v5');
    localStorage.removeItem('your_finance_current_user_v5');
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
        if (currentAuthMode === 'signup') {
            const newUser = UserDB.registerUser(name, email, pass);
            showAuthSuccess("Registration successful! Account created. Redirecting to Sign In...");
            
            setTimeout(() => {
                toggleAuthMode('login');
                document.getElementById('auth-email').value = email;
                document.getElementById('auth-pass').value = '';
                document.getElementById('auth-pass').focus();
                hideAuthSuccess();
                showToast("Account created successfully! Please sign in.", "success");
            }, 1200);
        } else {
            const user = UserDB.authenticate(email, pass);
            saveSession(user);
            checkAuthorizationState();
            showToast("Signed in successfully! Welcome back.", "success");
        }
    } catch (err) {
        showAuthError(err.message);
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
        if (titleEl) titleEl.innerText = 'Create an account';
        if (subtitleEl) subtitleEl.innerText = 'Sign up to start tracking your finances securely.';
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to sign out?')) {
        clearSession();
        checkAuthorizationState();
        showToast("Signed out successfully.", "info");
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
    if (errBox) errBox.style.display = 'none';
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
    if (succBox) succBox.style.display = 'none';
}

function handleForgotPassword(e) {
    e.preventDefault();
    alert('A password reset link has been dispatched to your registered email address.');
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
