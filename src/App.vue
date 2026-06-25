<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Eye,
  EyeOff,
  Fuel,
  History,
  Home,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Plus,
  ShieldCheck,
  User
} from "lucide-vue-next";
import { api } from "./services/api";

const session = reactive({
  token: localStorage.getItem("fueltrack_token") || "",
  user: JSON.parse(localStorage.getItem("fueltrack_user") || "null")
});

const view = ref(session.token ? "home" : "login");
const loading = ref(false);
const error = ref("");
const success = ref("");
const selectedOrderId = ref("");
const showPassword = ref(false);
const showRegisterPassword = ref(false);
const showPaymentDialog = ref(false);

const loginForm = reactive({
  email: "",
  password: ""
});

const registerForm = reactive({
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  accepted: false
});

const dashboard = ref(null);
const orders = ref([]);
const orderDetail = ref(null);
const paymentMethods = ref([]);
const paymentHistory = ref([]);
const profile = ref(null);
const avatarObjectUrl = ref("");

const newOrder = reactive({
  fuelType: "Diesel B5",
  quantityGallons: "1000",
  address: "",
  timeWindow: "Manana (7:00 - 11:00)",
  notes: ""
});

const paymentForm = reactive({
  brand: "Visa",
  cardNumber: "",
  holder: "",
  expires: ""
});

const profileForm = reactive({
  companyName: "",
  ruc: "",
  email: "",
  phone: "",
  contactName: "",
  avatarUrl: "",
  lastPasswordChange: ""
});

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour <= 11) return "Buenos dias";
  if (hour <= 18) return "Buenas tardes";
  return "Buenas noches";
});

const currentTitle = computed(() => ({
  home: "Inicio",
  orders: "Pedidos",
  newOrder: "Nuevo pedido",
  orderDetail: "Detalle del pedido",
  payments: "Pagos",
  profile: "Perfil"
}[view.value] || "FuelTrack"));

const navItems = [
  { key: "home", label: "Inicio", icon: Home },
  { key: "orders", label: "Pedidos", icon: History },
  { key: "payments", label: "Pagos", icon: CreditCard },
  { key: "profile", label: "Perfil", icon: User }
];

function persistSession(result) {
  session.token = result.token;
  session.user = result.user;
  localStorage.setItem("fueltrack_token", result.token);
  localStorage.setItem("fueltrack_user", JSON.stringify(result.user));
}

function clearMessages() {
  error.value = "";
  success.value = "";
}

async function runTask(task, message = "") {
  loading.value = true;
  clearMessages();
  try {
    const result = await task();
    if (message) success.value = message;
    return result;
  } catch (err) {
    error.value = err.message || "Ocurrio un error inesperado.";
    return null;
  } finally {
    loading.value = false;
  }
}

async function login() {
  const result = await runTask(() => api.login({
    email: loginForm.email,
    password: loginForm.password
  }));
  if (!result) return;
  persistSession(result);
  view.value = "home";
  await loadHome();
}

async function register() {
  if (!registerForm.accepted) {
    error.value = "Debes aceptar los terminos para crear una cuenta.";
    return;
  }
  if (registerForm.password !== registerForm.confirmPassword) {
    error.value = "Las contrasenas no coinciden.";
    return;
  }

  const result = await runTask(() => api.register({
    fullName: registerForm.fullName,
    email: registerForm.email,
    password: registerForm.password
  }));
  if (!result) return;
  persistSession(result);
  view.value = "home";
  await loadHome();
}

function logout() {
  session.token = "";
  session.user = null;
  localStorage.removeItem("fueltrack_token");
  localStorage.removeItem("fueltrack_user");
  clearAvatar();
  view.value = "login";
}

function clearAvatar() {
  if (avatarObjectUrl.value) URL.revokeObjectURL(avatarObjectUrl.value);
  avatarObjectUrl.value = "";
}

async function loadAvatar(hasAvatar) {
  clearAvatar();
  if (!hasAvatar) return;
  try {
    const blob = await api.avatar();
    avatarObjectUrl.value = URL.createObjectURL(blob);
  } catch {
    // El resto del perfil sigue funcionando aunque falle la imagen.
  }
}

function handleUnauthorized() {
  session.token = "";
  session.user = null;
  clearAvatar();
  view.value = "login";
  error.value = "Tu sesión expiró. Inicia sesión nuevamente.";
}

async function loadHome() {
  const data = await runTask(() => api.dashboard());
  if (data) {
    dashboard.value = data;
    await loadAvatar(Boolean(data.avatarUrl));
  }
}

async function loadOrders() {
  view.value = "orders";
  const data = await runTask(() => api.orders());
  if (data) orders.value = data;
}

async function openOrder(id) {
  selectedOrderId.value = id;
  view.value = "orderDetail";
  const data = await runTask(() => api.orderDetail(id));
  if (data) orderDetail.value = data;
}

async function submitOrder() {
  const quantity = Number(newOrder.quantityGallons);
  if (!newOrder.address || !quantity) {
    error.value = "Completa direccion y cantidad para crear el pedido.";
    return;
  }

  const created = await runTask(() => api.createOrder({
    fuelType: newOrder.fuelType,
    quantityGallons: quantity,
    address: newOrder.address,
    timeWindow: newOrder.timeWindow,
    notes: newOrder.notes
  }), "Pedido creado correctamente.");

  if (!created) return;
  newOrder.address = "";
  newOrder.quantityGallons = "1000";
  newOrder.notes = "";
  await loadOrders();
}

async function loadPayments() {
  view.value = "payments";
  const result = await runTask(async () => {
    const [methods, history] = await Promise.all([
      api.paymentMethods(),
      api.paymentHistory()
    ]);
    return { methods, history };
  });
  if (!result) return;
  paymentMethods.value = result.methods;
  paymentHistory.value = result.history;
}

async function addPaymentMethod() {
  if (!paymentForm.brand || paymentForm.cardNumber.length < 12 || !paymentForm.holder || !paymentForm.expires) {
    error.value = "Completa los datos de la tarjeta.";
    return;
  }

  const created = await runTask(() => api.addPaymentMethod({
    brand: paymentForm.brand,
    cardNumber: paymentForm.cardNumber,
    holder: paymentForm.holder,
    expires: paymentForm.expires
  }), "Metodo de pago agregado.");

  if (!created) return;
  showPaymentDialog.value = false;
  paymentForm.cardNumber = "";
  paymentForm.expires = "";
  await loadPayments();
}

async function loadProfile() {
  view.value = "profile";
  const data = await runTask(() => api.profile());
  if (!data) return;
  profile.value = data;
  await loadAvatar(Boolean(data.avatarUrl));
  Object.assign(profileForm, {
    companyName: data.companyName || "",
    ruc: data.ruc || "",
    email: data.email || "",
    phone: data.phone || "",
    contactName: data.contactName || "",
    avatarUrl: data.avatarUrl || "",
    lastPasswordChange: data.lastPasswordChange || ""
  });
}

async function saveProfile() {
  const data = await runTask(() => api.updateProfile({
    companyName: profileForm.companyName,
    ruc: profileForm.ruc,
    email: profileForm.email,
    phone: profileForm.phone,
    contactName: profileForm.contactName,
    avatarUrl: profileForm.avatarUrl,
    lastPasswordChange: profileForm.lastPasswordChange
  }), "Perfil actualizado.");
  if (data) profile.value = data;
}

async function uploadAvatar(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const data = await runTask(() => api.uploadAvatar(file), "Foto actualizada.");
  if (!data) return;
  profile.value = data;
  profileForm.avatarUrl = data.avatarUrl || "";
  await loadAvatar(Boolean(data.avatarUrl));
}

function readableStatus(status) {
  const normalized = String(status ?? "").toLowerCase();
  const map = {
    "0": "Creado",
    "1": "Programado",
    "2": "En ruta",
    "3": "Entregado",
    "4": "Cancelado",
    created: "Creado",
    scheduled: "Programado",
    onroute: "En ruta",
    delivered: "Entregado",
    cancelled: "Cancelado"
  };
  return map[normalized] || String(status || "Sin estado");
}

function statusClass(status) {
  const value = readableStatus(status).toLowerCase();
  if (value.includes("ruta")) return "status status-green";
  if (value.includes("programado")) return "status status-blue";
  if (value.includes("entregado")) return "status status-gray";
  if (value.includes("cancelado")) return "status status-red";
  return "status status-amber";
}

function money(value, currency = "PEN") {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency
  }).format(value || 0);
}

function initials(name) {
  return (name || "FT")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

onMounted(() => {
  window.addEventListener("fueltrack:unauthorized", handleUnauthorized);
  if (session.token) loadHome();
});

onBeforeUnmount(() => {
  window.removeEventListener("fueltrack:unauthorized", handleUnauthorized);
  clearAvatar();
});
</script>

<template>
  <section v-if="!session.token" class="auth-page">
    <div class="auth-brand">
      <div class="brand-mark"><Fuel :size="42" /></div>
      <p class="eyebrow">Cliente empresa</p>
      <h1>FuelTrack Cliente</h1>
      <p>Pedidos de combustible, pagos y seguimiento operativo en un solo panel web.</p>
    </div>

    <form v-if="view === 'login'" class="auth-card" @submit.prevent="login">
      <p class="eyebrow">{{ greeting }}</p>
      <h2>Inicia sesion</h2>
      <p class="muted">Ingresa con una cuenta registrada en FuelTrack.</p>

      <label>
        Correo corporativo
        <span class="field"><Mail :size="18" /><input v-model="loginForm.email" type="email" required /></span>
      </label>

      <label>
        Contrasena
        <span class="field">
          <ShieldCheck :size="18" />
          <input v-model="loginForm.password" :type="showPassword ? 'text' : 'password'" minlength="8" required />
          <button class="icon-button" type="button" @click="showPassword = !showPassword">
            <EyeOff v-if="showPassword" :size="18" />
            <Eye v-else :size="18" />
          </button>
        </span>
      </label>

      <p v-if="error" class="alert error">{{ error }}</p>
      <button class="primary-action" type="submit" :disabled="loading">
        <Loader2 v-if="loading" class="spin" :size="18" />
        <span>{{ loading ? "Ingresando..." : "Ingresar" }}</span>
      </button>

      <button class="link-button" type="button" @click="view = 'register'; clearMessages()">Crear cuenta</button>
    </form>

    <form v-else class="auth-card" @submit.prevent="register">
      <button class="back-link" type="button" @click="view = 'login'; clearMessages()"><ArrowLeft :size="16" /> Volver</button>
      <h2>Crear cuenta</h2>
      <p class="muted">Registra los datos de contacto de tu empresa.</p>

      <label>Nombre de contacto <span class="field"><User :size="18" /><input v-model="registerForm.fullName" required /></span></label>
      <label>Correo corporativo <span class="field"><Mail :size="18" /><input v-model="registerForm.email" type="email" required /></span></label>
      <label>
        Contrasena
        <span class="field">
          <ShieldCheck :size="18" />
          <input v-model="registerForm.password" :type="showRegisterPassword ? 'text' : 'password'" minlength="8" required />
          <button class="icon-button" type="button" @click="showRegisterPassword = !showRegisterPassword">
            <EyeOff v-if="showRegisterPassword" :size="18" />
            <Eye v-else :size="18" />
          </button>
        </span>
      </label>
      <label>Confirmar contrasena <span class="field"><ShieldCheck :size="18" /><input v-model="registerForm.confirmPassword" type="password" minlength="8" required /></span></label>
      <label class="check-row"><input v-model="registerForm.accepted" type="checkbox" /> Acepto terminos y politica de privacidad.</label>

      <p v-if="error" class="alert error">{{ error }}</p>
      <button class="primary-action" type="submit" :disabled="loading">
        <Loader2 v-if="loading" class="spin" :size="18" />
        <span>{{ loading ? "Creando..." : "Crear cuenta" }}</span>
      </button>
    </form>
  </section>

  <section v-else class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-mark small"><Fuel :size="24" /></div>
        <div>
          <strong>FuelTrack</strong>
          <span>Cliente web</span>
        </div>
      </div>

      <nav>
        <button v-for="item in navItems" :key="item.key" :class="{ active: view === item.key }" @click="item.key === 'home' ? loadHome() : item.key === 'orders' ? loadOrders() : item.key === 'payments' ? loadPayments() : loadProfile()">
          <component :is="item.icon" :size="18" />
          {{ item.label }}
        </button>
      </nav>

      <button class="logout" @click="logout"><LogOut :size="18" /> Cerrar sesion</button>
    </aside>

    <main class="workspace">
      <header class="topbar">
        <div>
          <p class="eyebrow">{{ greeting }}</p>
          <h1>{{ currentTitle }}</h1>
        </div>
        <button class="primary-action compact" @click="view = 'newOrder'; clearMessages()"><Plus :size="18" /> Nuevo pedido</button>
      </header>

      <p v-if="error" class="alert error">{{ error }}</p>
      <p v-if="success" class="alert success">{{ success }}</p>

      <section v-if="view === 'home'" class="screen-grid">
        <div class="hero-panel">
          <div>
            <p class="eyebrow">Cuenta empresa activa</p>
            <h2>{{ dashboard?.companyName || 'Cliente FuelTrack SAC' }}</h2>
            <p>Resumen de cuenta, pedidos activos y movimientos recientes.</p>
          </div>
          <div class="avatar" @click="loadProfile">
            <img v-if="avatarObjectUrl" :src="avatarObjectUrl" alt="Avatar" />
            <span v-else>{{ initials(dashboard?.companyName) }}</span>
          </div>
        </div>

        <article class="summary-card">
          <div class="card-icon"><Fuel :size="22" /></div>
          <div>
            <p>Pedido activo</p>
            <h3>{{ dashboard?.activeOrder ? `${dashboard.activeOrder.fuelType} - ${dashboard.activeOrder.quantityGallons} gal` : 'Sin pedidos activos' }}</h3>
            <span :class="statusClass(dashboard?.activeOrder?.status)">{{ dashboard?.activeOrder?.status || 'Sin estado' }}</span>
          </div>
        </article>

        <article class="summary-card">
          <div class="card-icon blue"><Clock3 :size="22" /></div>
          <div>
            <p>Proxima entrega</p>
            <h3>{{ dashboard?.nextDelivery ? `${dashboard.nextDelivery.dateTimeText} - ${dashboard.nextDelivery.location}` : 'Sin entregas programadas' }}</h3>
            <span class="status status-blue">{{ dashboard?.nextDelivery?.status || 'Sin estado' }}</span>
          </div>
        </article>

        <article class="summary-card">
          <div class="card-icon amber"><CircleDollarSign :size="22" /></div>
          <div>
            <p>Ultimo pago</p>
            <h3>{{ dashboard?.lastPayment?.amountText || 'Sin pagos recientes' }}</h3>
            <span class="status status-gray">{{ dashboard?.lastPayment?.status || 'Sin estado' }}</span>
          </div>
        </article>
      </section>

      <section v-if="view === 'orders'" class="content-stack">
        <div class="section-head">
          <div>
            <h2>Historial de pedidos</h2>
            <p>Revisa estado, fecha, planta y detalle de tus pedidos.</p>
          </div>
          <button class="secondary-action" @click="loadOrders">Actualizar</button>
        </div>

        <div class="table-card">
          <button v-for="order in orders" :key="order.id" class="order-row" @click="openOrder(order.id)">
            <span><strong>{{ order.id }}</strong><small>{{ order.fuelType }} - {{ order.quantityGallons }} gal</small></span>
            <span><strong>{{ order.plantName }}</strong><small>{{ order.scheduledAt }}</small></span>
            <span :class="statusClass(order.status)">{{ readableStatus(order.status) }}</span>
          </button>
          <p v-if="!orders.length && !loading" class="empty">Aun no tienes pedidos registrados.</p>
        </div>
      </section>

      <section v-if="view === 'newOrder'" class="form-layout">
        <button class="back-link" @click="loadOrders"><ArrowLeft :size="16" /> Volver a pedidos</button>
        <form class="panel-form" @submit.prevent="submitOrder">
          <h2>Pedido para suministro a planta</h2>
          <p class="muted">Ingresa direccion, tipo de combustible, cantidad y horario de descarga.</p>

          <label>Tipo de combustible
            <select v-model="newOrder.fuelType">
              <option>Diesel B5</option>
              <option>Gasohol 95</option>
              <option>Gasohol 97</option>
            </select>
          </label>

          <label>Cantidad requerida
            <input v-model="newOrder.quantityGallons" inputmode="numeric" />
          </label>

          <div class="preset-row">
            <button type="button" @click="newOrder.quantityGallons = '1000'">1,000 gal</button>
            <button type="button" @click="newOrder.quantityGallons = '2000'">2,000 gal</button>
            <button type="button" @click="newOrder.quantityGallons = '5000'">5,000 gal</button>
          </div>

          <label>Direccion de descarga
            <input v-model="newOrder.address" placeholder="Av. Industrial 123, Callao" />
          </label>

          <label>Franja horaria preferida
            <select v-model="newOrder.timeWindow">
              <option>Manana (7:00 - 11:00)</option>
              <option>Tarde (13:00 - 17:00)</option>
              <option>Noche (19:00 - 22:00)</option>
            </select>
          </label>

          <label>Notas para el proveedor
            <textarea v-model="newOrder.notes" rows="4" placeholder="Instrucciones especiales, contacto en planta, etc."></textarea>
          </label>

          <button class="primary-action" type="submit" :disabled="loading">
            <Loader2 v-if="loading" class="spin" :size="18" />
            Confirmar pedido
          </button>
        </form>
      </section>

      <section v-if="view === 'orderDetail'" class="content-stack">
        <button class="back-link" @click="loadOrders"><ArrowLeft :size="16" /> Volver a pedidos</button>
        <div v-if="orderDetail" class="detail-grid">
          <article class="summary-card wide">
            <div class="card-icon"><CheckCircle2 :size="22" /></div>
            <div>
              <p>Estado del pedido {{ selectedOrderId }}</p>
              <h3>{{ readableStatus(orderDetail.status) }}</h3>
              <span class="muted">{{ orderDetail.eta }}</span>
            </div>
          </article>

          <article class="info-panel">
            <h3>Resumen</h3>
            <p><Fuel :size="16" /> {{ orderDetail.product }} - {{ orderDetail.quantityGallons }} gal</p>
            <p><Clock3 :size="16" /> {{ orderDetail.createdAt }}</p>
          </article>

          <article class="info-panel">
            <h3>Entrega</h3>
            <p><Building2 :size="16" /> {{ orderDetail.plant }}</p>
            <p><MapPin :size="16" /> {{ orderDetail.address }}</p>
            <p><Clock3 :size="16" /> {{ orderDetail.timeWindow }}</p>
          </article>

          <article class="info-panel">
            <h3>Pago</h3>
            <p><CreditCard :size="16" /> {{ orderDetail.paymentMethod || 'Pendiente de asignar' }}</p>
            <p><CircleDollarSign :size="16" /> {{ orderDetail.amount ? money(orderDetail.amount) : 'Monto pendiente' }}</p>
          </article>
        </div>
      </section>

      <section v-if="view === 'payments'" class="content-stack">
        <div class="section-head">
          <div>
            <h2>Pagos y metodos</h2>
            <p>Administra tarjetas corporativas e historial de comprobantes.</p>
          </div>
          <button class="primary-action compact" @click="showPaymentDialog = true"><Plus :size="18" /> Agregar</button>
        </div>

        <div class="cards-grid">
          <article v-for="method in paymentMethods" :key="method.id" class="info-panel">
            <h3>{{ method.brand }} - {{ method.masked }}</h3>
            <p><User :size="16" /> {{ method.holder }}</p>
            <p><Clock3 :size="16" /> Vence: {{ method.expires }}</p>
            <span v-if="method.isDefault" class="status status-green">Predeterminado</span>
          </article>
        </div>

        <div class="table-card">
          <div v-for="item in paymentHistory" :key="item.id" class="payment-row">
            <span><strong>{{ item.id }}</strong><small>{{ item.description }}</small></span>
            <span>{{ item.date }}</span>
            <strong>{{ money(item.amount, item.currency) }} - {{ item.status }}</strong>
          </div>
        </div>
      </section>

      <section v-if="view === 'profile'" class="form-layout">
        <form class="panel-form" @submit.prevent="saveProfile">
          <div class="profile-head">
            <label class="avatar large">
              <img v-if="avatarObjectUrl" :src="avatarObjectUrl" alt="Avatar" />
              <span v-else>{{ initials(profileForm.companyName) }}</span>
              <input type="file" accept="image/*" @change="uploadAvatar" />
            </label>
            <div>
              <h2>{{ profileForm.companyName || 'Cliente FuelTrack SAC' }}</h2>
              <p class="muted">{{ profileForm.ruc || 'RUC pendiente' }}</p>
            </div>
          </div>

          <label>Empresa <input v-model="profileForm.companyName" /></label>
          <label>RUC <input v-model="profileForm.ruc" /></label>
          <label>Contacto <input v-model="profileForm.contactName" /></label>
          <label>Correo corporativo <input v-model="profileForm.email" type="email" /></label>
          <label>Telefono <input v-model="profileForm.phone" /></label>
          <p class="muted">Ultimo cambio de contrasena: {{ profileForm.lastPasswordChange || 'Pendiente' }}</p>

          <button class="primary-action" type="submit" :disabled="loading">Guardar cambios</button>
        </form>
      </section>
    </main>

    <div v-if="showPaymentDialog" class="modal-backdrop" @click.self="showPaymentDialog = false">
      <form class="modal-card" @submit.prevent="addPaymentMethod">
        <h2>Agregar metodo de pago</h2>
        <label>Marca <input v-model="paymentForm.brand" placeholder="Visa" /></label>
        <label>Numero de tarjeta <input v-model="paymentForm.cardNumber" inputmode="numeric" maxlength="19" /></label>
        <label>Titular <input v-model="paymentForm.holder" /></label>
        <label>Vencimiento <input v-model="paymentForm.expires" placeholder="MM/AA" /></label>
        <div class="modal-actions">
          <button class="secondary-action" type="button" @click="showPaymentDialog = false">Cancelar</button>
          <button class="primary-action compact" type="submit">Guardar</button>
        </div>
      </form>
    </div>
  </section>
</template>
