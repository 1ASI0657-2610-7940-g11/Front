const DEFAULT_API_BASE_URL = "/api";
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, "");
const DEFAULT_TIMEOUT_MS = 15000;

async function request(path, options = {}) {
  const {
    responseType = "json",
    timeoutMs = DEFAULT_TIMEOUT_MS,
    ...fetchOptions
  } = options;
  const headers = options.body instanceof FormData
    ? {}
    : { "Content-Type": "application/json" };
  const token = localStorage.getItem("fueltrack_token");
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        ...headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("La API tardó demasiado en responder. Intenta nuevamente.");
    }
    throw err;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (response.status === 401) {
    localStorage.removeItem("fueltrack_token");
    localStorage.removeItem("fueltrack_user");
    window.dispatchEvent(new CustomEvent("fueltrack:unauthorized"));
  }

  if (!response.ok) {
    let message = "No se pudo completar la solicitud.";
    const responseBody = await response.text();
    if (responseBody) {
      try {
        const payload = JSON.parse(responseBody);
        message = payload.message || JSON.stringify(payload);
      } catch {
        message = responseBody;
      }
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  if (responseType === "blob") return response.blob();
  return response.json();
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
  },
  avatar: () => request("/profile/avatar", { responseType: "blob" })
};
