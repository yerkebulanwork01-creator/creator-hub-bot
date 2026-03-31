const BASE = import.meta.env.VITE_API_URL || '';
let token = localStorage.getItem('chub_token');

export const setToken = (t) => {
  token = t;
  localStorage.setItem('chub_token', t);
};

export const clearToken = () => {
  token = null;
  localStorage.removeItem('chub_token');
};

async function req(path, opts = {}) {
  const url = `${BASE}/api${path}`;
  console.log('API REQUEST:', url, opts);

  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...opts.headers,
    },
  });

  const raw = await res.text();
  console.log('API RESPONSE:', url, res.status, raw);

  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(`JSON емес жауап: ${raw.slice(0, 200)}`);
  }

  if (!res.ok) throw new Error(data.error || 'Қате');
  return data;
}

export const authTelegram = (initData) =>
  req('/auth/telegram', {
    method: 'POST',
    body: JSON.stringify({ initData }),
  });

export const linkAccount = (initData, regId) =>
  req('/auth/link', {
    method: 'POST',
    body: JSON.stringify({ initData, registrationId: regId }),
  });

export const getProfile = () => req('/participants/me');
export const getMyEvents = () => req('/participants/me/events');
export const getMyPoints = () => req('/participants/me/points');
export const getMyAttendance = () => req('/attendance/my');

export const generateQr = (eventId) =>
  req('/qr/generate', {
    method: 'POST',
    body: JSON.stringify({ eventId }),
  });

export const verifyQr = (payload) =>
  req('/qr/verify', {
    method: 'POST',
    body: JSON.stringify({ payload }),
  });

export const scanAttendance = (d) =>
  req('/attendance/scan', {
    method: 'POST',
    body: JSON.stringify(d),
  });

export const getEventReport = (id) => req(`/attendance/event/${id}`);
export const getDashboard = () => req('/admin/dashboard');
export const getAdminEvents = () => req('/admin/events');

export const createEvent = (d) =>
  req('/admin/events', {
    method: 'POST',
    body: JSON.stringify(d),
  });

export const broadcast = (d) =>
  req('/admin/broadcast', {
    method: 'POST',
    body: JSON.stringify(d),
  });
