let deliveryFee = 7.9;
let minimumOrder = 25;
const STATUS_FLOW = ["Novo", "Em preparo", "Saiu para entrega", "Entregue"];
const ADMIN_COLUMNS = ["Novo", "Em preparo", "Saiu para entrega", "Entregue", "Cancelado"];
const BASE_PATH = "/lanches-daniel";
const MENU_ORDER = [
  "x-bacon",
  "x-salada",
  "x-tudo",
  "combo-duplo",
  "combo-familia",
  "batata-cheddar",
  "coca-cola",
  "guarana"
];

const ENV = window.__ENV__ || {};
const SUPABASE_URL = String(ENV.SUPABASE_URL || "").trim();
const SUPABASE_ANON_KEY = String(ENV.SUPABASE_ANON_KEY || "").trim();
const SUPABASE_ENABLED = SUPABASE_URL.startsWith("https://") && SUPABASE_ANON_KEY.length > 20;
let supabaseDb = null;
let realtimeChannel = null;

function usingSupabase() {
  return SUPABASE_ENABLED && !!supabaseDb;
}

let products = [
  { id: "x-bacon", category: "Destaque", name: "X Bacon Supremo", description: "Blend 160g, bacon crocante, cheddar e molho Daniel.", price: 39.9, oldPrice: 46.9, badge: "-15%" },
  { id: "combo-duplo", category: "Combo", name: "Duplo Daniel", description: "Dois burgers, batata grande e bebida.", price: 68.9, oldPrice: 78.9, badge: "Combo" },
  { id: "batata-cheddar", category: "Extra", name: "Batata cheddar", description: "Porção crocante com cheddar cremoso e bacon.", price: 24.9 },
  { id: "x-salada", category: "Hambúrguer", name: "X Salada Artesanal", description: "Blend artesanal, queijo, alface, tomate e maionese da casa.", price: 34.9 },
  { id: "x-tudo", category: "Hambúrguer", name: "X Tudo Daniel", description: "Blend, presunto, ovo, bacon, queijo, salada e molho da casa.", price: 44.9 },
  { id: "combo-familia", category: "Combo", name: "Família Premium", description: "Quatro burgers, duas batatas e duas bebidas.", price: 139.9, oldPrice: 159.9, badge: "Família" }
];

const seedOrders = [
  {
    id: "#1048",
    number: 1048,
    status: "Novo",
    customer: "Mariana Souza",
    phone: "(11) 97777-2201",
    address: "Rua das Flores, 128",
    deliveryMode: "Entrega no endereço",
    items: [{ id: "x-bacon", name: "X Bacon Supremo", price: 39.9, qty: 2 }, { id: "batata-cheddar", name: "Batata cheddar", price: 24.9, qty: 1 }],
    notes: "Sem cebola",
    payment: "Pix",
    change: "-",
    deliveryFee,
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString()
  },
  {
    id: "#1047",
    number: 1047,
    status: "Em preparo",
    customer: "Rafael Lima",
    phone: "(11) 96666-1055",
    address: "Av. Central, 740",
    deliveryMode: "Entrega no endereço",
    items: [{ id: "combo-duplo", name: "Duplo Daniel", price: 68.9, qty: 1 }],
    notes: "Troco para 100",
    payment: "Dinheiro",
    change: "R$ 100,00",
    deliveryFee,
    createdAt: new Date(Date.now() - 1000 * 60 * 19).toISOString()
  },
  {
    id: "#1046",
    number: 1046,
    status: "Saiu para entrega",
    customer: "Lucas Rocha",
    phone: "(11) 93333-8120",
    address: "Alameda Norte, 92",
    deliveryMode: "Entrega no endereço",
    items: [{ id: "combo-duplo", name: "Duplo Daniel", price: 68.9, qty: 2 }],
    notes: "Interfone 42",
    payment: "Cartão",
    change: "-",
    deliveryFee,
    createdAt: new Date(Date.now() - 1000 * 60 * 36).toISOString()
  },
  {
    id: "#1045",
    number: 1045,
    status: "Entregue",
    customer: "Bianca Alves",
    phone: "(11) 95555-9944",
    address: "Retirada no local",
    deliveryMode: "Retirada no local",
    items: [{ id: "x-salada", name: "X Salada Artesanal", price: 34.9, qty: 1 }],
    notes: "Caprichar no molho",
    payment: "Cartão",
    change: "-",
    deliveryFee: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 62).toISOString()
  }
];

const state = loadState();
if (!state.categoryFilter) state.categoryFilter = "Todos";
state.backend = SUPABASE_ENABLED ? "Supabase" : "Local";
state.authUser = null;
state.profile = state.profile || null;
state.editingProductId = state.editingProductId || products[0]?.id || null;

function loadState() {
  try {
    const stored = localStorage.getItem("danielLanchesRealtime");
    if (stored) return JSON.parse(stored);
  } catch (error) {
    localStorage.removeItem("danielLanchesRealtime");
  }
  return {
    storeOpen: true,
    loggedIn: false,
    customer: { name: "Mariana Souza", phone: "(11) 97777-2201", address: "Rua das Flores, 128" },
    cart: [],
    categoryFilter: "Todos",
    orders: seedOrders,
    nextOrderNumber: 1049,
    sales7: [1240, 1780, 1610, 2310, 2140, 2890, 2640]
  };
}

function saveState() {
  if (!usingSupabase()) localStorage.setItem("danielLanchesRealtime", JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("daniel:state-change"));
}

function saveLocalSession() {
  const localOnly = {
    storeOpen: state.storeOpen,
    loggedIn: state.loggedIn,
    customer: state.customer,
    cart: state.cart,
    categoryFilter: state.categoryFilter,
    orders: state.orders,
    nextOrderNumber: state.nextOrderNumber,
    sales7: state.sales7,
    backend: state.backend,
    profile: state.profile
  };
  localStorage.setItem("danielLanchesRealtime", JSON.stringify(localOnly));
}

function dbRowToOrder(row) {
  const number = row.order_number || row.id;
  return {
    dbId: row.id,
    id: `#${number}`,
    number,
    status: row.status,
    customer: row.customer_name,
    phone: row.phone,
    address: row.address,
    deliveryMode: row.delivery_mode,
    items: row.items || [],
    notes: row.notes || "-",
    payment: row.payment,
    change: row.change_for || "-",
    deliveryFee: Number(row.delivery_fee || 0),
    createdAt: row.created_at
  };
}

function orderToDbPayload(order) {
  return {
    user_id: state.authUser?.id,
    status: order.status,
    customer_name: order.customer,
    phone: order.phone,
    address: order.address,
    delivery_mode: order.deliveryMode,
    items: order.items.map(item => ({ id: item.id, qty: item.qty })),
    notes: order.notes,
    payment: order.payment,
    change_for: order.change,
    delivery_fee: order.deliveryFee
  };
}

function dbProductToProduct(row) {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    oldPrice: row.old_price == null ? null : Number(row.old_price),
    badge: row.badge || undefined,
    available: row.available !== false,
    ingredients: row.ingredients || "",
    stock: Number(row.stock || 0),
    prepTime: row.prep_time || "",
    featured: row.featured || false
  };
}

function isStaffRole(role = state.profile?.role) {
  return ["employee", "delivery", "admin", "super_admin"].includes(role);
}

function canManageOrders() {
  return !usingSupabase() || isStaffRole();
}

function recomputeSales7() {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
  state.sales7 = days.map(day => {
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    return state.orders
      .filter(order => order.status !== "Cancelado")
      .filter(order => {
        const created = new Date(order.createdAt);
        return created >= day && created < nextDay;
      })
      .reduce((sum, order) => sum + orderTotal(order), 0);
  });
}

async function initSupabaseBackend() {
  if (!SUPABASE_ENABLED || !window.supabase) {
    state.backend = "Local";
    renderBackendNotice();
    return;
  }
  supabaseDb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: sessionData } = await supabaseDb.auth.getSession();
  state.authUser = sessionData.session?.user || null;
  if (state.authUser) await loadProfile();
  supabaseDb.auth.onAuthStateChange(async (_event, session) => {
    state.authUser = session?.user || null;
    state.profile = null;
    if (state.authUser) await loadProfile();
    await refreshFromSupabase();
  });
  await refreshFromSupabase();
  subscribeRealtime();
  renderBackendNotice();
}

async function loadProfile() {
  if (!usingSupabase() || !state.authUser) return null;
  const { data, error } = await supabaseDb
    .from("profiles")
    .select("*")
    .eq("id", state.authUser.id)
    .maybeSingle();
  if (error) {
    console.error(error);
    return null;
  }
  state.profile = data;
  if (data) {
    state.customer = {
      name: data.full_name || state.customer.name,
      phone: data.phone || state.customer.phone,
      address: state.customer.address
    };
    state.loggedIn = true;
    saveLocalSession();
  }
  return data;
}

async function upsertCustomerProfile() {
  if (!usingSupabase() || !state.authUser) return;
  const payload = {
    id: state.authUser.id,
    full_name: state.customer.name,
    phone: state.customer.phone,
    role: "customer"
  };
  const { error } = await supabaseDb.from("profiles").upsert(payload);
  if (error) throw error;
  await loadProfile();
}

async function refreshFromSupabase() {
  if (!supabaseDb) return;
  const [{ data: settings, error: settingsError }, { data: dbProducts, error: productsError }] = await Promise.all([
    supabaseDb.from("store_settings").select("*").eq("id", "default").maybeSingle(),
    supabaseDb.from("products").select("*").order("created_at", { ascending: true })
  ]);
  if (settingsError) {
    console.error(settingsError);
    showToast("Supabase não configurado. Usando modo local.");
    state.backend = "Local";
    supabaseDb = null;
    renderBackendNotice();
    return;
  }
  if (productsError) console.error(productsError);
  state.storeOpen = settings?.store_open ?? true;
  deliveryFee = Number(settings?.delivery_fee ?? deliveryFee);
  minimumOrder = Number(settings?.minimum_order ?? minimumOrder);
  if (dbProducts?.length) products = dbProducts.map(dbProductToProduct);

  if (state.authUser) {
    const { data: orders, error: ordersError } = await supabaseDb
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (ordersError) {
      console.error(ordersError);
      showToast("Entre novamente para ver pedidos");
    } else {
      state.orders = (orders || []).map(dbRowToOrder);
      state.nextOrderNumber = Math.max(1049, ...state.orders.map(order => order.number + 1));
    }
  } else if (usingSupabase()) {
    state.orders = [];
  }
  recomputeSales7();
  saveLocalSession();
  renderAll();
}

function subscribeRealtime() {
  if (!supabaseDb || realtimeChannel) return;
  realtimeChannel = supabaseDb
    .channel("daniel-lanches-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => refreshFromSupabase())
    .on("postgres_changes", { event: "*", schema: "public", table: "store_settings" }, () => refreshFromSupabase())
    .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => refreshFromSupabase())
    .subscribe();
}

function renderBackendNotice() {
  const badge = document.querySelector(".live-badge");
  if (!badge) return;
  badge.title = usingSupabase() ? "Sincronizando com Supabase Realtime" : "Modo local até preencher URL e chave do Supabase";
  badge.childNodes[1].textContent = usingSupabase() ? " Supabase em tempo real" : " Modo local";
}

function money(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"'`]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "`": "&#96;"
  })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function parsePrice(value) {
  const normalized = String(value || "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function slugify(value) {
  return String(value || "produto")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || `produto-${Date.now()}`;
}

function productToDbPayload(product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    description: product.description,
    price: product.price,
    old_price: product.oldPrice || null,
    badge: product.badge || null,
    available: product.available !== false,
    ingredients: product.ingredients || "",
    stock: Number(product.stock || 0),
    prep_time: product.prepTime || "",
    featured: !!product.featured
  };
}

function productCategoryGroup(category) {
  const value = String(category || "").toLowerCase();
  if (["lanche", "lanches", "hambúrguer", "hamburguer", "destaque", "combo", "combos"].includes(value)) return "Lanches";
  if (["porção", "porções", "porcao", "porcoes", "extra", "extras"].includes(value)) return "Porções";
  if (["bebida", "bebidas"].includes(value)) return "Bebidas";
  return category || "Lanches";
}

function sortProductsByMenuOrder(productList) {
  return [...productList].sort((a, b) => {
    const indexA = MENU_ORDER.indexOf(a.id);
    const indexB = MENU_ORDER.indexOf(b.id);
    const safeA = indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA;
    const safeB = indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB;
    if (safeA !== safeB) return safeA - safeB;
    return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR");
  });
}

function orderSubtotal(order) {
  return order.items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function orderTotal(order) {
  return orderSubtotal(order) + (order.deliveryFee || 0);
}

function cartSubtotal() {
  return state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function cartTotal() {
  return cartSubtotal() + (state.cart.length ? deliveryFee : 0);
}

function formatDate(iso) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

function iconRefresh() {
  if (window.lucide) window.lucide.createIcons();
}

function setActiveView(viewId) {
  document.querySelectorAll(".view").forEach(view => view.classList.toggle("active", view.id === viewId));
  document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === viewId));
  window.scrollTo({ top: 0, behavior: "smooth" });
  renderAll();
}

function normalizeRoute(pathname = window.location.pathname) {
  let trimmed = pathname.replace(/\/+$/, "") || "/";
  if (trimmed === BASE_PATH) trimmed = "/";
  else if (trimmed.startsWith(`${BASE_PATH}/`)) trimmed = trimmed.slice(BASE_PATH.length) || "/";
  if (trimmed === "/cardapio") return "/cardapio";
  if (trimmed === "/") return "/";
  if (trimmed.startsWith("/admin")) return trimmed;
  if (trimmed === "/entregador") return "/entregador";
  return "/";
}

function routeToUrl(path = "/") {
  const [pathname, suffix = ""] = String(path || "/").split(/([?#].*)/, 2);
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (normalizedPath === "/") return `${BASE_PATH}/${suffix}`;
  return `${BASE_PATH}${normalizedPath}${suffix}`;
}

function isAdminRoute(pathname = window.location.pathname) {
  return normalizeRoute(pathname).startsWith("/admin");
}

function isAdminAllowed() {
  if (!usingSupabase()) return true;
  return !!state.authUser && isStaffRole(state.profile?.role);
}

function canAccessRoute(pathname = window.location.pathname) {
  const route = normalizeRoute(pathname);
  if (route === "/admin/login") return true;
  if (!route.startsWith("/admin") && !route.startsWith("/entregador")) return true;
  if (!state.profile?.role) return false;
  if (state.profile.role === "customer") return false;
  if (state.profile.role === "delivery") return route === "/entregador";
  if (state.profile.role === "employee") return ["/admin/pedidos", "/admin/cardapio"].includes(route);
  return true;
}

function updateAppRole() {
  const role = state.profile?.role || (state.loggedIn ? (isAdminAllowed() ? "owner" : "customer") : "customer");
  window.__appRole = role;
}

function getRouteView(route) {
  const routeMap = {
    "/admin/login": "auth",
    "/admin/dashboard": "dashboard",
    "/admin/pedidos": "orders",
    "/admin/cardapio": "menu",
    "/admin/configuracoes": "settings"
  };
  return routeMap[route] || "dashboard";
}

function navigateTo(path) {
  const target = routeToUrl(path || "/");
  window.history.pushState({}, "", target);
  applyRoute();
}

function applyRoute() {
  const route = normalizeRoute(window.location.pathname);
  const publicRoot = document.getElementById("publicAppRoot");
  const adminRoot = document.getElementById("adminAppRoot");

  if (!publicRoot || !adminRoot) return;

  const isAdmin = isAdminRoute(route);

  publicRoot.style.display = isAdmin ? "none" : "block";
  adminRoot.style.display = isAdmin ? "block" : "none";

  if (isAdmin) {
    if (!isAdminAllowed() || !canAccessRoute(route)) {
      const loginUrl = routeToUrl("/admin/login");
      if (window.location.pathname !== loginUrl) {
        window.history.replaceState({}, "", loginUrl);
      }

      setActiveView("auth");
      updateAppRole();
      return;
    }

    const viewId = getRouteView(route);
    setActiveView(viewId);
    updateAppRole();
    return;
  }

  updateAppRole();
  renderAll();
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.querySelector("span").textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function openModal(id) {
  document.getElementById(id).classList.add("show");
  document.getElementById(id).setAttribute("aria-hidden", "false");
  iconRefresh();
}

function closeModal(id) {
  document.getElementById(id).classList.remove("show");
  document.getElementById(id).setAttribute("aria-hidden", "true");
}

function playNotification() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const gain = ctx.createGain();
  gain.gain.value = 0.045;
  gain.connect(ctx.destination);
  [520, 760].forEach((frequency, index) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = frequency;
    osc.connect(gain);
    osc.start(ctx.currentTime + index * 0.12);
    osc.stop(ctx.currentTime + index * 0.12 + 0.11);
  });
}

function renderStoreStatus() {
  const label = state.storeOpen ? "Loja aberta" : "Loja fechada";
  const notice = state.storeOpen
    ? "Loja aberta, entrega estimada em 35-45 min, pedido mínimo R$ 25,00."
    : "Loja fechada no momento. O cliente pode consultar o cardápio, mas não pode adicionar produtos.";
  const storeToggle = document.getElementById("storeToggleBtn");
  if (storeToggle) {
    storeToggle.classList.toggle("danger", !state.storeOpen);
    const span = storeToggle.querySelector("span");
    if (span) span.textContent = label;
  }
  const storeNotice = document.getElementById("storeNotice");
  if (storeNotice) storeNotice.textContent = notice;
  const deliveryFeeCard = document.getElementById("deliveryFeeCard");
  const minimumOrderCard = document.getElementById("minimumOrderCard");
  if (deliveryFeeCard) deliveryFeeCard.textContent = money(deliveryFee);
  if (minimumOrderCard) minimumOrderCard.textContent = money(minimumOrder);
  document.querySelectorAll("#publicStoreStatus").forEach(el => {
    el.textContent = state.storeOpen ? "Aberto agora · entrega 35-45 min" : "Loja fechada no momento";
  });
  document.querySelectorAll("#closedCartAlert").forEach(el => el.classList.toggle("show", !state.storeOpen));
  document.querySelectorAll("#publicHeaderStatus").forEach(el => {
    el.textContent = state.storeOpen ? "Aberto agora" : "Fechada";
  });
}

function renderProducts() {
  const availableProducts = sortProductsByMenuOrder(
    products.filter(product => product.available !== false)
  );
  const visibleProducts = state.categoryFilter === "Todos"
    ? availableProducts
    : availableProducts.filter(product => productCategoryGroup(product.category) === state.categoryFilter);
  document.querySelectorAll("[data-category-filter]").forEach(button => {
    button.classList.toggle("active", button.dataset.categoryFilter === state.categoryFilter);
  });
  document.querySelectorAll("#specialOffers").forEach(container => {
    container.innerHTML = availableProducts.filter(product => product.oldPrice).map(product => `
      <article class="offer-card">
        <img src="daniel-lanches-hero.png" alt="" />
        <span>${escapeHtml(product.badge || "Oferta")}</span>
        <div>
          <h3>${escapeHtml(product.name)}</h3>
          <p>${escapeHtml(product.description)}</p>
          <small>De ${money(product.oldPrice)}</small>
          <strong>Por ${money(product.price)}</strong>
          ${state.storeOpen ? `<button class="secondary-btn" data-add-product="${escapeAttr(product.id)}"><i data-lucide="plus"></i><span>Adicionar</span></button>` : ""}
        </div>
      </article>
    `).join("");
  });
  document.querySelectorAll("#publicProducts").forEach(container => {
    container.innerHTML = visibleProducts.map(product => `
      <article class="food-card">
        <img src="daniel-lanches-hero.png" alt="" />
        <div>
          <span>${escapeHtml(product.category)}</span>
          <h2>${escapeHtml(product.name)}</h2>
          <p>${escapeHtml(product.description)}</p>
          <div class="price-line">${product.oldPrice ? `<small>${money(product.oldPrice)}</small>` : ""}<strong>${money(product.price)}</strong></div>
        </div>
        ${state.storeOpen ? `<button class="icon-btn add-cart-btn" data-add-product="${escapeAttr(product.id)}" aria-label="Adicionar ${escapeAttr(product.name)}"><i data-lucide="plus"></i></button>` : ""}
      </article>
    `).join("");
  });
  renderProductAdminList();
}

function renderProductAdminList() {
  const list = document.getElementById("productAdminList");
  if (!list) return;
  list.innerHTML = products.map(product => `
    <button type="button" data-product-edit="${escapeAttr(product.id)}" class="${product.id === state.editingProductId ? "active" : ""}">
      <span><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.category)} · ${money(product.price)}</small></span>
      <em>${product.available === false ? "Indisponível" : "Disponível"}</em>
    </button>
  `).join("");
}

function fillProductForm(product = products[0]) {
  if (!product || !document.getElementById("productForm")) return;
  state.editingProductId = product.id;
  document.getElementById("productFormTitle").textContent = product.name;
  document.getElementById("productName").value = product.name || "";
  document.getElementById("productCategory").value = product.category || "Hambúrguer";
  document.getElementById("productPrice").value = String(product.price || 0).replace(".", ",");
  document.getElementById("productOldPrice").value = product.oldPrice ? String(product.oldPrice).replace(".", ",") : "";
  document.getElementById("productStock").value = product.stock || 0;
  document.getElementById("productPrepTime").value = product.prepTime || "";
  document.getElementById("productDescription").value = product.description || "";
  document.getElementById("productIngredients").value = product.ingredients || "";
  document.getElementById("productFeatured").checked = !!product.featured || product.category === "Destaque";
  document.getElementById("productAvailable").checked = product.available !== false;
  document.getElementById("productAvailableSwitch").checked = product.available !== false;
  document.getElementById("productUnavailable").checked = product.available === false;
  renderProductAdminList();
}

function getProductFormPayload({ duplicate = false } = {}) {
  const current = products.find(product => product.id === state.editingProductId);
  const name = document.getElementById("productName").value.trim() || "Produto Daniel";
  const available = document.getElementById("productAvailable").checked && !document.getElementById("productUnavailable").checked;
  const id = duplicate ? `${slugify(name)}-${Date.now()}` : (current?.id || slugify(name));
  const oldPrice = parsePrice(document.getElementById("productOldPrice").value);
  return {
    id,
    name: duplicate ? `${name} cópia` : name,
    category: document.getElementById("productCategory").value,
    description: document.getElementById("productDescription").value.trim(),
    price: parsePrice(document.getElementById("productPrice").value),
    oldPrice: oldPrice > 0 ? oldPrice : null,
    badge: oldPrice > 0 ? "Oferta" : undefined,
    available,
    ingredients: document.getElementById("productIngredients").value.trim(),
    stock: Number.parseInt(document.getElementById("productStock").value, 10) || 0,
    prepTime: document.getElementById("productPrepTime").value.trim(),
    featured: document.getElementById("productFeatured").checked
  };
}

async function saveProduct(event) {
  event?.preventDefault();
  if (usingSupabase() && !["admin", "super_admin"].includes(state.profile?.role)) {
    showToast("Apenas admin pode salvar produtos");
    return;
  }
  const product = getProductFormPayload();
  if (!product.price || product.price <= 0) {
    showToast("Informe um preço válido");
    return;
  }
  if (usingSupabase()) {
    const { error } = await supabaseDb.from("products").upsert(productToDbPayload(product));
    if (error) {
      console.error(error);
      showToast("Erro ao salvar produto no banco");
      return;
    }
    await refreshFromSupabase();
  } else {
    const index = products.findIndex(item => item.id === product.id);
    if (index >= 0) products[index] = product;
    else products.unshift(product);
    renderAll();
  }
  fillProductForm(product);
  showToast("Produto salvo no cardápio");
}

async function duplicateProduct() {
  if (usingSupabase() && !["admin", "super_admin"].includes(state.profile?.role)) {
    showToast("Apenas admin pode duplicar produtos");
    return;
  }
  const product = getProductFormPayload({ duplicate: true });
  if (usingSupabase()) {
    const { error } = await supabaseDb.from("products").insert(productToDbPayload(product));
    if (error) {
      console.error(error);
      showToast("Erro ao duplicar produto");
      return;
    }
    await refreshFromSupabase();
  } else {
    products.unshift(product);
    renderAll();
  }
  fillProductForm(product);
  showToast("Produto duplicado");
}

function renderCart() {
  document.querySelectorAll("#cartItems").forEach(container => {
    if (!state.cart.length) {
      container.innerHTML = `<div class="empty-cart">Seu carrinho está vazio.</div>`;
    } else {
      container.innerHTML = state.cart.map(item => `
        <div class="cart-item">
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <span>${money(item.price)} cada</span>
          </div>
          <div class="qty-control">
            <button data-cart-dec="${escapeAttr(item.id)}" aria-label="Diminuir"><i data-lucide="minus"></i></button>
            <b>${escapeHtml(item.qty)}</b>
            <button data-cart-inc="${escapeAttr(item.id)}" aria-label="Aumentar"><i data-lucide="plus"></i></button>
            <button data-cart-remove="${escapeAttr(item.id)}" aria-label="Remover"><i data-lucide="trash-2"></i></button>
          </div>
        </div>
      `).join("");
    }
  });
  document.querySelectorAll("#cartSubtotal").forEach(el => { el.textContent = money(cartSubtotal()); });
  document.querySelectorAll("#cartDelivery").forEach(el => { el.textContent = state.cart.length ? money(deliveryFee) : money(0); });
  document.querySelectorAll("#cartTotal").forEach(el => { el.textContent = money(cartTotal()); });
  document.querySelectorAll("#cartBadge").forEach(el => {
    const count = state.cart.reduce((sum, item) => sum + item.qty, 0);
    el.textContent = count || "";
    el.classList.toggle("show", count > 0);
  });
  document.querySelectorAll("#finishOrderBtn").forEach(btn => { btn.disabled = !state.cart.length || !state.storeOpen; });
}

function renderCheckout() {
  const subtotal = cartSubtotal();
  const mode = document.getElementById("checkoutDeliveryMode").value;
  const fee = mode === "Retirada no local" ? 0 : deliveryFee;
  document.getElementById("checkoutSummary").innerHTML = `
    <strong>Resumo do pedido</strong>
    ${state.cart.map(item => `<span>${escapeHtml(item.qty)}x ${escapeHtml(item.name)}<b>${money(item.price * item.qty)}</b></span>`).join("")}
    <span>Subtotal<b>${money(subtotal)}</b></span>
    <span>Taxa de entrega<b>${money(fee)}</b></span>
    <span class="checkout-total">Total<b>${money(subtotal + fee)}</b></span>
  `;
  document.getElementById("checkoutAddress").value = state.customer.address;
  document.getElementById("checkoutAddress").disabled = mode === "Retirada no local";
  document.getElementById("changeField").style.display = document.getElementById("checkoutPayment").value === "Dinheiro" ? "grid" : "none";
}

function renderKanban() {
  const kanban = document.getElementById("kanban");
  kanban.innerHTML = ADMIN_COLUMNS.map(column => {
    const items = state.orders.filter(order => order.status === column);
    return `
      <section class="kanban-column">
        <div class="kanban-title"><span>${escapeHtml(column)}</span><strong>${items.length}</strong></div>
        ${items.map(order => `
          <article class="order-card">
            <header><strong>${escapeHtml(order.id)}</strong><span>${money(orderTotal(order))}</span></header>
            <p><b>${escapeHtml(order.customer)}</b> · ${escapeHtml(order.phone)}</p>
            <p>${escapeHtml(order.address)}</p>
            <p>${order.items.map(item => `${escapeHtml(item.qty)}x ${escapeHtml(item.name)}`).join(", ")}</p>
            <p>${escapeHtml(order.payment)} · Troco: ${escapeHtml(order.change || "-")} · ${formatDate(order.createdAt)}</p>
            <div class="order-actions admin-actions">
              <button data-details="${escapeAttr(order.id)}">Detalhes</button>
              <button data-next="${escapeAttr(order.id)}" ${!STATUS_FLOW.includes(order.status) || order.status === "Entregue" ? "disabled" : ""}>Avançar</button>
              <button data-cancel="${escapeAttr(order.id)}" ${order.status === "Cancelado" ? "disabled" : ""}>Cancelar</button>
            </div>
          </article>
        `).join("")}
      </section>
    `;
  }).join("");
}

function renderDashboard() {
  const activeOrders = state.orders.filter(order => order.status !== "Cancelado");
  const delivered = state.orders.filter(order => order.status === "Entregue");
  const revenue = activeOrders.reduce((sum, order) => sum + orderTotal(order), 0);
  const qty = activeOrders.length;
  const itemsSold = activeOrders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.qty, 0), 0);
  const pending = state.orders.filter(order => ["Novo", "Em preparo", "Saiu para entrega"].includes(order.status)).length;
  const customers = new Set(state.orders.map(order => order.phone)).size;
  document.getElementById("metricOrders").textContent = qty;
  document.getElementById("metricSales").textContent = money(revenue);
  document.getElementById("metricItemsSold").textContent = `${itemsSold} itens vendidos`;
  document.getElementById("metricAverage").textContent = money(qty ? revenue / qty : 0);
  document.getElementById("metricCustomers").textContent = customers;
  document.getElementById("metricPending").textContent = pending;

  ADMIN_COLUMNS.forEach(status => {
    const count = state.orders.filter(order => order.status === status).length;
    document.querySelectorAll(`[data-status-count="${status}"]`).forEach(el => el.textContent = count);
    document.querySelectorAll(`[data-status-meter="${status}"]`).forEach(el => el.value = Math.min(100, count * 24));
  });

  const bars = document.querySelectorAll("[data-sales-bar]");
  const max = Math.max(...state.sales7, 1);
  bars.forEach((bar, index) => bar.style.setProperty("--h", `${Math.max(18, state.sales7[index] / max * 96)}%`));

  const productTotals = {};
  activeOrders.forEach(order => order.items.forEach(item => productTotals[item.name] = (productTotals[item.name] || 0) + item.qty));
  document.getElementById("topProductsList").innerHTML = Object.entries(productTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => `<li><span>${escapeHtml(name)}</span><strong>${escapeHtml(count)}</strong></li>`)
    .join("");

  document.getElementById("latestOrders").innerHTML = state.orders.slice(0, 6).map(order => `
    <button data-details="${escapeAttr(order.id)}">
      <span><strong>${escapeHtml(order.id)}</strong> ${escapeHtml(order.customer)}</span>
      <b>${escapeHtml(order.status)}</b>
      <em>${money(orderTotal(order))}</em>
    </button>
  `).join("");
}

function renderMyOrders() {
  document.querySelectorAll("#myOrdersList").forEach(container => {
    if (!state.loggedIn) {
      container.innerHTML = `<section class="panel"><h2>Entre para ver seus pedidos</h2><p>Use o cadastro rápido para acompanhar seus pedidos em tempo real.</p><button class="primary-btn" id="myOrdersLoginBtn"><i data-lucide="log-in"></i><span>Entrar</span></button></section>`;
      return;
    }

    // Com Supabase + RLS, state.orders já vem apenas do usuário autenticado (ou staff).
    const mine = usingSupabase()
      ? state.orders
      : state.orders.filter(order => order.phone === state.customer.phone);

    if (!mine.length) {
      container.innerHTML = `<section class="panel"><h2>Nenhum pedido ainda</h2><p>Quando você finalizar um pedido, ele aparece aqui automaticamente.</p></section>`;
      return;
    }

    container.innerHTML = mine.map(order => `
      <section class="panel my-order-card">
        <div class="panel-head"><div><span class="eyebrow">${escapeHtml(order.id)}</span><h2>${money(orderTotal(order))}</h2></div><strong>${escapeHtml(order.status)}</strong></div>
        <div class="customer-status live-status">
          ${STATUS_FLOW.map(status => `
            <div class="status-step ${statusIndex(order.status) > statusIndex(status) ? "done" : ""} ${order.status === status ? "active" : ""}">
              <i data-lucide="${statusIcon(status)}"></i><span>${escapeHtml(status)}</span>
            </div>
          `).join("")}
        </div>
        <p>${order.items.map(item => `${escapeHtml(item.qty)}x ${escapeHtml(item.name)}`).join(", ")}</p>
      </section>
    `).join("");
  });
}

function statusIndex(status) {
  return STATUS_FLOW.indexOf(status);
}

function statusIcon(status) {
  return { "Novo": "receipt", "Em preparo": "chef-hat", "Saiu para entrega": "bike", "Entregue": "badge-check" }[status] || "circle";
}

function renderCustomerProfile() {
  const name = document.getElementById("customerProfileName");
  const phone = document.getElementById("customerProfilePhone");
  const address = document.getElementById("customerProfileAddress");
  if (name) name.textContent = state.customer.name;
  if (phone) phone.textContent = state.customer.phone;
  if (address) address.textContent = state.customer.address;
}

function renderAll() {
  // Build the DOM shell FIRST: PublicApp.render()/AdminApp.render() replace the
  // innerHTML of their root, which recreates containers like #publicProducts,
  // #specialOffers, #cartItems and #myOrdersList. If we fill those containers
  // before the shell exists (or before it's rebuilt), the content gets wiped
  // out immediately after and nothing re-fills it.
  if (window.PublicApp && !isAdminRoute(window.location.pathname)) {
    const tab = new URLSearchParams(window.location.search).get("tab") || "menu";
    window.PublicApp.render(tab);
  }
  if (window.AdminApp && isAdminRoute(window.location.pathname)) {
    window.AdminApp.render();
    window.AdminApp.renderView(normalizeRoute(window.location.pathname));
  }

  renderStoreStatus();
  renderProducts();
  renderCart();
  renderKanban();
  renderDashboard();
  renderMyOrders();
  renderCustomerProfile();
  iconRefresh();
}

async function persistStoreOpen() {
  if (!usingSupabase()) {
    saveState();
    return;
  }
  if (!canManageOrders()) {
    state.storeOpen = !state.storeOpen;
    showToast("Apenas equipe/admin pode alterar a loja");
    renderAll();
    return;
  }
  const { error } = await supabaseDb
    .from("store_settings")
    .update({ store_open: state.storeOpen, updated_at: new Date().toISOString() })
    .eq("id", "default");
  if (error) {
    console.error(error);
    showToast("Não foi possível sincronizar a loja");
  }
  saveLocalSession();
  renderAll();
}

function addToCart(productId) {
  if (!state.storeOpen) {
    showToast("Loja fechada no momento");
    return;
  }
  const product = products.find(item => item.id === productId);
  const existing = state.cart.find(item => item.id === productId);
  if (existing) existing.qty += 1;
  else state.cart.push({ ...product, qty: 1 });
  saveLocalSession();
  renderAll();
  showToast(`${product.name} adicionado ao carrinho`);
}

function updateCart(productId, delta) {
  const item = state.cart.find(cartItem => cartItem.id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) state.cart = state.cart.filter(cartItem => cartItem.id !== productId);
  saveLocalSession();
  renderAll();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter(item => item.id !== productId);
  saveLocalSession();
  renderAll();
}

function finishOrderFlow() {
  if (!state.storeOpen) {
    showToast("Loja fechada no momento");
    return;
  }
  if (!state.cart.length) {
    showToast("Adicione um produto ao carrinho");
    return;
  }
  if (cartSubtotal() < minimumOrder) {
    showToast(`Pedido mínimo: ${money(minimumOrder)}`);
    return;
  }
  if (!state.loggedIn) {
    openModal("loginModal");
    return;
  }
  renderCheckout();
  openModal("checkoutModal");
}

async function confirmLogin() {
  state.customer = {
    name: document.getElementById("loginName").value.trim() || "Cliente Daniel",
    phone: document.getElementById("loginPhone").value.trim() || "(11) 90000-2026",
    address: document.getElementById("loginAddress").value.trim() || "Endereço não informado"
  };
  if (usingSupabase()) {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    if (!email || !password) {
      showToast("Informe e-mail e senha");
      return;
    }

    const { error } = await supabaseDb.auth.signInWithPassword({ email, password });
    if (error) {
      const signUp = await supabaseDb.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: state.customer.name,
            phone: state.customer.phone,
            role: "customer"
          }
        }
      });

      if (signUp.error) {
        console.error(signUp.error);
        showToast("Não foi possível entrar ou cadastrar");
        return;
      }

      if (!signUp.data.session) {
        showToast("Cadastro criado. Confirme seu e-mail antes de finalizar.");
        return;
      }

      state.authUser = signUp.data.user;
    } else {
      const { data } = await supabaseDb.auth.getUser();
      state.authUser = data.user;
    }

    try {
      await upsertCustomerProfile();
    } catch (profileError) {
      console.error(profileError);
      showToast("Não foi possível salvar perfil");
      return;
    }
  }
  state.loggedIn = true;
  saveLocalSession();
  renderAll();
  closeModal("loginModal");
  renderCheckout();
  openModal("checkoutModal");
}

async function resetPasswordFor(emailInputId) {
  if (!usingSupabase()) {
    showToast("Recuperação de senha exige Supabase configurado");
    return;
  }

  const email = document.getElementById(emailInputId)?.value.trim();
  if (!email) {
    showToast("Informe o e-mail para recuperar a senha");
    return;
  }

  const { error } = await supabaseDb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin
  });

  if (error) {
    console.error(error);
    showToast("Não foi possível enviar o e-mail de recuperação");
    return;
  }

  showToast("E-mail de recuperação enviado");
}

function adminLoginFlow() {
  if (!usingSupabase()) {
    state.loggedIn = true;
    state.profile = { role: "owner" };
    saveLocalSession();
    navigateTo("/admin/dashboard");
    showToast("Modo local: admin liberado");
    return;
  }
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value.trim();
  supabaseDb.auth.signInWithPassword({ email, password }).then(async ({ data, error }) => {
    if (error) {
      console.error(error);
      showToast("Login admin inválido");
      return;
    }
    state.authUser = data.user;
    const profile = await loadProfile();
    if (!isStaffRole(profile?.role)) {
      await supabaseDb.auth.signOut();
      state.authUser = null;
      state.profile = null;
      showToast("Usuário sem permissão de equipe");
      return;
    }
    await refreshFromSupabase();
    const redirect = profile?.role === "delivery" ? "/entregador" : profile?.role === "employee" ? "/admin/pedidos" : "/admin/dashboard";
    navigateTo(redirect);
    showToast("Admin conectado");
  });
}

async function createOrder() {
  if (usingSupabase() && !state.authUser) {
    showToast("Entre para enviar o pedido");
    openModal("loginModal");
    return;
  }
  if (cartSubtotal() < minimumOrder) {
    showToast(`Pedido mínimo: ${money(minimumOrder)}`);
    return;
  }
  const deliveryMode = document.getElementById("checkoutDeliveryMode").value;
  const orderDeliveryFee = deliveryMode === "Retirada no local" ? 0 : deliveryFee;
  const order = {
    id: `#${state.nextOrderNumber}`,
    number: state.nextOrderNumber,
    status: "Novo",
    customer: state.customer.name,
    phone: state.customer.phone,
    address: deliveryMode === "Retirada no local" ? "Retirada no local" : document.getElementById("checkoutAddress").value.trim(),
    deliveryMode,
    items: state.cart.map(item => ({ ...item })),
    notes: document.getElementById("checkoutNotes").value.trim() || "-",
    payment: document.getElementById("checkoutPayment").value,
    change: document.getElementById("checkoutPayment").value === "Dinheiro" ? (document.getElementById("checkoutChange").value.trim() || "Não informado") : "-",
    deliveryFee: orderDeliveryFee,
    createdAt: new Date().toISOString()
  };
  if (usingSupabase()) {
    const { data, error } = await supabaseDb
      .from("orders")
      .insert(orderToDbPayload(order))
      .select("*")
      .single();
    if (error) {
      console.error(error);
      showToast("Erro ao enviar pedido");
      return;
    }
    order.dbId = data.id;
    order.id = `#${data.order_number}`;
    order.number = data.order_number;
    order.createdAt = data.created_at;
  }
  state.orders.unshift(order);
  state.nextOrderNumber = Math.max(state.nextOrderNumber + 1, order.number + 1);
  state.cart = [];
  recomputeSales7();
  if (usingSupabase()) saveLocalSession();
  else saveState();
  closeModal("checkoutModal");
  playNotification();
  showToast(`Pedido ${order.id} enviado com sucesso`);
  navigateTo("/cardapio?tab=orders");
}

function nextStatus(order) {
  const index = STATUS_FLOW.indexOf(order.status);
  return STATUS_FLOW[index + 1] || order.status;
}

function showOrderDetails(orderId) {
  const order = state.orders.find(item => item.id === orderId);
  if (!order) return;
  document.getElementById("orderDetailsContent").innerHTML = `
    <span class="eyebrow">Detalhes do pedido</span>
    <h2>${escapeHtml(order.id)} · ${escapeHtml(order.status)}</h2>
    <div class="detail-grid">
      <span>Cliente <b>${escapeHtml(order.customer)}</b></span>
      <span>Telefone <b>${escapeHtml(order.phone)}</b></span>
      <span>Endereço <b>${escapeHtml(order.address)}</b></span>
      <span>Horário <b>${formatDate(order.createdAt)}</b></span>
      <span>Pagamento <b>${escapeHtml(order.payment)}</b></span>
      <span>Troco <b>${escapeHtml(order.change || "-")}</b></span>
      <span>Taxa de entrega <b>${money(order.deliveryFee || 0)}</b></span>
      <span>Valor total <b>${money(orderTotal(order))}</b></span>
    </div>
    <div class="checkout-summary order-detail-items">
      <strong>Itens</strong>
      ${order.items.map(item => `<span>${escapeHtml(item.qty)}x ${escapeHtml(item.name)}<b>${money(item.price * item.qty)}</b></span>`).join("")}
      <span>Observações<b>${escapeHtml(order.notes)}</b></span>
    </div>
    <div class="modal-actions">
      <button class="primary-btn" data-next="${escapeAttr(order.id)}"><i data-lucide="arrow-right"></i><span>Avançar status</span></button>
      <button class="secondary-btn" data-print="${escapeAttr(order.id)}"><i data-lucide="printer"></i><span>Imprimir</span></button>
      <button class="ghost-btn" data-whatsapp="${escapeAttr(order.id)}"><i data-lucide="message-circle"></i><span>WhatsApp</span></button>
      <button class="ghost-btn danger" data-cancel="${escapeAttr(order.id)}"><i data-lucide="ban"></i><span>Cancelar</span></button>
      <button class="ghost-btn danger" data-delete="${escapeAttr(order.id)}"><i data-lucide="trash-2"></i><span>Excluir</span></button>
    </div>
  `;
  openModal("orderDetailsModal");
}

async function advanceOrder(orderId) {
  if (usingSupabase() && !canManageOrders()) {
    showToast("Apenas equipe/admin pode avançar pedidos");
    return;
  }
  const order = state.orders.find(item => item.id === orderId);
  if (!order || order.status === "Cancelado" || order.status === "Entregue") return;
  order.status = nextStatus(order);
  if (usingSupabase() && order.dbId) {
    const { error } = await supabaseDb.from("orders").update({ status: order.status }).eq("id", order.dbId);
    if (error) {
      console.error(error);
      showToast("Erro ao avançar pedido");
      return;
    }
  }
  if (usingSupabase()) saveLocalSession();
  else saveState();
  showToast(`${order.id} atualizado para ${order.status}`);
  if (document.getElementById("orderDetailsModal").classList.contains("show")) showOrderDetails(orderId);
}

async function cancelOrder(orderId) {
  if (usingSupabase() && !canManageOrders()) {
    showToast("Apenas equipe/admin pode cancelar pedidos");
    return;
  }
  const order = state.orders.find(item => item.id === orderId);
  if (!order) return;
  order.status = "Cancelado";
  if (usingSupabase() && order.dbId) {
    const { error } = await supabaseDb.from("orders").update({ status: "Cancelado" }).eq("id", order.dbId);
    if (error) {
      console.error(error);
      showToast("Erro ao cancelar pedido");
      return;
    }
  }
  if (usingSupabase()) saveLocalSession();
  else saveState();
  showToast(`${order.id} cancelado`);
  if (document.getElementById("orderDetailsModal").classList.contains("show")) showOrderDetails(orderId);
}

async function deleteOrder(orderId) {
  if (usingSupabase() && !["admin", "super_admin"].includes(state.profile?.role)) {
    showToast("Apenas admin pode excluir pedidos");
    return;
  }
  const order = state.orders.find(item => item.id === orderId);
  if (usingSupabase() && order?.dbId) {
    const { error } = await supabaseDb.from("orders").delete().eq("id", order.dbId);
    if (error) {
      console.error(error);
      showToast("Erro ao excluir pedido");
      return;
    }
  }
  state.orders = state.orders.filter(orderItem => orderItem.id !== orderId);
  if (usingSupabase()) saveLocalSession();
  else saveState();
  closeModal("orderDetailsModal");
  showToast(`${orderId} excluído`);
}

function printOrder(orderId) {
  const order = state.orders.find(item => item.id === orderId) || state.orders[0];
  if (!order) return;
  const printWindow = window.open("", "_blank", "width=420,height=720");
  const printableItems = order.items.map(item => `<div class="line"><span>${escapeHtml(item.qty)}x ${escapeHtml(item.name)}</span><b>${money(item.price * item.qty)}</b></div>`).join("");
  printWindow.document.write(`
    <html><head><title>Pedido ${escapeHtml(order.id)}</title>
    <style>
      body{font-family:Arial,sans-serif;margin:0;padding:22px;color:#1A1A1A}
      h1{font-size:22px;margin:0 0 6px} h2{font-size:18px;margin:18px 0 8px}
      .brand{border-bottom:3px solid #FFC107;padding-bottom:12px;margin-bottom:14px}
      .line{display:flex;justify-content:space-between;border-bottom:1px dashed #ccc;padding:7px 0}
      .footer{margin-top:24px;text-align:center;font-size:12px;border-top:3px solid #FFC107;padding-top:12px}
    </style></head><body>
      <div class="brand"><h1>Daniel Lanches</h1><strong>Pedido ${escapeHtml(order.id)}</strong><br>${formatDate(order.createdAt)}</div>
      <div>Cliente: <b>${escapeHtml(order.customer)}</b></div>
      <div>Telefone: ${escapeHtml(order.phone)}</div>
      <div>Endereço: ${escapeHtml(order.address)}</div>
      <h2>Itens</h2>
      ${printableItems}
      <div class="line"><span>Taxa de entrega</span><b>${money(order.deliveryFee || 0)}</b></div>
      <div class="line"><span>Total</span><b>${money(orderTotal(order))}</b></div>
      <h2>Pagamento</h2>
      <div>${escapeHtml(order.payment)} · Troco: ${escapeHtml(order.change || "-")}</div>
      <h2>Observações</h2>
      <div>${escapeHtml(order.notes)}</div>
      <div class="footer">Obrigado pela preferência. Daniel Lanches · pedido preparado com carinho.</div>
      <script>window.print();</script>
    </body></html>
  `);
  printWindow.document.close();
}

async function simulateNewOrder() {
  if (usingSupabase() && !canManageOrders()) {
    showToast("Apenas equipe/admin pode simular pedidos");
    return;
  }
  const product = products[Math.floor(Math.random() * products.length)];
  const order = {
    id: `#${state.nextOrderNumber}`,
    number: state.nextOrderNumber,
    status: "Novo",
    customer: "Novo Cliente",
    phone: "(11) 90000-2026",
    address: "Rua Daniel, 39",
    deliveryMode: "Entrega no endereço",
    items: [{ ...product, qty: 1 }],
    notes: "Pedido gerado em tempo real",
    payment: "Pix",
    change: "-",
    deliveryFee,
    createdAt: new Date().toISOString()
  };
  if (usingSupabase()) {
    const { data, error } = await supabaseDb.from("orders").insert(orderToDbPayload(order)).select("*").single();
    if (error) {
      console.error(error);
      showToast("Erro ao simular pedido");
      return;
    }
    state.orders.unshift(dbRowToOrder(data));
  } else {
    state.orders.unshift(order);
    state.nextOrderNumber += 1;
    saveState();
  }
  recomputeSales7();
  playNotification();
  showToast("Novo pedido recebido");
}

function generateAiProduct() {
  const value = document.getElementById("aiInput").value.trim() || "X Bacon 39";
  const [, rawName, rawPrice] = value.match(/(.+?)\s*(\d+[,.]?\d*)?$/) || ["", "X Bacon", "39"];
  const name = rawName.trim().replace(/\b\w/g, letter => letter.toUpperCase());
  const price = rawPrice ? `R$ ${rawPrice.replace(".", ",")},00`.replace(",,", ",") : "R$ 39,00";
  document.getElementById("aiResult").innerHTML = `
    <strong>${escapeHtml(name)}</strong><br>
    Categoria: Hambúrgueres<br>
    Preço sugerido: ${escapeHtml(price)}<br>
    Descrição: blend artesanal com bacon crocante, queijo derretido e molho especial Daniel.<br>
    Ingredientes: blend, bacon, cheddar, pão brioche, alface, tomate e molho Daniel.<br>
    SEO: ${escapeHtml(name.toLowerCase())}, hambúrguer artesanal, delivery Daniel Lanches.<br>
    Tags: #hamburguer #bacon #delivery #daniellanches
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    const swUrl = new URL("sw.js", window.location.href).toString();
    navigator.serviceWorker.register(swUrl);
  }

  renderAll();
  initSupabaseBackend();
  generateAiProduct();
  fillProductForm(products.find(product => product.id === state.editingProductId) || products[0]);
  applyRoute();

  document.addEventListener("click", (event) => {
    const navItem = event.target.closest(".nav-item");

    if (navItem) {
      event.preventDefault();
      if (navItem.dataset.publicRoute) {
        navigateTo(navItem.dataset.publicRoute);
        return;
      }
      if (navItem.dataset.view) {
        setActiveView(navItem.dataset.view);
        return;
      }
    }

    const viewJump = event.target.closest("[data-view-jump]");
    if (viewJump) {
      event.preventDefault();
      setActiveView(viewJump.dataset.viewJump);
      return;
    }

    const publicRoute = event.target.closest("[data-public-route]");
    if (publicRoute) {
      event.preventDefault();
      navigateTo(publicRoute.dataset.publicRoute);
    }
  });
  document.querySelectorAll("[data-close-modal]").forEach(button => button.addEventListener("click", () => closeModal(button.dataset.closeModal)));

  document.getElementById("publicMenuBtn")?.addEventListener("click", () => navigateTo("/cardapio"));
  document.getElementById("shareStoreBtn")?.addEventListener("click", () => showToast("Link da loja copiado: daniel.app/pedir"));
  document.getElementById("storeToggleBtn")?.addEventListener("click", () => {
    state.storeOpen = !state.storeOpen;
    persistStoreOpen();
    showToast(state.storeOpen ? "Loja aberta" : "Loja fechada no momento");
  });
  document.getElementById("newOrderBtn")?.addEventListener("click", simulateNewOrder);
  document.getElementById("loginConfirmBtn")?.addEventListener("click", confirmLogin);
  document.getElementById("loginResetPasswordBtn")?.addEventListener("click", () => resetPasswordFor("loginEmail"));
  const adminLoginBtn = document.getElementById("adminLoginBtn");
  if (adminLoginBtn) adminLoginBtn.addEventListener("click", adminLoginFlow);
  document.getElementById("adminResetPasswordBtn")?.addEventListener("click", () => resetPasswordFor("adminEmail"));
  document.getElementById("confirmOrderBtn")?.addEventListener("click", createOrder);
  document.getElementById("checkoutPayment")?.addEventListener("change", renderCheckout);
  document.getElementById("checkoutDeliveryMode")?.addEventListener("change", renderCheckout);
  document.getElementById("printLastBtn")?.addEventListener("click", () => printOrder(state.orders[0]?.id));
  document.getElementById("aiGenerate")?.addEventListener("click", generateAiProduct);
  document.getElementById("productForm")?.addEventListener("submit", saveProduct);
  document.getElementById("duplicateProductBtn")?.addEventListener("click", duplicateProduct);
  document.getElementById("productAvailable")?.addEventListener("change", event => {
    document.getElementById("productUnavailable").checked = !event.target.checked;
    document.getElementById("productAvailableSwitch").checked = event.target.checked;
  });
  document.getElementById("productUnavailable")?.addEventListener("change", event => {
    document.getElementById("productAvailable").checked = !event.target.checked;
    document.getElementById("productAvailableSwitch").checked = !event.target.checked;
  });
  document.getElementById("productAvailableSwitch")?.addEventListener("change", event => {
    document.getElementById("productAvailable").checked = event.target.checked;
    document.getElementById("productUnavailable").checked = !event.target.checked;
  });

  document.body.addEventListener("click", event => {
    const target = event.target.closest("button");
    if (!target) return;

    if (target.dataset.categoryFilter) {
      state.categoryFilter = target.dataset.categoryFilter;
      saveState();
      return;
    }
    if (target.id === "finishOrderBtn") {
      finishOrderFlow();
      return;
    }
    if (target.id === "myOrdersBtn") {
      navigateTo("/cardapio?tab=orders");
      return;
    }
    if (target.classList.contains("cart-jump-btn")) {
      document.querySelector(".cart-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (target.id === "publicProfileEditBtn") {
      openModal("loginModal");
      return;
    }

    if (target.dataset.productEdit) fillProductForm(products.find(product => product.id === target.dataset.productEdit));
    if (target.dataset.addProduct) addToCart(target.dataset.addProduct);
    if (target.dataset.cartInc) updateCart(target.dataset.cartInc, 1);
    if (target.dataset.cartDec) updateCart(target.dataset.cartDec, -1);
    if (target.dataset.cartRemove) removeFromCart(target.dataset.cartRemove);
    if (target.dataset.details) showOrderDetails(target.dataset.details);
    if (target.dataset.next) advanceOrder(target.dataset.next);
    if (target.dataset.cancel) cancelOrder(target.dataset.cancel);
    if (target.dataset.delete) deleteOrder(target.dataset.delete);
    if (target.dataset.print) printOrder(target.dataset.print);
    if (target.dataset.whatsapp) showToast("Mensagem do WhatsApp preparada");
    if (target.id === "myOrdersLoginBtn") openModal("loginModal");
  });

  document.getElementById("sidebarToggle")?.addEventListener("click", () => {
    const sidebar = document.getElementById("sidebar");
    if (window.innerWidth <= 780) sidebar.classList.toggle("open");
    else sidebar.classList.toggle("collapsed");
  });

  window.addEventListener("popstate", applyRoute);
  window.addEventListener("daniel:state-change", renderAll);
  window.addEventListener("storage", event => {
    if (event.key !== "danielLanchesRealtime") return;
    Object.assign(state, JSON.parse(event.newValue));
    renderAll();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 780) document.getElementById("sidebar").classList.remove("open");
  });
});
