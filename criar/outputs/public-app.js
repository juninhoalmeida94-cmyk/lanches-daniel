(function () {
  function getTab() {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    return tab === "orders" ? "orders" : tab === "profile" ? "profile" : "menu";
  }

  function customerHeader() {
    return `
      <header class="public-header">
        <div class="public-brand">
          <img src="daniel-lanches-logo.jpg" alt="Logo Daniel Lanches" />
          <div>
            <strong>Daniel Lanches</strong>
            <span>Delivery rápido e acolhedor</span>
          </div>
        </div>
        <div class="public-header-meta">
          <span class="status-pill" id="publicHeaderStatus">Aberto agora</span>
          <span class="status-pill muted">Entrega 35-45 min</span>
          <button class="icon-btn cart-jump-btn" aria-label="Ver carrinho">
            <i data-lucide="shopping-bag"></i>
            <span id="cartBadge"></span>
          </button>
        </div>
      </header>
    `;
  }

  function customerBottomNavigation() {
    const active = getTab();
    return `
      <nav class="customer-bottom-nav" aria-label="Navegação do cliente">
        <button class="customer-nav-item ${active === "menu" ? "active" : ""}" data-public-route="/cardapio?tab=menu">
          <i data-lucide="house"></i><span>Início</span>
        </button>
        <button class="customer-nav-item ${active === "orders" ? "active" : ""}" data-public-route="/cardapio?tab=orders">
          <i data-lucide="receipt"></i><span>Pedidos</span>
        </button>
        <button class="customer-nav-item ${active === "profile" ? "active" : ""}" data-public-route="/cardapio?tab=profile">
          <i data-lucide="user-round"></i><span>Perfil</span>
        </button>
      </nav>
    `;
  }

  function productCard(product) {
    return `
      <article class="food-card">
        <img src="daniel-lanches-hero.png" alt="${product.name}" />
        <div>
          <span>${product.category}</span>
          <h2>${product.name}</h2>
          <p>${product.description}</p>
          <div class="price-line">
            ${product.oldPrice ? `<small>${window.money(product.oldPrice)}</small>` : ""}
            <strong>${window.money(product.price)}</strong>
          </div>
        </div>
        <button class="icon-btn add-cart-btn" data-add-product="${product.id}" aria-label="Adicionar ${product.name}">
          <i data-lucide="plus"></i>
        </button>
      </article>
    `;
  }

  function cartDrawer() {
    return `
      <aside class="cart-panel public-cart-panel">
        <div class="panel-head cart-head">
          <div>
            <span class="eyebrow">Meu pedido</span>
            <h2>Carrinho</h2>
          </div>
          <i data-lucide="shopping-bag"></i>
        </div>
        <div id="cartItems"></div>
        <div class="delivery-summary">
          <span>Subtotal <b id="cartSubtotal">R$ 0,00</b></span>
          <span>Entrega fixa <b id="cartDelivery">R$ 7,90</b></span>
          <span>Total <b id="cartTotal">R$ 0,00</b></span>
        </div>
        <button class="primary-btn full" id="finishOrderBtn"><i data-lucide="send"></i><span>Finalizar pedido</span></button>
        <button class="ghost-btn full" id="myOrdersBtn"><i data-lucide="receipt"></i><span>Meus pedidos</span></button>
        <div class="store-closed-alert" id="closedCartAlert">Loja fechada no momento.</div>
      </aside>
    `;
  }

  function checkoutPage() {
    return `
      <section class="public-checkout-panel">
        <div class="panel-head">
          <div><span class="eyebrow">Finalizar</span><h2>Checkout</h2></div>
        </div>
        <div class="checkout-grid">
          <div>
            <div id="checkoutSummary" class="checkout-summary"></div>
            <label>Observações<textarea id="checkoutNotes" placeholder="Ex: sem cebola, ponto da carne"></textarea></label>
          </div>
          <div class="checkout-side">
            <label>Entrega ou retirada<select id="checkoutDeliveryMode"><option>Entrega no endereço</option><option>Retirada no local</option></select></label>
            <label>Endereço salvo<input id="checkoutAddress" /></label>
            <label>Forma de pagamento<select id="checkoutPayment"><option>Pix</option><option>Dinheiro</option><option>Cartão</option></select></label>
            <label id="changeField">Troco para<input id="checkoutChange" placeholder="Ex: R$ 100,00" /></label>
            <button class="primary-btn full" id="confirmOrderBtn"><i data-lucide="badge-check"></i><span>Confirmar pedido</span></button>
          </div>
        </div>
      </section>
    `;
  }

  function renderPublicShell(tab) {
    const root = document.getElementById("publicAppRoot");
    if (!root) return;
    root.innerHTML = `
      <div class="public-shell">
        ${customerHeader()}
        <section class="public-hero">
          <img src="daniel-lanches-hero.png" alt="Hambúrgueres artesanais" />
          <div class="public-overlay">
            <span id="publicStoreStatus">Aberto agora · entrega 35-45 min</span>
            <h1>Daniel Lanches</h1>
            <p>Hambúrgueres artesanais, combos e extras preparados para chegar quentes.</p>
            <div class="public-search"><i data-lucide="search"></i><input placeholder="Buscar no cardápio" /></div>
          </div>
        </section>
        <section class="public-shell-body">
          ${tab === "orders" ? `
            <section class="public-panel">
              <div class="panel-head"><div><span class="eyebrow">Meus pedidos</span><h2>Acompanhe o status</h2></div></div>
              <div id="myOrdersList"></div>
            </section>
          ` : tab === "profile" ? `
            <section class="public-panel">
              <div class="panel-head"><div><span class="eyebrow">Sua conta</span><h2>Perfil</h2></div></div>

              <div class="customer-auth-gate" id="customerAuthGate">
                <div class="customer-auth-icon"><i data-lucide="user-round"></i></div>
                <div><h2>Entre ou crie sua conta</h2><p>Acompanhe pedidos e mantenha seus dados de entrega protegidos.</p></div>
                <button type="button" class="google-login-btn" id="customerGoogleProfileBtn">
                  <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.5 24.5c0-1.57-.14-3.08-.4-4.54H24v9.09h12.64c-.55 2.94-2.2 5.43-4.7 7.1l7.27 5.64C43.47 37.86 46.5 31.67 46.5 24.5z"/>
                    <path fill="#FBBC05" d="M10.54 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.28-3.13.79-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.98-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.47 0 11.9-2.13 15.87-5.81l-7.27-5.64c-2.02 1.36-4.6 2.15-8.6 2.15-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  <span>Continuar com Google</span>
                </button>
                <button type="button" class="primary-btn full" id="customerEmailLoginBtn"><i data-lucide="mail"></i><span>Entrar com e-mail e senha</span></button>
                <button type="button" class="secondary-btn full" id="customerCreateAccountBtn"><i data-lucide="user-round-plus"></i><span>Criar conta</span></button>
                <button type="button" class="customer-auth-link" id="customerForgotPasswordBtn">Esqueci minha senha</button>
              </div>

              <div class="customer-confirmation" id="customerEmailConfirmation" style="display:none;">
                <div class="customer-auth-icon"><i data-lucide="mail-check"></i></div>
                <h2>Confirme seu e-mail</h2>
                <p>Enviamos um link de confirmação para <strong id="customerConfirmationEmail"></strong>. Confirme o endereço e depois volte para entrar.</p>
                <button type="button" class="primary-btn" id="confirmationBackToLogin"><i data-lucide="log-in"></i><span>Voltar para entrar</span></button>
              </div>

              <div class="profile-card" id="customerProfileContent" style="display:none;">
                <img class="profile-avatar" id="customerProfileAvatar" alt="Foto do perfil" style="display:none;" />
                <p>Nome: <strong id="customerProfileName"></strong></p>
                <p>E-mail: <strong id="customerProfileEmail">-</strong></p>
                <p>Telefone: <strong id="customerProfilePhone">Não informado</strong></p>
                <p>Endereço: <strong id="customerProfileAddress">Não informado</strong></p>
                <p>Referência: <strong id="customerProfileReference">Não informado</strong></p>
                <button class="primary-btn" id="publicProfileEditBtn"><i data-lucide="user-round-plus"></i><span>Atualizar dados</span></button>
                <button class="secondary-btn" id="customerLogoutBtn"><i data-lucide="log-out"></i><span>Sair da conta</span></button>
              </div>
            </section>
          ` : `
            <div class="category-tabs">
              <button class="active" data-category-filter="Todos">Todos</button>
              <button data-category-filter="Lanches">Lanches</button>
              <button data-category-filter="Porções">Porções</button>
              <button data-category-filter="Bebidas">Bebidas</button>
              <button data-category-filter="Favoritos">Favoritos</button>
            </div>
            <div class="section-title-row">
              <h2><i data-lucide="flame"></i> Promoções</h2>
              <span>Atualizado em tempo real</span>
            </div>
            <div id="specialOffers" class="offer-strip"></div>
            <div class="section-title-row menu-section-title">
              <h2><i data-lucide="utensils"></i> Cardápio</h2>
              <select class="sort-select" data-sort-select aria-label="Ordenar cardápio">
                <option value="default">Ordenar</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
              </select>
            </div>
            <div class="store-layout">
              <section>
                <div class="product-grid" id="publicProducts"></div>
              </section>
              ${cartDrawer()}
            </div>
          `}
        </section>
        ${customerBottomNavigation()}
      </div>
    `;
    window.lucide?.createIcons();
  }

  window.PublicApp = {
    render: renderPublicShell,
    renderProductCard: productCard,
    renderCartDrawer: cartDrawer,
    renderCheckoutPage: checkoutPage,
    getTab
  };
})();
