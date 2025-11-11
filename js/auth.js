const API_BASE = 
  (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? ''
    : '';

function saveSession(token, user) {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('auth_user', JSON.stringify(user || {}));
}

function clearSession() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

function signOut() {
  clearSession();
  // go to login page
  location.replace('/html/auth/login.html');
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('auth_user') || '{}');
  } catch (e) {
    return {};
  }
}

// expose lightweight API for other scripts
window.auth = Object.assign(window.auth || {}, {
  saveSession,
  clearSession,
  signOut,
  getCurrentUser,
  getToken: () => localStorage.getItem('auth_token'),
});

async function post(path, body) {
  const res = await fetch('/api/auth' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const data = await post('/login', { email, password });
      if (data?.token) {
        saveSession(data.token, data.user);
        const params = new URLSearchParams(location.search);
        const next = params.get('next') || '/';
        location.href = decodeURIComponent(next);
      } else {
        alert(data?.error || 'Login failed');
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      const data = await post('/signup', { name, email, password });
      if (data?.token) {
        saveSession(data.token, data.user);
        const params = new URLSearchParams(location.search);
        const next = params.get('next') || '/';
        location.href = decodeURIComponent(next);
      } else {
        alert(data?.error || 'Signup failed');
      }
    });
  }
});
