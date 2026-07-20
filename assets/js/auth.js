(function () {
  "use strict";

  const config = window.PMD_CONFIG;
  const api = window.PMD_API;
  const validRoles = ["admin", "technician"];
  const seedAccounts = [
    {
      id: "api-admin",
      name: "Admin Papuans Manado",
      email: "admin@papuansmanado.id",
      password: "admin123",
      role: "admin"
    },
    {
      id: "api-tech-rian",
      name: "Rian Kambu",
      email: "rian@papuansmanado.id",
      password: "teknisi123",
      role: "technician"
    },
    {
      id: "api-tech-melky",
      name: "Melky Mandagi",
      email: "melky@papuansmanado.id",
      password: "teknisi123",
      role: "technician"
    },
    {
      id: "api-tech-fadly",
      name: "Fadly Pratama",
      email: "fadly@papuansmanado.id",
      password: "teknisi123",
      role: "technician"
    }
  ];

  if (!config || !api) {
    throw new Error("PMD auth requires config.js and api.js.");
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizePhone(value) {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.startsWith("62")) {
      return "0" + digits.slice(2);
    }
    return digits;
  }

  function getSession() {
    const session = api.getSession();
    const user = session && session.user;
    if (
      !user ||
      !validRoles.includes(user.role) ||
      !user.email ||
      (user.role === "technician" && !user.technicianId)
    ) {
      return null;
    }
    return Object.assign({}, user, {
      expiresAt: session.expiresAt || null
    });
  }

  function getRoleHome(role) {
    return role === "technician" ? "teknisi.html#dashboard" : "admin.html#dashboard";
  }

  function getRedirectTarget(role) {
    const params = new URLSearchParams(window.location.search);
    const fallback = getRoleHome(role);
    const requested = String(params.get("redirect") || fallback);
    const pattern =
      role === "technician"
        ? /^teknisi\.html(?:#[a-z-]+)?$/
        : /^admin\.html(?:#[a-z-]+)?$/;
    return pattern.test(requested) ? requested : fallback;
  }

  function requireRole(role) {
    const session = getSession();
    if (session && session.role === role) {
      return true;
    }
    if (session) {
      window.location.replace(getRoleHome(session.role));
      return false;
    }

    const page = role === "technician" ? "teknisi.html" : "admin.html";
    const redirect = page + (window.location.hash || "#dashboard");
    window.location.replace(
      "login.html?role=" + encodeURIComponent(role) + "&redirect=" + encodeURIComponent(redirect)
    );
    return false;
  }

  function requireAdmin() {
    return requireRole("admin");
  }

  function requireTechnician() {
    return requireRole("technician");
  }

  async function validateSession(expectedRole) {
    const session = await api.me();
    const user = session && session.user;
    if (!user || !user.isActive) {
      throw new api.ApiError("Akun tidak aktif.", {
        status: 403,
        code: "ACCOUNT_INACTIVE"
      });
    }
    if (expectedRole && user.role !== expectedRole) {
      window.location.replace(getRoleHome(user.role));
      throw new api.ApiError("Role akun tidak sesuai dengan dashboard.", {
        status: 403,
        code: "ROLE_MISMATCH"
      });
    }
    return Object.assign({}, user);
  }

  async function login(email, password, role) {
    try {
      const session = await api.login(normalizeEmail(email), String(password || ""));
      const user = session.user;
      if (validRoles.includes(role) && user.role !== role) {
        await api.logout();
        return {
          ok: false,
          field: "role",
          message:
            "Akun ini terdaftar sebagai " +
            config.roles[user.role].label +
            ". Pilih akses yang sesuai."
        };
      }
      return { ok: true, user: Object.assign({}, user) };
    } catch (error) {
      return {
        ok: false,
        field: "email",
        message: error.message || "Login gagal diproses oleh API."
      };
    }
  }

  async function register(payload) {
    const name = String(payload.name || "").trim();
    const email = normalizeEmail(payload.email);
    const whatsapp = normalizePhone(payload.whatsapp);
    const role = String(payload.role || "admin");
    const password = String(payload.password || "");
    const confirmPassword = String(payload.confirmPassword || "");

    if (name.length < 3) {
      return { ok: false, field: "name", message: "Nama minimal 3 karakter." };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, field: "email", message: "Masukkan alamat email yang valid." };
    }
    if (!/^0\d{9,14}$/.test(whatsapp)) {
      return { ok: false, field: "whatsapp", message: "Masukkan nomor WhatsApp Indonesia yang valid." };
    }
    if (!validRoles.includes(role)) {
      return { ok: false, field: "role", message: "Pilih role Admin/Pemilik atau Teknisi." };
    }
    if (password.length < 8) {
      return { ok: false, field: "password", message: "Password minimal 8 karakter." };
    }
    if (password !== confirmPassword) {
      return { ok: false, field: "confirmPassword", message: "Konfirmasi password tidak sama." };
    }

    try {
      const session = await api.register({
        name,
        email,
        whatsapp,
        role,
        password,
        confirmPassword
      });
      return { ok: true, user: Object.assign({}, session.user) };
    } catch (error) {
      return {
        ok: false,
        field: error.code === "EMAIL_ALREADY_REGISTERED" ? "email" : null,
        message: error.message || "Registrasi gagal diproses oleh API."
      };
    }
  }

  async function logout() {
    const session = getSession();
    await api.logout();
    window.location.replace(
      "login.html" + (session ? "?role=" + encodeURIComponent(session.role) : "")
    );
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
      const field = form.elements[fieldName];
      const targetField =
        typeof field.setAttribute === "function"
          ? field
          : field.length && typeof field[0].setAttribute === "function"
            ? field[0]
            : null;
      if (targetField) {
        targetField.setAttribute("aria-invalid", "true");
      }
    }
  }

  function setSubmitting(form, submitting, label) {
    const button = form.querySelector("[data-auth-submit]");
    if (!button) {
      return;
    }
    button.disabled = submitting;
    button.textContent = submitting ? "Menghubungi API..." : label;
  }

  function initPasswordToggles() {
    document.querySelectorAll("[data-password-toggle]").forEach(function (button) {
      button.addEventListener("click", function () {
        const input = document.getElementById(button.getAttribute("data-password-toggle"));
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

    const roleCopy = document.querySelector("[data-login-role-copy]");
    const accountMount = form.querySelector("[data-demo-accounts]");

    function getSelectedRole() {
      return validRoles.includes(form.elements.role.value)
        ? form.elements.role.value
        : "admin";
    }

    function renderSeedAccounts(role) {
      if (!accountMount) {
        return;
      }
      accountMount.replaceChildren();
      seedAccounts
        .filter(function (user) {
          return user.role === role;
        })
        .forEach(function (user) {
          const button = document.createElement("button");
          const identity = document.createElement("span");
          const credential = document.createElement("span");
          button.type = "button";
          button.className =
            "flex min-h-14 w-full items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-left transition hover:border-primary-500 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500";
          button.setAttribute("data-api-account-id", user.id);
          identity.className = "min-w-0";
          const name = document.createElement("strong");
          const email = document.createElement("small");
          name.className = "block truncate text-xs font-black text-neutral-900";
          name.textContent = user.name;
          email.className = "mt-0.5 block truncate text-[0.6875rem] text-neutral-500";
          email.textContent = user.email;
          identity.appendChild(name);
          identity.appendChild(email);
          credential.className =
            "shrink-0 rounded-md bg-neutral-900 px-2 py-1 text-[0.6875rem] font-bold text-white";
          credential.textContent = user.password;
          button.appendChild(identity);
          button.appendChild(credential);
          accountMount.appendChild(button);
        });
    }

    function syncRole(role) {
      const input = form.querySelector('[name="role"][value="' + role + '"]');
      if (input) {
        input.checked = true;
      }
      if (roleCopy) {
        roleCopy.textContent = config.roles[role].label;
      }
      form.elements.email.placeholder =
        role === "technician"
          ? "rian@papuansmanado.id"
          : "admin@papuansmanado.id";
      renderSeedAccounts(role);
      setFormMessage(form, "");
    }

    const params = new URLSearchParams(window.location.search);
    const requestedRole = params.get("role");
    const redirect = String(params.get("redirect") || "");
    const initialRole =
      requestedRole === "technician" || redirect.startsWith("teknisi.html")
        ? "technician"
        : "admin";
    syncRole(initialRole);

    form.addEventListener("change", function (event) {
      if (event.target.name === "role") {
        syncRole(event.target.value);
      }
    });

    if (accountMount) {
      accountMount.addEventListener("click", function (event) {
        const button = event.target.closest("[data-api-account-id]");
        if (!button) {
          return;
        }
        const user = seedAccounts.find(function (candidate) {
          return candidate.id === button.getAttribute("data-api-account-id");
        });
        if (!user) {
          return;
        }
        syncRole(user.role);
        form.elements.email.value = user.email;
        form.elements.password.value = user.password;
        form.elements.email.focus();
      });
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      setFormMessage(form, "");
      setSubmitting(form, true, "Masuk ke Dashboard");
      const email = normalizeEmail(form.elements.email.value);
      const password = String(form.elements.password.value || "");
      const role = getSelectedRole();

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

      const result = await login(email, password, role);
      if (!result.ok) {
        setFormMessage(form, result.message, result.field || "email");
        setSubmitting(form, false, "Masuk ke Dashboard");
        return;
      }
      window.location.replace(getRedirectTarget(result.user.role));
    });
  }

  function initRegisterForm() {
    const form = document.querySelector("[data-register-form]");
    if (!form) {
      return;
    }
    const roleCopy = document.querySelector("[data-register-role-copy]");

    function syncRegisterRole() {
      const role = validRoles.includes(form.elements.role.value)
        ? form.elements.role.value
        : "admin";
      if (roleCopy) {
        roleCopy.textContent = config.roles[role].label;
      }
      form.elements.name.placeholder =
        role === "technician"
          ? "Nama lengkap teknisi"
          : "Nama admin atau pemilik";
      setFormMessage(form, "");
    }

    form.addEventListener("change", function (event) {
      if (event.target.name === "role") {
        syncRegisterRole();
      }
    });
    syncRegisterRole();

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      setFormMessage(form, "");
      setSubmitting(form, true, "Buat Akun");
      const result = await register({
        name: form.elements.name.value,
        email: form.elements.email.value,
        whatsapp: form.elements.whatsapp.value,
        role: form.elements.role.value,
        password: form.elements.password.value,
        confirmPassword: form.elements.confirmPassword.value
      });
      if (!result.ok) {
        setFormMessage(form, result.message, result.field);
        setSubmitting(form, false, "Buat Akun");
        if (result.field && form.elements[result.field]) {
          form.elements[result.field].focus();
        }
        return;
      }
      window.location.replace(getRoleHome(result.user.role));
    });
  }

  function initAuthPage() {
    initPasswordToggles();
    initLoginForm();
    initRegisterForm();
  }

  window.addEventListener("pmd:auth-expired", function () {
    const page = window.location.pathname.split("/").pop() || "";
    if (page === "admin.html" || page === "teknisi.html") {
      window.location.replace("login.html?expired=1");
    }
  });

  window.PMD_AUTH = {
    getSession,
    requireRole,
    requireAdmin,
    requireTechnician,
    validateSession,
    login,
    register,
    logout,
    initAuthPage
  };
})();
