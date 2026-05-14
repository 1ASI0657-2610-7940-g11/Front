const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const ASSET_BASE_URL = API_BASE_URL.startsWith("http")
  ? API_BASE_URL.replace(/\/api\/?$/, "")
  : "";

async function request(path, options = {}) {
  const headers = options.body instanceof FormData
    ? {}
    : { "Content-Type": "application/json" };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    let message = "No se pudo completar la solicitud.";
    try {
      const payload = await response.json();
      message = payload.message || JSON.stringify(payload);
    } catch {
      message = await response.text() || message;
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export function resolveAssetUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${ASSET_BASE_URL}${url}`;
}

export const api = {
  login: (payload) => request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  register: (payload) => request("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  dashboard: () => request("/client/dashboard"),
  orders: () => request("/orders"),
  orderDetail: (id) => request(`/orders/${encodeURIComponent(id)}`),
  createOrder: (payload) => request("/orders", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  paymentMethods: () => request("/payments/methods"),
  addPaymentMethod: (payload) => request("/payments/methods", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  paymentHistory: () => request("/payments/history"),
  profile: () => request("/profile/me"),
  updateProfile: (payload) => request("/profile/me", {
    method: "PUT",
    body: JSON.stringify(payload)
  }),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return request("/profile/avatar", {
      method: "POST",
      body: formData
    });
  }
};
