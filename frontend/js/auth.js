const isLoggedIn = () => localStorage.getItem('isLoggedIn') === 'true';

function checkLoginStatus() {
    const appContent = document.getElementById('app-content');
    const loginSection = document.getElementById('login-section');
    const logoutButtonLi = document.getElementById('logout-button-li');
    const body = document.body;

    if (isLoggedIn()) {
        if (appContent) appContent.classList.remove('hidden');
        if (loginSection) loginSection.classList.add('hidden');
        if (logoutButtonLi) logoutButtonLi.classList.remove('hidden');
        body.classList.remove('login-body'); // Remove login-specific body styles
        body.style.overflow = 'hidden'; // Keep the app layout non-scrollable
    } else {
        if (appContent) appContent.classList.add('hidden');
        if (loginSection) loginSection.classList.remove('hidden');
        if (logoutButtonLi) logoutButtonLi.classList.add('hidden');
        body.classList.add('login-body'); // Apply login-specific body styles
        body.style.overflow = 'hidden'; // Prevent scrolling on login page
    }
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    checkLoginStatus(); // Update UI to show login form
}

document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus(); // Initial check on page load

    const loginForm = document.getElementById('login-form');
    const logoutButton = document.getElementById('logout-button');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const username = loginForm.username.value;
            const password = loginForm.password.value;

            if (username === 'admin' && password === 'admin123') {
                // Store authentication status
                localStorage.setItem('isLoggedIn', 'true');
                checkLoginStatus(); // Update UI to show app content
            } else {
                alert('Invalid credentials');
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
});