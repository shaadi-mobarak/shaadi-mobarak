// Same-origin in production (the server serves this bundle), localhost only for local dev.
const API = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');
export async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }, ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}
export function apiForm(path, formData) {
  return fetch(`${API}${path}`, { method: 'POST', credentials: 'include', body: formData }).then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.message || 'Upload failed'); return d; });
}
export default API;
