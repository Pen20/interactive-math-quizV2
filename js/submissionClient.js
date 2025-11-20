// Client helper to save quiz submissions to the server
window.SubmissionClient = (function () {
  async function save(payload) {
    const token = localStorage.getItem('auth_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    try {
      return await res.json();
    } catch (e) {
      return { error: 'Invalid JSON response from server' };
    }
  }

  return { save };
})();
