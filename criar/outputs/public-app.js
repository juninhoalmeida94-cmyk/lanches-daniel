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
              <div class="panel-head"><div><span class="eyebrow">Perfil</span><h2>Dados do cliente</h2></div></div>
              <div class="profile-card">
                <p>Nome: <strong id="customerProfileName">Cliente Daniel</strong></p>
                <p>Telefone: <strong id="customerProfilePhone">(11) 90000-2026</strong></p>
                <p>Endereço: <strong id="customerProfileAddress">Rua das Flores, 128</strong></p>
                <button class="primary-btn" id="publicProfileEditBtn"><i data-lucide="user-round-plus"></i><span>Atualizar dados</span></button>
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