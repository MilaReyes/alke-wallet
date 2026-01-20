// Alke Wallet - lógica base con localStorage + jQuery

const LS_KEYS = {
  AUTH: "alke_auth",
  USER: "alke_user",
  BALANCE: "alke_balance",
  CONTACTS: "alke_contacts",
  TX: "alke_transactions"
};

const MOCK_USER = {
  email: "demo@alke.cl",
  password: "1234",
  name: "Milena"
};

function moneyCLP(n) {
  const num = Number(n) || 0;
  return num.toLocaleString("es-CL", { style: "currency", currency: "CLP" });
}

function nowISO() {
  return new Date().toISOString();
}

function getJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function initIfNeeded() {
  // Inicializa datos si no existen
  if (localStorage.getItem(LS_KEYS.USER) === null) setJSON(LS_KEYS.USER, { name: MOCK_USER.name, email: MOCK_USER.email });
  if (localStorage.getItem(LS_KEYS.BALANCE) === null) localStorage.setItem(LS_KEYS.BALANCE, "25000"); // saldo inicial
  if (localStorage.getItem(LS_KEYS.CONTACTS) === null) setJSON(LS_KEYS.CONTACTS, [
    { name: "Mamá", email: "mama@correo.cl" },
    { name: "Esposo", email: "esposo@correo.cl" }
  ]);
  if (localStorage.getItem(LS_KEYS.TX) === null) setJSON(LS_KEYS.TX, []);
  if (localStorage.getItem(LS_KEYS.AUTH) === null) localStorage.setItem(LS_KEYS.AUTH, "false");
}

function isAuthed() {
  return localStorage.getItem(LS_KEYS.AUTH) === "true";
}

function requireAuth() {
  initIfNeeded();
  const path = (window.location.pathname || "").toLowerCase();
  const isLogin = path.includes("index.html
") || path.endsWith("/");
  if (!isLogin && !isAuthed()) {
    window.location.href = "index.html
";
  }
  if (isLogin && isAuthed()) {
    // Si ya está logueado, lo mandamos al menú
    window.location.href = "menu.html";
  }
}

function logout() {
  localStorage.setItem(LS_KEYS.AUTH, "false");
  window.location.href = "index.html
";
}

function getBalance() {
  return Number(localStorage.getItem(LS_KEYS.BALANCE) || "0");
}

function setBalance(n) {
  localStorage.setItem(LS_KEYS.BALANCE, String(Number(n) || 0));
}

function addTransaction(tx) {
  const list = getJSON(LS_KEYS.TX, []);
  list.unshift(tx); // último primero
  setJSON(LS_KEYS.TX, list);
}

function updateNavUser() {
  const user = getJSON(LS_KEYS.USER, { name: "Usuario" });
  $("#navUser").text(user.name || "Usuario");
}

function updateBalanceUI() {
  const b = getBalance();
  $(".js-balance").text(moneyCLP(b));
}

function renderTransactions(limit = 20) {
  const tx = getJSON(LS_KEYS.TX, []);
  const slice = tx.slice(0, limit);
  const $list = $("#txList");
  if (!$list.length) return;

  if (slice.length === 0) {
    $list.html(`<div class="text-muted">Aún no hay movimientos.</div>`);
    return;
  }

  const html = slice.map(t => {
    const sign = t.type === "deposit" ? "+" : "-";
    const badge = t.type === "deposit" ? "bg-success" : "bg-danger";
    const title = t.type === "deposit" ? "Depósito" : "Envío";
    const meta = t.type === "deposit"
      ? "Depósito en cuenta"
      : `A: ${t.toName} (${t.toEmail})`;

    const date = new Date(t.date).toLocaleString("es-CL");
    return `
      <div class="card mb-2">
        <div class="card-body d-flex justify-content-between align-items-start gap-3">
          <div>
            <div class="d-flex align-items-center gap-2">
              <span class="badge ${badge}">${title}</span>
              <small class="text-muted">${date}</small>
            </div>
            <div class="mt-1">${meta}</div>
          </div>
          <div class="mono fw-semibold">${sign} ${moneyCLP(t.amount)}</div>
        </div>
      </div>
    `;
  }).join("");

  $list.html(html);
}

function renderContacts(filterText = "") {
  const contacts = getJSON(LS_KEYS.CONTACTS, []);
  const q = (filterText || "").trim().toLowerCase();
  const filtered = q
    ? contacts.filter(c => (c.name + " " + c.email).toLowerCase().includes(q))
    : contacts;

  const $results = $("#contactResults");
  const $select = $("#contactSelect");

  if ($results.length) {
    if (filtered.length === 0) {
      $results.html(`<div class="text-muted">Sin resultados.</div>`);
      return;
    }
    $results.html(filtered.map(c => `
      <button type="button" class="list-group-item list-group-item-action js-pick-contact"
        data-name="${c.name}" data-email="${c.email}">
        <div class="fw-semibold">${c.name}</div>
        <small class="text-muted">${c.email}</small>
      </button>
    `).join(""));
  }

  if ($select.length) {
    $select.html(`<option value="">Selecciona...</option>` + contacts.map(c =>
      `<option value="${c.email}" data-name="${c.name}">${c.name} - ${c.email}</option>`
    ).join(""));
  }
}

function addContact(name, email) {
  const contacts = getJSON(LS_KEYS.CONTACTS, []);
  const exists = contacts.some(c => c.email.toLowerCase() === email.toLowerCase());
  if (exists) return { ok: false, msg: "Ese email ya existe en contactos." };

  contacts.push({ name, email });
  setJSON(LS_KEYS.CONTACTS, contacts);
  return { ok: true, msg: "Contacto agregado." };
}

$(document).ready(function () {
  requireAuth();
  initIfNeeded();
  updateNavUser();
  updateBalanceUI();
  renderTransactions();
  renderContacts();

  // Logout
  $(document).on("click", ".js-logout", function () {
    logout();
  });

  // Login
  $("#loginForm").on("submit", function (e) {
    e.preventDefault();
    const email = $("#email").val().trim();
    const pass = $("#password").val().trim();

    $("#loginAlert").addClass("d-none").text("");

    if (!email || !pass) {
      $("#loginAlert").removeClass("d-none").addClass("alert-danger").text("Completa email y contraseña.");
      return;
    }

    if (email === MOCK_USER.email && pass === MOCK_USER.password) {
      localStorage.setItem(LS_KEYS.AUTH, "true");
      setJSON(LS_KEYS.USER, { name: MOCK_USER.name, email: MOCK_USER.email });
      window.location.href = "menu.html";
    } else {
      $("#loginAlert").removeClass("d-none").addClass("alert-danger").text("Credenciales inválidas. Prueba demo@alke.cl / 1234");
    }
  });

  // Depositar
  $("#depositForm").on("submit", function (e) {
    e.preventDefault();
    const amount = Number($("#depositAmount").val());
    $("#depositAlert").addClass("d-none").text("");

    if (!amount || amount <= 0) {
      $("#depositAlert").removeClass("d-none").addClass("alert-danger").text("Ingresa un monto válido.");
      return;
    }

    const newBalance = getBalance() + amount;
    setBalance(newBalance);

    addTransaction({
      type: "deposit",
      amount,
      date: nowISO()
    });

    updateBalanceUI();
    $("#depositAmount").val("");
    $("#depositAlert").removeClass("d-none").removeClass("alert-danger").addClass("alert-success").text("Depósito realizado.");
  });

  // Enviar dinero
  $("#sendForm").on("submit", function (e) {
    e.preventDefault();
    $("#sendAlert").addClass("d-none").text("");

    const toEmail = $("#toEmail").val().trim();
    const toName = $("#toName").val().trim();
    const amount = Number($("#sendAmount").val());

    if (!toEmail || !toName) {
      $("#sendAlert").removeClass("d-none").addClass("alert-danger").text("Selecciona o completa un contacto.");
      return;
    }
    if (!amount || amount <= 0) {
      $("#sendAlert").removeClass("d-none").addClass("alert-danger").text("Ingresa un monto válido.");
      return;
    }

    const balance = getBalance();
    if (amount > balance) {
      $("#sendAlert").removeClass("d-none").addClass("alert-danger").text("Saldo insuficiente.");
      return;
    }

    setBalance(balance - amount);

    addTransaction({
      type: "send",
      amount,
      toEmail,
      toName,
      date: nowISO()
    });

    updateBalanceUI();
    $("#sendAmount").val("");
    $("#sendAlert").removeClass("d-none").removeClass("alert-danger").addClass("alert-success").text("Transferencia realizada.");
  });

  // Buscar contactos (autocompletar simple)
  $("#contactSearch").on("input", function () {
    const q = $(this).val();
    renderContacts(q);
  });

  // Click para elegir contacto desde lista
  $(document).on("click", ".js-pick-contact", function () {
    const name = $(this).data("name");
    const email = $(this).data("email");
    $("#toName").val(name);
    $("#toEmail").val(email);
  });

  // Select de contactos
  $("#contactSelect").on("change", function () {
    const email = $(this).val();
    const name = $(this).find("option:selected").data("name") || "";
    if (email) {
      $("#toName").val(name);
      $("#toEmail").val(email);
    }
  });

  // Agregar contacto
  $("#addContactForm").on("submit", function (e) {
    e.preventDefault();
    $("#contactAlert").addClass("d-none").text("");

    const name = $("#newContactName").val().trim();
    const email = $("#newContactEmail").val().trim();

    if (!name || !email) {
      $("#contactAlert").removeClass("d-none").addClass("alert-danger").text("Completa nombre y email.");
      return;
    }

    const res = addContact(name, email);
    if (!res.ok) {
      $("#contactAlert").removeClass("d-none").addClass("alert-danger").text(res.msg);
      return;
    }

    $("#newContactName").val("");
    $("#newContactEmail").val("");
    $("#contactAlert").removeClass("d-none").removeClass("alert-danger").addClass("alert-success").text(res.msg);
    renderContacts($("#contactSearch").val());
  });

  // Transactions page: render completo
  if ($("#txList").length) {
    renderTransactions(50);
  }
});

