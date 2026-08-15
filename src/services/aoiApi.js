/**
 * AOI API client — wraps all /aois backend calls with Firebase ID token auth.
 * Import `saveAoi`, `listAois`, `deleteAoi`, `refreshAoiStatus` as needed.
 */

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "https://hwasat-backend-r5rykfbhxa-ew.a.run.app";

async function _authHeaders(user) {
  const token = await user.getIdToken();
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

async function _handleResponse(res) {
  if (res.ok) return res.json();
  let detail = `HTTP ${res.status}`;
  try {
    const body = await res.json();
    detail = body.detail || detail;
  } catch (_) {}
  throw new Error(detail);
}

/** Save a new AOI for the signed-in user.
 * @param {object} user  Firebase User object (from onAuthStateChanged)
 * @param {object} opts  { name, geometry, default_dataset, default_index }
 * @returns {Promise<object>} The saved AOI document
 */
export async function saveAoi(user, { name, geometry, default_dataset, default_index }) {
  const headers = await _authHeaders(user);
  const res = await fetch(`${BACKEND_URL}/aois`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name, geometry, default_dataset, default_index }),
  });
  return _handleResponse(res);
}

/** Fetch all saved AOIs for the signed-in user.
 * @param {object} user  Firebase User object
 * @returns {Promise<Array>} List of AOI documents, newest first
 */
export async function listAois(user) {
  const token = await user.getIdToken();
  const res = await fetch(`${BACKEND_URL}/aois`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return _handleResponse(res);
}

/** Fetch a single AOI by ID.
 * @param {object} user   Firebase User object
 * @param {string} aoiId  AOI ID (8-char hex)
 * @returns {Promise<object>}
 */
export async function getAoi(user, aoiId) {
  const token = await user.getIdToken();
  const res = await fetch(`${BACKEND_URL}/aois/${aoiId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return _handleResponse(res);
}

/** Delete a saved AOI.
 * @param {object} user   Firebase User object
 * @param {string} aoiId  AOI ID
 * @returns {Promise<{success: true}>}
 */
export async function deleteAoi(user, aoiId) {
  const token = await user.getIdToken();
  const res = await fetch(`${BACKEND_URL}/aois/${aoiId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return _handleResponse(res);
}

/** Recompute and persist the latest status for an AOI (calls GEE).
 * @param {object} user   Firebase User object
 * @param {string} aoiId  AOI ID
 * @returns {Promise<object>} Updated status object
 */
export async function refreshAoiStatus(user, aoiId) {
  const headers = await _authHeaders(user);
  const res = await fetch(`${BACKEND_URL}/aois/${aoiId}/refresh_status`, {
    method: "POST",
    headers,
  });
  return _handleResponse(res);
}

/** Compute on-demand monitoring statistics for an AOI.
 * Returns { category, dataset, indices: {INDEX: value}, date_from, date_to, fallback, computed_at }
 * @param {object} user        Firebase User object
 * @param {string} aoiId       AOI ID
 * @param {string} category    "crop"|"drought"|"rangeland"|"forest"|"water"|"degradation"
 * @param {string} [startDate] Optional ISO date "YYYY-MM-DD" (defaults to auto 14/30-day window)
 * @param {string} [endDate]   Optional ISO date "YYYY-MM-DD"
 * @returns {Promise<object>}
 */
export async function getAoiStats(user, aoiId, category = "drought", startDate, endDate) {
  const headers = await _authHeaders(user);
  const body = { category };
  if (startDate) body.start_date = startDate;
  if (endDate)   body.end_date   = endDate;
  const res = await fetch(`${BACKEND_URL}/aois/${aoiId}/stats`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return _handleResponse(res);
}

/** Toggle email alert subscription for an AOI.
 * @param {object} user   Firebase User object
 * @param {string} aoiId  AOI ID
 * @returns {Promise<{alerts_enabled: boolean}>}
 */
export async function toggleAoiAlerts(user, aoiId) {
  const headers = await _authHeaders(user);
  const res = await fetch(`${BACKEND_URL}/aois/${aoiId}/toggle_alerts`, {
    method: "POST",
    headers,
  });
  return _handleResponse(res);
}

/** Fetch the authenticated user's export quota usage.
 * @param {object} user  Firebase User object
 * @returns {Promise<{tier, limit, used, remaining, date}>}
 */
export async function getQuota(user) {
  const token = await user.getIdToken();
  const res = await fetch(`${BACKEND_URL}/quota`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return _handleResponse(res);
}

/** List the current user's API keys (enterprise only).
 * @param {object} user  Firebase User object
 * @returns {Promise<Array>}
 */
export async function listApiKeys(user) {
  const token = await user.getIdToken();
  const res = await fetch(`${BACKEND_URL}/api-keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return _handleResponse(res);
}

/** Create a new API key (enterprise only).
 * @param {object} user  Firebase User object
 * @param {string} name  Human-readable key name
 * @returns {Promise<object>}  includes the raw key (shown once)
 */
export async function createApiKey(user, name) {
  const headers = await _authHeaders(user);
  const res = await fetch(`${BACKEND_URL}/api-keys`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name }),
  });
  return _handleResponse(res);
}

/** Revoke (delete) an API key (enterprise only).
 * @param {object} user   Firebase User object
 * @param {string} keyId  Key ID
 * @returns {Promise<{success: true}>}
 */
export async function deleteApiKey(user, keyId) {
  const token = await user.getIdToken();
  const res = await fetch(`${BACKEND_URL}/api-keys/${keyId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return _handleResponse(res);
}
