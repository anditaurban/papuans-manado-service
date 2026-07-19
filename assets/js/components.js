(function () {
  "use strict";

  const config = window.PMD_CONFIG;

  if (!config) {
    throw new Error("PMD components require config.js.");
  }

  const iconPaths = {
    menu: '<path d="M4 7h16M4 12h16M4 17h16" />',
    close: '<path d="M6 6l12 12M18 6L6 18" />',
    check: '<path d="M20 6 9 17l-5-5" />',
    search: '<path d="m21 21-4.3-4.3" /><circle cx="11" cy="11" r="7" />',
    arrow: '<path d="M5 12h14M13 5l7 7-7 7" />',
    layout: '<rect x="4" y="5" width="16" height="14" rx="2" /><path d="M4 10h16M10 10v9" />',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18h2" />',
    user: '<path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" />',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />',
    tool: '<path d="M14.7 6.3a4 4 0 0 0-5-5L7.5 3.5l3 3L12.7 4.3a4 4 0 0 0 2 5L6 18l-3 3 3-3 8.7-8.7Z" />',
    box: '<path d="m21 8-9-5-9 5 9 5 9-5Z" /><path d="m3 8 9 5 9-5M3 8v8l9 5 9-5V8M12 13v8" />',
    wallet: '<path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6" /><path d="M16 13h2" />',
    chart: '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />',
    settings: '<circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />',
    alert: '<path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v6h6" />'
  };

  const statusClasses = {
    DITERIMA: "border-slate-200 bg-slate-100 text-slate-700",
    DIAGNOSA: "border-cyan-200 bg-cyan-50 text-cyan-700",
    MENUNGGU_SPAREPART: "border-amber-200 bg-amber-50 text-amber-700",
    PENGERJAAN: "border-indigo-200 bg-indigo-50 text-indigo-700",
    SIAP_DIAMBIL: "border-emerald-200 bg-emerald-50 text-emerald-700",
    SELESAI: "border-green-200 bg-green-50 text-green-700",
    DIAMBIL: "border-slate-300 bg-white text-slate-800 ring-1 ring-green-200"
  };

  const buttonClasses = {
    primary:
      "bg-primary-500 text-white hover:bg-primary-600 focus-visible:outline-primary-500",
    secondary:
      "border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 focus-visible:outline-primary-500",
    ghost:
      "text-neutral-700 hover:bg-neutral-100 focus-visible:outline-primary-500",
    danger:
      "bg-danger-500 text-white hover:bg-red-600 focus-visible:outline-danger-500"
  };

  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }

    callback();
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function icon(name, className) {
    const path = iconPaths[name] || iconPaths.layout;
    return [
      '<svg aria-hidden="true" class="',
      escapeHtml(className || "h-5 w-5"),
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ',
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      path,
      "</svg>"
    ].join("");
  }

  function formatRupiah(value) {
    if (typeof value !== "number") {
      return "-";
    }

    return new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency: config.currency,
      maximumFractionDigits: 0
    }).format(value);
  }

  function formatDate(value) {
    if (!value) {
      return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return new Intl.DateTimeFormat(config.locale, {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function formatDateTime(value) {
    if (!value) {
      return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return new Intl.DateTimeFormat(config.locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function maskName(name) {
    return String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(function (part, index) {
        const visibleLength = index === 0 && part.length > 2 ? 2 : 1;
        return part.slice(0, visibleLength) + "***";
      })
      .join(" ");
  }

  function maskWhatsApp(number) {
    const value = String(number || "");
    if (value.length <= 6) {
      return "******";
    }

    return value.slice(0, 2) + "******" + value.slice(-4);
  }

  function maskImei(imei) {
    const value = String(imei || "").trim();
    if (!value) {
      return "Tidak diisi";
    }

    return "***********" + value.slice(-4);
  }

  function getStatusMeta(status) {
    return (
      config.serviceStatuses.find(function (item) {
        return item.key === status;
      }) || {
        key: status,
        label: status,
        publicLabel: status,
        tone: "unknown",
        description: ""
      }
    );
  }

  function statusBadge(status, options) {
    const meta = getStatusMeta(status);
    const label = options && options.public ? meta.publicLabel : meta.label;
    const classes = statusClasses[meta.key] || "border-neutral-200 bg-white text-neutral-700";

    return [
      '<span class="inline-flex min-h-7 items-center rounded-full border px-3 py-1 text-xs font-semibold ',
      classes,
      '">',
      escapeHtml(label),
      "</span>"
    ].join("");
  }

  function button(options) {
    const settings = Object.assign(
      {
        label: "Tombol",
        variant: "primary",
        type: "button",
        iconName: "",
        disabled: false,
        className: "",
        attr: ""
      },
      options || {}
    );
    const classes = buttonClasses[settings.variant] || buttonClasses.primary;
    const disabledAttr = settings.disabled ? " disabled aria-disabled=\"true\"" : "";

    return [
      '<button type="',
      escapeHtml(settings.type),
      '" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ',
      classes,
      " ",
      escapeHtml(settings.className),
      '" ',
      settings.attr,
      disabledAttr,
      ">",
      settings.iconName ? icon(settings.iconName, "h-4 w-4") : "",
      "<span>",
      escapeHtml(settings.label),
      "</span></button>"
    ].join("");
  }

  function emptyState(options) {
    const settings = Object.assign(
      {
        title: "Belum ada data",
        message: "Data akan tampil di sini saat tersedia.",
        iconName: "layout",
        actionHtml: ""
      },
      options || {}
    );

    return [
      '<div class="app-card flex flex-col items-center justify-center px-6 py-10 text-center">',
      '<div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-600">',
      icon(settings.iconName, "h-6 w-6"),
      "</div>",
      '<h2 class="text-lg font-semibold text-neutral-900">',
      escapeHtml(settings.title),
      "</h2>",
      '<p class="mt-2 max-w-md text-sm leading-6 text-neutral-600">',
      escapeHtml(settings.message),
      "</p>",
      settings.actionHtml ? '<div class="mt-5">' + settings.actionHtml + "</div>" : "",
      "</div>"
    ].join("");
  }

  function loadingState(options) {
    const settings = Object.assign(
      {
        title: "Memuat data demo",
        message: "Simulasi membaca data lokal dari browser.",
        label: "Memuat"
      },
      options || {}
    );

    return [
      '<div class="app-card flex flex-col items-center justify-center px-6 py-10 text-center" role="status" aria-live="polite">',
      '<div class="mb-4 h-12 w-12 rounded-full border-4 border-primary-500/20 border-t-primary-500 motion-safe:animate-spin"></div>',
      '<span class="sr-only">',
      escapeHtml(settings.label),
      "</span>",
      '<h2 class="text-lg font-semibold text-neutral-900">',
      escapeHtml(settings.title),
      "</h2>",
      '<p class="mt-2 max-w-md text-sm leading-6 text-neutral-600">',
      escapeHtml(settings.message),
      "</p>",
      "</div>"
    ].join("");
  }

  function ensureToastRoot() {
    let root = document.querySelector("[data-toast-root]");
    if (!root) {
      root = document.createElement("div");
      root.setAttribute("data-toast-root", "");
      root.className = "fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3";
      document.body.appendChild(root);
    }
    return root;
  }

  function toast(message, options) {
    const settings = Object.assign({ type: "info", duration: 4500 }, options || {});
    const tones = {
      success: "border-green-200 bg-green-50 text-green-800",
      error: "border-red-200 bg-red-50 text-red-800",
      warning: "border-amber-200 bg-amber-50 text-amber-800",
      info: "border-cyan-200 bg-cyan-50 text-cyan-800"
    };
    const root = ensureToastRoot();
    const item = document.createElement("div");

    item.className =
      "app-toast rounded-xl border px-4 py-3 text-sm shadow-soft " +
      (tones[settings.type] || tones.info);
    item.setAttribute("role", settings.type === "error" ? "alert" : "status");
    item.innerHTML = [
      '<div class="flex items-start gap-3">',
      icon(settings.type === "error" ? "alert" : "check", "mt-0.5 h-4 w-4 shrink-0"),
      '<p class="flex-1 leading-6">',
      escapeHtml(message),
      "</p>",
      '<button type="button" class="rounded-lg p-1 text-current hover:bg-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" aria-label="Tutup notifikasi" data-toast-close>',
      icon("close", "h-4 w-4"),
      "</button>",
      "</div>"
    ].join("");

    root.appendChild(item);

    const remove = function () {
      item.remove();
    };

    item.querySelector("[data-toast-close]").addEventListener("click", remove);
    window.setTimeout(remove, settings.duration);
  }

  function confirmAction(options) {
    const settings = Object.assign(
      {
        title: "Konfirmasi aksi",
        message: "Pastikan data yang dipilih sudah benar.",
        confirmText: "Konfirmasi",
        cancelText: "Batal",
        variant: "danger",
        onConfirm: null
      },
      options || {}
    );
    const previousFocus = document.activeElement;
    const overlay = document.createElement("div");

    overlay.className = "fixed inset-0 z-50 flex items-end bg-slate-900/50 p-4 sm:items-center sm:justify-center";
    overlay.setAttribute("data-modal-overlay", "");
    overlay.innerHTML = [
      '<section role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description" class="w-full max-w-md rounded-2xl bg-white p-5 shadow-soft">',
      '<div class="flex items-start justify-between gap-4">',
      '<div><h2 id="dialog-title" class="text-lg font-semibold text-neutral-900">',
      escapeHtml(settings.title),
      '</h2><p id="dialog-description" class="mt-2 text-sm leading-6 text-neutral-600">',
      escapeHtml(settings.message),
      "</p></div>",
      '<button type="button" class="rounded-xl p-2 text-neutral-600 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500" aria-label="Tutup dialog" data-modal-cancel>',
      icon("close", "h-5 w-5"),
      "</button>",
      "</div>",
      '<div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">',
      button({ label: settings.cancelText, variant: "secondary", attr: "data-modal-cancel" }),
      button({ label: settings.confirmText, variant: settings.variant, attr: "data-modal-confirm" }),
      "</div>",
      "</section>"
    ].join("");

    function close() {
      overlay.remove();
      if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
      }
    }

    document.body.appendChild(overlay);
    overlay.querySelector("[data-modal-confirm]").focus();
    overlay.querySelectorAll("[data-modal-cancel]").forEach(function (control) {
      control.addEventListener("click", close);
    });
    overlay.querySelector("[data-modal-confirm]").addEventListener("click", function () {
      if (typeof settings.onConfirm === "function") {
        settings.onConfirm();
      }
      close();
    });
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) {
        close();
      }
    });

    function handleKeydown(event) {
      if (event.key === "Escape") {
        close();
        document.removeEventListener("keydown", handleKeydown);
      }
    }

    document.addEventListener("keydown", handleKeydown);
  }

  function navLink(item, activeId, compact) {
    const active = item.id === activeId;
    const activeClass = active
      ? "bg-primary-500 text-white shadow-sm"
      : "text-slate-700 hover:bg-slate-100";

    return [
      '<a class="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold transition ',
      activeClass,
      compact ? " justify-center" : " gap-3",
      '" href="',
      escapeHtml(item.href),
      '"',
      active ? ' aria-current="page"' : "",
      ">",
      compact ? "" : '<span>' + escapeHtml(item.label) + "</span>",
      compact ? '<span class="sr-only">' + escapeHtml(item.label) + "</span>" : "",
      "</a>"
    ].join("");
  }

  function brandLogoMarkup(sizeClass) {
    return [
      '<img class="brand-logo ',
      sizeClass || "h-11 w-11",
      '" src="',
      escapeHtml(config.app.logo),
      '" alt="Logo Papuans Manado" width="96" height="96">'
    ].join("");
  }

  function initPublicNav(activeId) {
    const mount = document.querySelector("[data-public-nav]");
    if (!mount) {
      return;
    }

    const links = config.menus.public
      .map(function (item) {
        const active = item.id === activeId;
        return [
          '<a class="rounded-xl px-3 py-2 text-sm font-semibold transition ',
          active ? "bg-white text-brand-900" : "text-white/80 hover:bg-white/10 hover:text-white",
          '" href="',
          escapeHtml(item.href),
          '"',
          active ? ' aria-current="page"' : "",
          ">",
          escapeHtml(item.label),
          "</a>"
        ].join("");
      })
      .join("");

    mount.innerHTML = [
      '<header class="public-navbar sticky top-0 z-40 text-white">',
      '<div class="mx-auto flex h-[4.75rem] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">',
      '<a href="index.html" class="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">',
      brandLogoMarkup("h-12 w-12"),
      '<span class="min-w-0"><span class="block truncate text-sm font-bold">',
      escapeHtml(config.app.shortName),
      '</span><span class="block truncate text-xs text-white/60">Cepat, aman, bergaransi</span></span>',
      "</a>",
      '<div class="hidden items-center gap-3 md:flex"><nav aria-label="Navigasi publik" class="flex items-center gap-1">',
      links,
      '</nav><a class="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-500 px-4 text-sm font-bold text-white transition hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" href="',
      escapeHtml(config.routes.login),
      '">Masuk Admin</a></div>',
      '<button type="button" class="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 md:hidden" aria-label="Buka menu" aria-expanded="false" data-public-menu-toggle>',
      icon("menu", "h-5 w-5"),
      "</button>",
      "</div>",
      '<div class="hidden border-t border-white/10 px-4 pb-4 md:hidden" data-public-menu>',
      '<nav aria-label="Navigasi publik mobile" class="flex flex-col gap-2 pt-3">',
      links,
      '<a class="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-500 px-4 text-sm font-bold text-white hover:bg-primary-600" href="',
      escapeHtml(config.routes.login),
      '">Masuk Admin</a></nav></div>',
      "</header>"
    ].join("");

    const toggle = mount.querySelector("[data-public-menu-toggle]");
    const menu = mount.querySelector("[data-public-menu]");

    function setOpen(nextOpen) {
      menu.classList.toggle("hidden", !nextOpen);
      toggle.setAttribute("aria-expanded", String(nextOpen));
      toggle.setAttribute("aria-label", nextOpen ? "Tutup menu" : "Buka menu");
      toggle.innerHTML = icon(nextOpen ? "close" : "menu", "h-5 w-5");
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    });
  }

  function initPublicFooter() {
    const mount = document.querySelector("[data-public-footer]");
    if (!mount) {
      return;
    }

    mount.innerHTML = [
      '<footer class="brand-footer border-t border-white/10 text-white">',
      '<div class="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-9 text-sm sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">',
      '<div class="flex items-start gap-3">',
      brandLogoMarkup("h-12 w-12"),
      '<div><p class="font-semibold text-white">',
      escapeHtml(config.app.name),
      '</p><p class="mt-1">',
      escapeHtml(config.app.address),
      '</p><p class="mt-1 text-white/60">',
      escapeHtml(config.app.hours),
      "</p></div></div>",
      '<a class="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-500 px-4 font-semibold text-white hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" href="',
      escapeHtml(config.app.whatsappUrl),
      '" target="_blank" rel="noopener noreferrer">',
      "Hubungi via WhatsApp",
      "</a>",
      "</div>",
      "</footer>"
    ].join("");
  }

  function sidebarMarkup(role, activeId, mobile) {
    const menu = config.menus[role] || [];
    const label = config.roles[role] ? config.roles[role].label : role;

    return [
      '<aside class="app-sidebar flex h-full w-72 shrink-0 flex-col text-white lg:w-64">',
      '<div class="flex min-h-[4.75rem] items-center gap-3 border-b border-white/10 px-5">',
      brandLogoMarkup("h-11 w-11"),
      '<div class="min-w-0"><p class="truncate text-sm font-bold">',
      escapeHtml(config.app.shortName),
      '</p><p class="truncate text-xs text-white/60">',
      escapeHtml(label),
      "</p></div>",
      mobile
        ? '<button type="button" class="ml-auto rounded-xl p-2 text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500" aria-label="Tutup sidebar" data-sidebar-close>' +
          icon("close", "h-5 w-5") +
          "</button>"
        : "",
      "</div>",
      '<nav aria-label="Menu ',
      escapeHtml(label),
      '" class="flex-1 space-y-1 px-3 py-4">',
      menu
        .map(function (item) {
          const active = item.id === activeId;
          return [
            '<a class="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold transition ',
            active ? "bg-primary-500 text-white" : "text-white/75 hover:bg-white/10 hover:text-white",
            '" href="',
            escapeHtml(item.href),
            '"',
            active ? ' aria-current="page"' : "",
            ">",
            icon(item.icon || "layout", "h-4 w-4 shrink-0"),
            '<span class="ml-3">',
            escapeHtml(item.label),
            "</span></a>"
          ].join("");
        })
        .join(""),
      "</nav>",
      '<div class="border-t border-white/10 p-4 text-xs leading-5 text-white/60">Prototype frontend dengan data lokal.</div>',
      "</aside>"
    ].join("");
  }

  function initAppShell(options) {
    const settings = Object.assign(
      {
        role: "admin",
        active: "dashboard",
        title: "Dashboard",
        subtitle: "",
        content: ""
      },
      options || {}
    );
    const mount = document.querySelector("[data-app-shell]");
    if (!mount) {
      return;
    }

    mount.innerHTML = [
      '<div class="admin-shell min-h-screen bg-neutral-50 lg:flex">',
      '<div class="desktop-sidebar hidden lg:block" data-desktop-sidebar>',
      sidebarMarkup(settings.role, settings.active, false),
      "</div>",
      '<div class="flex min-w-0 flex-1 flex-col">',
      '<header class="admin-topbar sticky top-0 z-30 flex min-h-[4.75rem] items-center gap-4 border-b border-neutral-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">',
      '<button type="button" class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 lg:hidden" aria-label="Buka sidebar" aria-expanded="false" data-sidebar-open>',
      icon("menu", "h-5 w-5"),
      "</button>",
      '<div class="min-w-0 flex-1"><p class="text-xs font-semibold text-primary-600">',
      escapeHtml(config.app.shortName),
      '</p><h1 class="truncate text-xl font-bold text-neutral-900 sm:text-2xl">',
      escapeHtml(settings.title),
      '</h1><p class="mt-1 hidden text-sm text-neutral-600 sm:block">',
      escapeHtml(settings.subtitle),
      "</p></div>",
      '<div class="flex items-center gap-2"><a href="index.html" class="hidden min-h-11 items-center rounded-lg border border-neutral-200 px-4 text-sm font-semibold text-neutral-900 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 sm:inline-flex">Halaman Publik</a>',
      settings.role === "admin"
        ? '<button type="button" class="inline-flex min-h-11 items-center rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500" data-auth-logout>Keluar</button>'
        : "",
      "</div>",
      "</header>",
      '<main id="main" class="flex-1 px-4 py-6 sm:px-6 lg:px-8">',
      settings.content || emptyState(),
      "</main>",
      "</div>",
      '<div class="fixed inset-0 z-40 hidden bg-slate-900/60 lg:hidden" data-sidebar-overlay>',
      sidebarMarkup(settings.role, settings.active, true),
      "</div>",
      "</div>",
      '<div data-toast-root class="fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3"></div>'
    ].join("");

    const openButton = mount.querySelector("[data-sidebar-open]");
    const overlay = mount.querySelector("[data-sidebar-overlay]");
    const closeButton = mount.querySelector("[data-sidebar-close]");
    const logoutButton = mount.querySelector("[data-auth-logout]");

    function setSidebarOpen(nextOpen) {
      overlay.classList.toggle("hidden", !nextOpen);
      openButton.setAttribute("aria-expanded", String(nextOpen));
      if (nextOpen && closeButton) {
        closeButton.focus();
      }
    }

    openButton.addEventListener("click", function () {
      setSidebarOpen(true);
    });

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) {
        setSidebarOpen(false);
      }
    });

    if (closeButton) {
      closeButton.addEventListener("click", function () {
        setSidebarOpen(false);
        openButton.focus();
      });
    }

    if (logoutButton) {
      logoutButton.addEventListener("click", function () {
        if (window.PMD_AUTH) {
          window.PMD_AUTH.logout();
        }
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    });
  }

  window.PMD_COMPONENTS = {
    onReady,
    escapeHtml,
    icon,
    button,
    emptyState,
    loadingState,
    toast,
    confirmAction,
    statusBadge,
    getStatusMeta,
    formatRupiah,
    formatDate,
    formatDateTime,
    maskName,
    maskWhatsApp,
    maskImei,
    initPublicNav,
    initPublicFooter,
    initAppShell
  };
})();
