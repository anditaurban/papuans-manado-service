(function () {
  "use strict";

  const config = window.PMD_CONFIG;
  const usersKey = config.storage.authUsersKey;
  const sessionKey = config.storage.authSessionKey;
  const validRoles = ["admin", "technician"];
  const demoUsers = [
    {
      id: "AUTH-ADMIN-001",
      name: "Admin Papuans Manado",
      email: "admin@papuansmanado.id",
      whatsapp: "6282190087876",
      password: "admin123",
      role: "admin",
      createdAt: "2026-07-19T09:00:00.000Z"
    },
    {
      id: "AUTH-TECH-001",
      name: "Rian Kambu",
      email: "rian@papuansmanado.id",
      password: "teknisi123",
      role: "technician",
      technicianId: "TEC-001",
      createdAt: "2026-07-19T09:05:00.000Z"
    },
    {
      id: "AUTH-TECH-002",
      name: "Melky Mandagi",
      email: "melky@papuansmanado.id",
      password: "teknisi123",
      role: "technician",
      technicianId: "TEC-002",
      createdAt: "2026-07-19T09:06:00.000Z"
    },
    {
      id: "AUTH-TECH-003",
      name: "Fadly Pratama",
      email: "fadly@papuansmanado.id",
      password: "teknisi123",
      role: "technician",
      technicianId: "TEC-003",
      createdAt: "2026-07-19T09:07:00.000Z"
    }
  ];

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
      const seeded = demoUsers.map(function (user) {
        return Object.assign({}, user);
      });
      writeJson(usersKey, seeded);
      return seeded;
    }

    const demoEmails = new Set(
      demoUsers.map(function (user) {
        return user.email;
      })
    );
    const users = demoUsers
      .map(function (demoUser) {
        const existing = stored.find(function (user) {
          return normalizeEmail(user.email) === demoUser.email;
        });
        return Object.assign({}, existing || {}, demoUser);
      })
      .concat(
        stored.filter(function (user) {
          return !demoEmails.has(normalizeEmail(user.email));
        })
      );

    if (JSON.stringify(users) !== JSON.stringify(stored)) {
      writeJson(usersKey, users);
    }
    return users;
  }

  function getUsers() {
    return seedUsers().map(function (user) {
      return Object.assign({}, user);
    });
  }

  function getSession() {
    const session = readJson(sessionKey, null);
    if (
      !session ||
      !validRoles.includes(session.role) ||
      !session.email ||
      (session.role === "technician" && !session.technicianId)
    ) {
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
      technicianId: user.technicianId || null,
      signedInAt: new Date().toISOString()
    };
    writeJson(sessionKey, session);
    return session;
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

  function withDemoHandoff(target, user) {
    const parts = String(target || getRoleHome(user.role)).split("#");
    const separator = parts[0].includes("?") ? "&" : "?";
    return (
      parts[0] +
      separator +
      "demoAuth=" +
      encodeURIComponent(user.id) +
      (parts[1] ? "#" + parts[1] : "")
    );
  }

  function consumeDemoHandoff(expectedRole) {
    const params = new URLSearchParams(window.location.search);
    const handoffId = params.get("demoAuth");
    if (!handoffId) {
      return false;
    }

    const user =
      handoffId === "1"
        ? demoUsers[0]
        : getUsers().find(function (candidate) {
            return candidate.id === handoffId;
          });
    if (!user || user.role !== expectedRole) {
      return false;
    }

    setSession(user);
    try {
      if (window.history && typeof window.history.replaceState === "function") {
        const page = getRoleHome(user.role).split("#")[0];
        window.history.replaceState(null, "", page + (window.location.hash || "#dashboard"));
      }
    } catch (error) {
      // The handoff still works when a file URL blocks history replacement.
    }
    return true;
  }

  function requireRole(role) {
    if (consumeDemoHandoff(role)) {
      return true;
    }

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

  function login(email, password, role) {
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
    if (validRoles.includes(role) && user.role !== role) {
      return {
        ok: false,
        field: "role",
        message:
          "Akun ini terdaftar sebagai " +
          config.roles[user.role].label +
          ". Pilih akses yang sesuai."
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
    const session = getSession();
    window.localStorage.removeItem(sessionKey);
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

    const roleCopy = document.querySelector("[data-login-role-copy]");
    const demoMount = form.querySelector("[data-demo-accounts]");

    function getSelectedRole() {
      return validRoles.includes(form.elements.role.value)
        ? form.elements.role.value
        : "admin";
    }

    function renderDemoAccounts(role) {
      if (!demoMount) {
        return;
      }
      demoMount.replaceChildren();
      getUsers()
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
          button.setAttribute("data-demo-user-id", user.id);
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
          demoMount.appendChild(button);
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
      renderDemoAccounts(role);
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

    if (demoMount) {
      demoMount.addEventListener("click", function (event) {
        const button = event.target.closest("[data-demo-user-id]");
        if (!button) {
          return;
        }
        const user = getUsers().find(function (candidate) {
          return candidate.id === button.getAttribute("data-demo-user-id");
        });
        if (!user) {
          return;
        }
        syncRole(user.role);
        form.elements.email.value = user.email;
        form.elements.password.value = user.password;
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
      const result = login(email, password, role);
      if (!result.ok) {
        setFormMessage(form, result.message, result.field || "email");
        setSubmitting(form, false, "Masuk ke Dashboard");
        if (result.field === "role") {
          form.querySelector('[name="role"][value="' + role + '"]').focus();
        } else {
          form.elements.email.focus();
        }
        return;
      }
      window.location.replace(
        withDemoHandoff(getRedirectTarget(result.user.role), result.user)
      );
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
      window.location.replace(
        withDemoHandoff("admin.html#dashboard", result.user)
      );
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
    requireRole,
    requireAdmin,
    requireTechnician,
    login,
    register,
    logout,
    initAuthPage
  };
})();
