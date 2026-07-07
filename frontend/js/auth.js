/* =============================================================
   PERSONAL DIARY - auth.js
   Handles JWT authentication, login, registration, and route protection.
   ============================================================= */

// Update this to your deployed Render backend URL when you deploy the backend to Render
const PRODUCTION_BACKEND_URL = 'https://personal-diary-backend.onrender.com';

const SERVER_URL = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' || 
                   window.location.protocol === 'file:'
    ? 'http://localhost:5000'
    : PRODUCTION_BACKEND_URL;

const API_BASE_URL = `${SERVER_URL}/api`;

class Auth {
    static API_URL = `${API_BASE_URL}/auth`;

    /**
     * Checks if a user is currently logged in by checking for a token.
     */
    static isAuthenticated() {
        return !!localStorage.getItem('diaryToken');
    }

    /**
     * Gets the current auth token.
     */
    static getToken() {
        return localStorage.getItem('diaryToken');
    }

    /**
     * Registers a new user.
     */
    static async register(username, password, security_question, security_answer) {
        try {
            const res = await fetch(`${Auth.API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, security_question, security_answer })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Registration failed');
            return data;
        } catch (err) {
            throw err;
        }
    }

    /**
     * Logs in a user and stores the token.
     */
    static async login(username, password) {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');
            
            // Store token and user details
            localStorage.setItem('diaryToken', data.token);
            localStorage.setItem('diaryUser', JSON.stringify(data.user));
            return data;
        } catch (err) {
            throw err;
        }
    }

    /**
     * Logs the user out by removing the token and redirecting to login.
     */
    static logout() {
        localStorage.removeItem('diaryToken');
        localStorage.removeItem('diaryUser');
        localStorage.removeItem('diaryEntries');
        window.location.href = 'login.html';
    }

    /**
     * Enforces route protection.
     * Should be called on every page load.
     */
    static enforceRouteProtection() {
        const path = window.location.pathname.toLowerCase();
        
        // Define public pages
        const isIndex = path === '/' || path.endsWith('/index.html') || path.endsWith('/');
        const isAbout = path.endsWith('/about.html');
        const isLogin = path.endsWith('/login.html');
        const isRegister = path.endsWith('/register.html');
        const isForgotPassword = path.endsWith('/forgot-password.html');
        
        const isPublicPage = isIndex || isAbout || isLogin || isRegister || isForgotPassword;

        if (!this.isAuthenticated()) {
            if (!isPublicPage) {
                // Force login for protected pages (write, entries, calendar)
                window.location.href = 'login.html';
            }
        } else {
            // Redirect logged-in users away from login/register/forgot-password pages
            if (isLogin || isRegister || isForgotPassword) {
                window.location.href = 'entries.html';
            }
        }
    }

    /**
     * Updates the navigation bar to show/hide Logout based on auth state.
     */
    static updateNavigation() {
        const navContainer = document.querySelector('.nav-actions') || document.querySelector('nav');
        const navLinksContainer = document.querySelector('.nav-links') || document.querySelector('nav');
        if (!navContainer || !navLinksContainer) return;

        if (this.isAuthenticated()) {
            // Remove legacy logout button if present
            const legacyLogoutBtn = document.getElementById('logoutBtn');
            if (legacyLogoutBtn) legacyLogoutBtn.remove();

            // Create profile dropdown menu if not exists
            if (!document.getElementById('profileMenuContainer')) {
                const userStr = localStorage.getItem('diaryUser');
                const user = userStr ? JSON.parse(userStr) : null;
                const username = user ? user.username : 'User';
                const initial = username.charAt(0).toUpperCase();

                const menuContainer = document.createElement('div');
                menuContainer.id = 'profileMenuContainer';
                menuContainer.className = 'profile-menu-container';
                menuContainer.innerHTML = `
                    <button class="profile-btn" id="profileBtn" aria-expanded="false" aria-haspopup="true">
                        <span class="profile-avatar">${initial}</span>
                        <span class="profile-username">${username}</span>
                        <span class="profile-caret">▼</span>
                    </button>
                    <div class="profile-dropdown" id="profileDropdown" aria-hidden="true">
                        <div class="dropdown-header">
                            <p class="dropdown-user-name">${username}</p>
                            <p class="dropdown-user-label">Journal Owner</p>
                        </div>
                        <div class="dropdown-divider"></div>
                        <a href="entries.html" class="dropdown-item">📔 My Entries</a>
                        <a href="write.html" class="dropdown-item">✍️ Write Entry</a>
                        <a href="calendar.html" class="dropdown-item">📅 Calendar View</a>
                        <div class="dropdown-divider"></div>
                        <button id="dropdownLogoutBtn" class="dropdown-item dropdown-logout-btn">🚪 Logout</button>
                    </div>
                `;
                navContainer.appendChild(menuContainer);

                // Attach toggle click handler
                const profileBtn = menuContainer.querySelector('#profileBtn');
                const dropdown = menuContainer.querySelector('#profileDropdown');
                
                profileBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isExpanded = profileBtn.getAttribute('aria-expanded') === 'true';
                    profileBtn.setAttribute('aria-expanded', !isExpanded);
                    dropdown.classList.toggle('open');
                    dropdown.setAttribute('aria-hidden', isExpanded);
                });

                // Attach logout handler
                menuContainer.querySelector('#dropdownLogoutBtn').addEventListener('click', () => {
                    Auth.logout();
                });
            }
            
            // Hide login/register links if they exist
            document.querySelectorAll('.auth-link').forEach(el => el.style.display = 'none');
            
            // Show protected links
            const protectedHrefs = ['write.html', 'entries.html', 'calendar.html'];
            document.querySelectorAll('.nav-links a, nav a').forEach(a => {
                const href = a.getAttribute('href');
                if (protectedHrefs.includes(href)) {
                    a.style.display = 'inline-block';
                }
            });
        } else {
            // User is not logged in
            // Remove profile menu if it exists
            const menuContainer = document.getElementById('profileMenuContainer');
            if (menuContainer) menuContainer.remove();

            // Add Login / Register links if they don't exist
            if (!document.getElementById('loginLink')) {
                const loginLink = document.createElement('a');
                loginLink.href = 'login.html';
                loginLink.id = 'loginLink';
                loginLink.className = 'auth-link';
                loginLink.innerText = 'Login';
                navLinksContainer.appendChild(loginLink);

                const regLink = document.createElement('a');
                regLink.href = 'register.html';
                regLink.id = 'regLink';
                regLink.className = 'auth-link';
                regLink.innerText = 'Register';
                navLinksContainer.appendChild(regLink);
            } else {
                document.querySelectorAll('.auth-link').forEach(el => el.style.display = 'inline-block');
            }
            
            // Hide protected links
            const protectedHrefs = ['write.html', 'entries.html', 'calendar.html'];
            document.querySelectorAll('.nav-links a, nav a').forEach(a => {
                const href = a.getAttribute('href');
                if (protectedHrefs.includes(href)) {
                    a.style.display = 'none';
                }
            });
        }
    }

    static async checkSecurityQuestion() {
        const username = document.getElementById('resetUsername').value.trim();
        if (!username) return alert('Please enter your username.');

        try {
            const response = await fetch(`${Auth.API_URL}/get-security-question`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            // Hide step 1, show step 2
            document.getElementById('step1').style.display = 'none';
            document.getElementById('step2').style.display = 'block';
            document.getElementById('displaySecurityQuestion').innerText = data.security_question;
        } catch (err) {
            alert(err.message);
        }
    }

    static async handleResetPassword(event) {
        event.preventDefault();
        const username = document.getElementById('resetUsername').value.trim();
        const security_answer = document.getElementById('resetSecurityAnswer').value.trim();
        const new_password = document.getElementById('resetNewPassword').value;

        if (!security_answer || !new_password) return;

        try {
            const response = await fetch(`${Auth.API_URL}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, security_answer, new_password })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            alert('Password reset successful! You can now log in.');
            window.location.href = 'login.html';
        } catch (err) {
            alert(err.message);
        }
    }
}

// Run protection and nav update immediately
Auth.enforceRouteProtection();

document.addEventListener('DOMContentLoaded', () => {
    Auth.updateNavigation();
});

// Close profile dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('profileDropdown');
    const profileBtn = document.getElementById('profileBtn');
    if (dropdown && dropdown.classList.contains('open')) {
        if (!dropdown.contains(e.target) && !profileBtn.contains(e.target)) {
            dropdown.classList.remove('open');
            profileBtn.setAttribute('aria-expanded', 'false');
            dropdown.setAttribute('aria-hidden', 'true');
        }
    }
});
