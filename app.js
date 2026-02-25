/* ============================================
   app.js — Lógica principal da Minha Biblioteca
   Edite as configurações abaixo para personalizar
============================================ */

// =============================================
// ⚙️ CONFIGURAÇÕES — EDITE AQUI
// =============================================

const CONFIG = {
  // Senhas com diferentes níveis de acesso
  senhas: {
    "Querofaturar": { nivel: "completo", descricao: "Acesso Total" },
    "Receita10": { nivel: "basico", descricao: "Acesso Básico" },
    "Premium1": { nivel: "premium", descricao: "Acesso Premium" }
  },

  // IDs de conteúdo desbloqueado extra (via URL parameter ?unlock=ID)
  // Exemplo: envie o link com ?unlock=upsell1 depois do pagamento
  unlockedKeys: {
    upsell1: "card-upsell-1",
    upsell2: "card-upsell-2",
    upsell3: "card-upsell-3",
  },

  // Tempo de sessão (em horas). 0 = ilimitado (apenas fecha ao fazer logout)
  sessionHours: 168, // 7 dias
};

// =============================================
// VARIÁVEIS GLOBAIS
// =============================================

let deferredPrompt = null;

// =============================================
// INICIALIZAÇÃO
// =============================================

const isLogin = document.body.classList.contains("login-page");
const isDashboard = document.body.classList.contains("dashboard-page");

if (isLogin) initLogin();
if (isDashboard) initDashboard();

// =============================================
// REGISTRO DO SERVICE WORKER (PWA)
// =============================================

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("service-worker.js")
    .catch((err) => console.log("SW registration failed:", err));
}

// =============================================
// LÓGICA DE LOGIN
// =============================================

function initLogin() {
  // Redireciona se já estiver logado
  if (isLoggedIn()) {
    window.location.href = "dashboard.html";
    return;
  }

  // Verifica desbloqueio via URL (após pagamento)
  checkUnlockParam();

  // PWA Install Prompt
  setupPWABanner("pwaBanner", "installBtn", "closeBanner");

  // Password toggle
  const passwordToggle = document.getElementById("passwordToggle");
  const passwordInput = document.getElementById("senha");
  
  if (passwordToggle) {
    passwordToggle.addEventListener("click", (e) => {
      e.preventDefault();
      const isPassword = passwordInput.type === "password";
      passwordInput.type = isPassword ? "text" : "password";
      passwordToggle.textContent = isPassword ? "🙈" : "👁️";
    });
  }

  // Form de login
  const form = document.getElementById("loginForm");
  const errorMsg = document.getElementById("errorMsg");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value.trim();

    // Validação básica de email (deve ter @)
    if (!email.includes("@")) {
      errorMsg.textContent = "E-mail inválido. Use um e-mail com @";
      errorMsg.classList.add("show");
      setTimeout(() => errorMsg.classList.remove("show"), 4000);
      return;
    }

    // Validação da senha
    if (!senha) {
      errorMsg.textContent = "Por favor, digite a senha.";
      errorMsg.classList.add("show");
      setTimeout(() => errorMsg.classList.remove("show"), 4000);
      return;
    }

    // Verifica senha
    if (CONFIG.senhas[senha]) {
      console.log("✅ Senha correta! Salvando sessão...");
      setSession(CONFIG.senhas[senha].nivel);
      console.log("✅ Sessão salva. Redirecionando...");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 100);
    } else {
      errorMsg.textContent = "Senha incorreta. Tente novamente.";
      errorMsg.classList.add("show");
      document.getElementById("senha").value = "";
      document.getElementById("senha").focus();
      setTimeout(() => errorMsg.classList.remove("show"), 4000);
    }
  });
}

// =============================================
// LÓGICA DO DASHBOARD
// =============================================

function initDashboard() {
  console.log("🔍 Iniciando Dashboard...");
  console.log("Logado?", isLoggedIn());
  
  // Protege a rota — se não logado, volta pro login
  if (!isLoggedIn()) {
    console.log("❌ Não está logado! Redirecionando para login...");
    window.location.href = "index.html";
    return;
  }

  console.log("✅ Dashboard carregado com sucesso!");
  
  // Obtém nível de acesso e aplica restrições
  const acessLevel = getAccessLevel();
  console.log("📊 Nível de acesso:", acessLevel);
  
  // Se tiver acesso básico, desabilita cards 2 e 3
  if (acessLevel === "basico") {
    restrictContent();
  }
  // Se tiver acesso premium, desbloqueia automaticamente upsell 1
  else if (acessLevel === "premium") {
    unlockPremiumContent();
  }

  // Verifica desbloqueio via URL (após pagamento de upsell)
  checkUnlockParam();

  // Botão de logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    logout();
    window.location.href = "index.html";
  });

  // PWA Install no dashboard
  setupPWABanner(null, "installBtnDash", null);

  // Cliques nos cards
  setupCardClicks();

  // Modal PDF
  setupModal();
}

// =============================================
// CLIQUES NOS CARDS
// =============================================

function setupCardClicks() {
  // Cards desbloqueados → abre PDF no modal
  document.querySelectorAll(".card.unlocked").forEach((card) => {
    card.addEventListener("click", () => {
      const pdfPath = card.dataset.pdf;
      const title = card.dataset.title;
      if (pdfPath) openModal(pdfPath, title);
    });
  });

  // Cards bloqueados → verifica se foi desbloqueado via pagamento ou redireciona
  document.querySelectorAll(".card.locked").forEach((card, index) => {
    card.id = `card-upsell-${index + 1}`;

    const unlocked = isItemUnlocked(card.id);
    if (unlocked) {
      unlockCard(card);
      return;
    }

    card.addEventListener("click", () => {
      const checkout = card.dataset.checkout;
      if (checkout) {
        // Abre checkout em nova aba
        window.open(checkout, "_blank");
      }
    });
  });
}

// =============================================
// MODAL DE PDF
// =============================================

function setupModal() {
  const overlay = document.getElementById("pdfModal");
  const closeBtn = document.getElementById("modalClose");

  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  // Fechar com ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

function openModal(pdfPath, title) {
  const overlay = document.getElementById("pdfModal");
  const embed = document.getElementById("pdfEmbed");
  const titleEl = document.getElementById("modalTitle");
  const openNew = document.getElementById("pdfOpenNew");

  titleEl.textContent = title || "PDF";
  embed.src = pdfPath;
  openNew.href = pdfPath;
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  const overlay = document.getElementById("pdfModal");
  const embed = document.getElementById("pdfEmbed");
  overlay.classList.remove("open");
  document.body.style.overflow = "";
  setTimeout(() => { embed.src = ""; }, 300);
}

// =============================================
// RESTRIÇÕES DE CONTEÚDO
// =============================================

function restrictContent() {
  // Com acesso básico, apenas o primeiro card (Bolinho de Ouro) fica disponível
  const cards = document.querySelectorAll(".card.unlocked");
  
  if (cards.length > 0) {
    // Primeiro card fica desbloqueado
    cards[0].dataset.restricted = "false";
    
    // Cards 2 e 3 ficam bloqueados
    for (let i = 1; i < cards.length; i++) {
      const card = cards[i];
      card.classList.remove("unlocked");
      card.classList.add("locked");
      card.dataset.restricted = "true";
      
      // Adiciona overlay de bloqueio
      const cover = card.querySelector(".card-cover");
      if (cover && !cover.classList.contains("locked-cover")) {
        cover.classList.add("locked-cover");
        
        const overlay = document.createElement("div");
        overlay.className = "lock-overlay";
        overlay.innerHTML = '<div class="lock-icon">🔒</div><div class="lock-label">Clique para desbloquear</div>';
        cover.appendChild(overlay);
      }
      
      // Muda o badge do card
      const tag = card.querySelector(".card-tag");
      if (tag) {
        tag.textContent = "Desbloquear agora";
        tag.className = "card-tag premium";
      }
      
      // Remove listener de clique anterior e adiciona listener de checkout
      card.replaceWith(card.cloneNode(true));
    }
    
    // Re-adiciona listeners após clonagem
    const restrictedCards = document.querySelectorAll("[data-restricted='true']");
    restrictedCards.forEach((card) => {
      card.addEventListener("click", () => {
        const checkout = card.dataset.checkout;
        if (checkout) {
          window.open(checkout, "_blank");
        }
      });
    });
  }
}

// =============================================
// DESBLOQUEAR CONTEÚDO PREMIUM
// =============================================

function unlockPremiumContent() {
  // Com acesso premium, desbloqueia automaticamente o upsell 1
  const upsells = document.querySelectorAll(".card.locked");
  
  if (upsells.length > 0) {
    // Desbloqueia apenas o primeiro upsell (Molhos Premium Gourmet)
    const firstUpsell = upsells[0];
    unlockCard(firstUpsell);
    saveUnlockedItem(firstUpsell.id || "upsell-1");
    console.log("🔓 Upsell 1 desbloqueado para Premium!");
  }
}

// =============================================
// DESBLOQUEAR CARD
// =============================================

function unlockCard(card) {
  card.classList.remove("locked");
  card.classList.add("unlocked");

  const lockOverlay = card.querySelector(".lock-overlay");
  if (lockOverlay) lockOverlay.remove();

  const cover = card.querySelector(".card-cover");
  if (cover) cover.classList.remove("locked-cover");

  const icon = card.querySelector(".card-cover-icon");
  if (icon) icon.classList.remove("muted");

  const label = card.querySelector(".card-cover-label");
  if (label) label.classList.remove("muted");

  const tag = card.querySelector(".card-tag");
  if (tag) { tag.textContent = "Desbloqueado"; tag.className = "card-tag free"; }

  // Re-adiciona listener para abrir PDF
  const pdfPath = card.dataset.pdf;
  const title = card.dataset.title;
  if (pdfPath) {
    card.addEventListener("click", () => openModal(pdfPath, title));
  }
}

// =============================================
// DESBLOQUEIO POR URL PARAM (?unlock=upsell1)
// =============================================

function checkUnlockParam() {
  const params = new URLSearchParams(window.location.search);
  const unlockKey = params.get("unlock");

  if (unlockKey) {
    // Se unlock=basico, desbloqueia todos os cards com data-unlock-key="basico"
    if (unlockKey === "basico") {
      const cardsToUnlock = document.querySelectorAll('[data-unlock-key="basico"]');
      cardsToUnlock.forEach((card) => {
        unlockCard(card);
        saveUnlockedItem(card.id || card.dataset.title);
      });
    }
    // Se unlock=premium, desbloqueia o upsell 1
    else if (unlockKey === "premium") {
      const cardsToUnlock = document.querySelectorAll('[data-unlock-key="premium"]');
      cardsToUnlock.forEach((card) => {
        unlockCard(card);
        saveUnlockedItem(card.id || card.dataset.title);
      });
    }
    // Se for um upsell, desbloqueia o card correspondente
    else if (CONFIG.unlockedKeys[unlockKey]) {
      const cardId = CONFIG.unlockedKeys[unlockKey];
      const card = document.getElementById(cardId);
      if (card) {
        unlockCard(card);
        saveUnlockedItem(cardId);
      }
    }

    // Remove o param da URL sem recarregar
    const url = new URL(window.location);
    url.searchParams.delete("unlock");
    window.history.replaceState({}, "", url);
  }
}

// =============================================
// GERENCIAMENTO DE SESSÃO
// =============================================

function setSession(nivel = "basico") {
  const expiry =
    CONFIG.sessionHours > 0
      ? Date.now() + CONFIG.sessionHours * 60 * 60 * 1000
      : 0;
  localStorage.setItem("mbl_session", JSON.stringify({ expiry, nivel }));
  console.log("💾 Sessão salva:", { expiry, nivel });
}

function isLoggedIn() {
  const raw = localStorage.getItem("mbl_session");
  if (!raw) return false;
  try {
    const { expiry } = JSON.parse(raw);
    if (expiry > 0 && Date.now() > expiry) {
      localStorage.removeItem("mbl_session");
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function getAccessLevel() {
  const raw = localStorage.getItem("mbl_session");
  if (!raw) return "basico";
  try {
    const { nivel } = JSON.parse(raw);
    return nivel || "basico";
  } catch {
    return "basico";
  }
}

function logout() {
  localStorage.removeItem("mbl_session");
}

// =============================================
// ITENS DESBLOQUEADOS (UPSELLS)
// =============================================

function saveUnlockedItem(id) {
  const current = getUnlockedItems();
  if (!current.includes(id)) {
    current.push(id);
    localStorage.setItem("mbl_unlocked", JSON.stringify(current));
  }
}

function getUnlockedItems() {
  try {
    return JSON.parse(localStorage.getItem("mbl_unlocked") || "[]");
  } catch {
    return [];
  }
}

function isItemUnlocked(id) {
  return getUnlockedItems().includes(id);
}

// =============================================
// PWA — INSTALL PROMPT
// =============================================

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Mostra banner de login
  const banner = document.getElementById("pwaBanner");
  if (banner) banner.classList.remove("hidden");

  // Mostra botão no dashboard
  const dashBtn = document.getElementById("installBtnDash");
  if (dashBtn) dashBtn.style.display = "inline-flex";
});

function setupPWABanner(bannerId, installBtnId, closeBtnId) {
  const banner = bannerId ? document.getElementById(bannerId) : null;
  const installBtn = installBtnId ? document.getElementById(installBtnId) : null;
  const closeBtn = closeBtnId ? document.getElementById(closeBtnId) : null;

  // Verifica se o app já foi instalado
  const appInstalled = localStorage.getItem("pwa_installed");
  
  // No login, o banner fica sempre visível (a menos que já tenha sido instalado)
  if (banner && appInstalled) {
    banner.classList.add("hidden");
    return;
  }

  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      if (!deferredPrompt) {
        alert(
          "Para instalar: no Chrome, toque no menu (⋮) e selecione 'Adicionar à tela inicial'. No Safari, toque em Compartilhar e depois 'Adicionar à tela de início'."
        );
        return;
      }
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        // Marca que o app foi instalado
        localStorage.setItem("pwa_installed", "true");
        if (banner) banner.classList.add("hidden");
        const dashBtn = document.getElementById("installBtnDash");
        if (dashBtn) dashBtn.style.display = "none";
      }
      deferredPrompt = null;
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      // Apenas esconde visualmente nesta sessão, volta quando entrar novamente
      if (banner) banner.style.display = "none";
    });
  }
}
