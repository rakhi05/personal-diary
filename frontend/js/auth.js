/* =============================================================
   PERSONAL DIARY - auth.js
   Handles JWT authentication, login, registration, and route protection.
   ============================================================= */

const API_BASE_URL = 'http://localhost:5000/api';

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
        window.location.href = 'login.html';
    }

    /**
     * Enforces route protection.
     * Should be called on every page load.
     */
    static enforceRouteProtection() {
        const path = window.location.pathname;
        const publicPages = ['/login.html', '/register.html', '/forgot-password.html'];
        const isPublicPage = publicPages.some(p => path.includes(p));

        if (!this.isAuthenticated() && !isPublicPage && !path.endsWith('/') && !path.endsWith('/index.html') && !path.includes('about.html')) {
            // Force login for protected pages (write, entries, calendar)
            window.location.href = 'login.html';
        } else if (this.isAuthenticated() && isPublicPage) {
            // Redirect logged-in users away from login/register pages
            window.location.href = 'entries.html';
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
            // If they are logged in and no logout button exists, add it
            if (!document.getElementById('logoutBtn')) {
                const logoutBtn = document.createElement('button');
                logoutBtn.id = 'logoutBtn';
                logoutBtn.className = 'logout-btn';
                logoutBtn.innerText = '🚪 Logout';
                logoutBtn.onclick = () => Auth.logout();
                navContainer.appendChild(logoutBtn);
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
            // Remove logout button if it exists
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) logoutBtn.remove();

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
