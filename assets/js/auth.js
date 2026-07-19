(function () {
  "use strict";

  const config = window.PMD_CONFIG;
  const usersKey = config.storage.authUsersKey;
  const sessionKey = config.storage.authSessionKey;
  const demoUser = {
    id: "AUTH-ADMIN-001",
    name: "Admin Papuans Manado",
    email: "admin@papuansmanado.id",
    whatsapp: "6282190087876",
    password: "admin123",
    role: "admin",
    createdAt: "2026-07-19T09:00:00.000Z"
  };

  function readJson(key, fallback) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key));
      return parsed === null ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizePhone(value) {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.startsWith("0")) {
      return "62" + digits.slice(1);
    }
    return digits;
  }

  function seedUsers() {
    const stored = readJson(usersKey, null);
    if (!Array.isArray(stored)) {
      writeJson(usersKey, [demoUser]);
      return [demoUser];
    }
    if (!stored.some(function (user) { return user.email === demoUser.email; })) {
      stored.unshift(demoUser);
      writeJson(usersKey, stored);
    }
    return stored;
  }

  function getUsers() {
    return seedUsers().map(function (user) {
      return Object.assign({}, user);
    });
  }

  function getSession() {
    const session = readJson(sessionKey, null);
    if (!session || session.role !== "admin" || !session.email) {
      return null;
    }
    return Object.assign({}, session);
  }

  function setSession(user) {
    const session = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      signedInAt: new Date().toISOString()
    };
    writeJson(sessionKey, session);
    return session;
  }

  function getRedirectTarget() {
    const params = new URLSearchParams(window.location.search);
    const requested = String(params.get("redirect") || "admin.html#dashboard");
    return /^admin\.html(?:#[a-z-]+)?$/.test(requested)
      ? requested
      : "admin.html#dashboard";
  }

  function withDemoHandoff(target) {
    const parts = String(target || "admin.html#dashboard").split("#");
    return parts[0] + "?demoAuth=1" + (parts[1] ? "#" + parts[1] : "");
  }

  function consumeDemoHandoff() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demoAuth") !== "1") {
      return false;
    }
    setSession(demoUser);
    try {
      if (window.history && typeof window.history.replaceState === "function") {
        window.history.replaceState(null, "", "admin.html" + (window.location.hash || "#dashboard"));
      }
    } catch (error) {
      // The handoff still works when a file URL blocks history replacement.
    }
    return true;
  }

  function requireAdmin() {
    if (getSession() || consumeDemoHandoff()) {
      return true;
    }
    const redirect = "admin.html" + (window.location.hash || "#dashboard");
    window.location.replace("login.html?redirect=" + encodeURIComponent(redirect));
    return false;
  }

  function login(email, password) {
    const normalizedEmail = normalizeEmail(email);
    const user = getUsers().find(function (candidate) {
      return candidate.email === normalizedEmail && candidate.password === String(password || "");
    });
    if (!user) {
      return {
        ok: false,
        message: "Email atau password demo belum sesuai."
      };
    }
    setSession(user);
    return { ok: true, user: Object.assign({}, user) };
  }

  function register(payload) {
    const name = String(payload.name || "").trim();
    const email = normalizeEmail(payload.email);
    const whatsapp = normalizePhone(payload.whatsapp);
    const password = String(payload.password || "");
    const confirmPassword = String(payload.confirmPassword || "");
    const users = getUsers();

    if (name.length < 3) {
      return { ok: false, field: "name", message: "Nama minimal 3 karakter." };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, field: "email", message: "Masukkan alamat email yang valid." };
    }
    if (whatsapp.length < 10 || whatsapp.length > 15) {
      return { ok: false, field: "whatsapp", message: "Masukkan nomor WhatsApp yang valid." };
    }
    if (password.length < 6) {
      return { ok: false, field: "password", message: "Password minimal 6 karakter." };
    }
    if (password !== confirmPassword) {
      return { ok: false, field: "confirmPassword", message: "Konfirmasi password tidak sama." };
    }
    if (users.some(function (user) { return user.email === email; })) {
      return { ok: false, field: "email", message: "Email sudah terdaftar pada browser ini." };
    }

    const user = {
      id: "AUTH-ADMIN-" + String(Date.now()),
      name,
      email,
      whatsapp,
      password,
      role: "admin",
      createdAt: new Date().toISOString()
    };
    users.push(user);
    writeJson(usersKey, users);
    setSession(user);
    return { ok: true, user: Object.assign({}, user) };
  }

  function logout() {
    window.localStorage.removeItem(sessionKey);
    window.location.replace("login.html");
  }

  function setFormMessage(form, message, fieldName) {
    const target = form.querySelector("[data-auth-message]");
    if (!target) {
      return;
    }
    Array.from(form.elements).forEach(function (field) {
      if (field && typeof field.removeAttribute === "function") {
        field.removeAttribute("aria-invalid");
      }
    });
    target.textContent = message || "";
    target.classList.toggle("hidden", !message);
    if (message && fieldName && form.elements[fieldName]) {
      form.elements[fieldName].setAttribute("aria-invalid", "true");
    }
  }

  function setSubmitting(form, submitting, label) {
    const button = form.querySelector("[data-auth-submit]");
    if (!button) {
      return;
    }
    button.disabled = submitting;
    button.textContent = submitting ? "Memproses..." : label;
  }

  function initPasswordToggles() {
    document.querySelectorAll("[data-password-toggle]").forEach(function (button) {
      button.addEventListener("click", function () {
        const inputId = button.getAttribute("data-password-toggle");
        const input = document.getElementById(inputId);
        if (!input) {
          return;
        }
        const revealing = input.type === "password";
        input.type = revealing ? "text" : "password";
        button.textContent = revealing ? "Sembunyikan" : "Lihat";
        button.setAttribute("aria-pressed", String(revealing));
      });
    });
  }

  function initLoginForm() {
    const form = document.querySelector("[data-login-form]");
    if (!form) {
      return;
    }
    const demoButton = form.querySelector("[data-fill-demo]");
    if (demoButton) {
      demoButton.addEventListener("click", function () {
        form.elements.email.value = demoUser.email;
        form.elements.password.value = demoUser.password;
        setFormMessage(form, "");
        form.elements.email.focus();
      });
    }
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      setFormMessage(form, "");
      setSubmitting(form, true, "Masuk ke Dashboard");
      const email = normalizeEmail(form.elements.email.value);
      const password = String(form.elements.password.value || "");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFormMessage(form, "Masukkan alamat email yang valid.", "email");
        setSubmitting(form, false, "Masuk ke Dashboard");
        form.elements.email.focus();
        return;
      }
      if (!password) {
        setFormMessage(form, "Password wajib diisi.", "password");
        setSubmitting(form, false, "Masuk ke Dashboard");
        form.elements.password.focus();
        return;
      }
      const result = login(email, password);
      if (!result.ok) {
        setFormMessage(form, result.message, "email");
        setSubmitting(form, false, "Masuk ke Dashboard");
        form.elements.email.focus();
        return;
      }
      window.location.replace(withDemoHandoff(getRedirectTarget()));
    });
  }

  function initRegisterForm() {
    const form = document.querySelector("[data-register-form]");
    if (!form) {
      return;
    }
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      setFormMessage(form, "");
      setSubmitting(form, true, "Buat Akun Demo");
      const result = register({
        name: form.elements.name.value,
        email: form.elements.email.value,
        whatsapp: form.elements.whatsapp.value,
        password: form.elements.password.value,
        confirmPassword: form.elements.confirmPassword.value
      });
      if (!result.ok) {
        setFormMessage(form, result.message, result.field);
        setSubmitting(form, false, "Buat Akun Demo");
        if (form.elements[result.field]) {
          form.elements[result.field].focus();
        }
        return;
      }
      window.location.replace(withDemoHandoff("admin.html#dashboard"));
    });
  }

  function initAuthPage() {
    seedUsers();
    initPasswordToggles();
    initLoginForm();
    initRegisterForm();
  }

  window.PMD_AUTH = {
    getUsers,
    getSession,
    requireAdmin,
    login,
    register,
    logout,
    initAuthPage
  };
})();
