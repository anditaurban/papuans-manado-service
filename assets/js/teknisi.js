(function () {
  "use strict";

  const components = window.PMD_COMPONENTS;
  const config = window.PMD_CONFIG;
  const store = window.PMD_STORE;
  const auth = window.PMD_AUTH;

  if (!auth || !auth.requireTechnician()) {
    return;
  }

  let authSession = auth.getSession();
  const statusFlow = ["DITERIMA", "DIAGNOSA", "MENUNGGU_SPAREPART", "PENGERJAAN", "SIAP_DIAMBIL", "SELESAI", "DIAMBIL"];
  const editableStatuses = ["DITERIMA", "DIAGNOSA", "MENUNGGU_SPAREPART", "PENGERJAAN", "SIAP_DIAMBIL"];
  const closedStatuses = ["SELESAI", "DIAMBIL"];
  const filters = {
    assignmentSearch: "",
    assignmentStatus: "ACTIVE",
    assignmentPriority: "ALL"
  };

  let activeTechnicianId = "";
  let eventsBound = false;
  let unsubscribe = null;

  function html(value) {
    return components.escapeHtml(value);
  }

  function attr(value) {
    return html(value);
  }

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function toDateKey(value) {
    return String(value || "").slice(0, 10);
  }

  function toNumber(value) {
    const number = Number(String(value == null ? "" : value).replace(/[^\d.-]/g, ""));
    return Number.isFinite(number) ? number : 0;
  }

  function toPositiveInt(value) {
    const number = parseInt(value, 10);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function displayPhone(value) {
    const digits = String(value || "").replace(/\D/g, "");
    return digits.startsWith("62") ? "0" + digits.slice(2) : digits;
  }

  function parseSkills(value) {
    const seen = new Set();
    return String(value || "")
      .split(/[,\n]/)
      .map(function (skill) {
        return skill.trim();
      })
      .filter(function (skill) {
        const key = skill.toLowerCase();
        if (!skill || seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
  }

  function getDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function daysBetween(startValue, endValue) {
    const start = getDate(startValue);
    const end = getDate(endValue);
    if (!start || !end) {
      return null;
    }

    return Math.max(0, (end - start) / 86400000);
  }

  function getCompletionDate(service) {
    return service.readyAt || service.completedAt || service.pickedUpAt || null;
  }

  function getStatusLabel(status) {
    const meta = config.serviceStatuses.find(function (item) {
      return item.key === status;
    });

    return meta ? meta.label : status;
  }

  function getStatusIndex(status) {
    return statusFlow.indexOf(status);
  }

  function getCustomer(state, id) {
    return state.customers.find(function (customer) {
      return customer.id === id;
    });
  }

  function getDamageType(state, id) {
    return state.damageTypes.find(function (damage) {
      return damage.id === id;
    });
  }

  function getPart(state, id) {
    return state.parts.find(function (part) {
      return part.id === id;
    });
  }

  function getTechnician(state, id) {
    return state.technicians.find(function (technician) {
      return technician.id === id;
    });
  }

  function getDeviceName(service) {
    return [service.device.brand, service.device.model].filter(Boolean).join(" ");
  }

  function getCustomerName(state, customerId) {
    const customer = getCustomer(state, customerId);
    return customer ? customer.name : "-";
  }

  function getDamageName(state, damageTypeId) {
    const damage = getDamageType(state, damageTypeId);
    return damage ? damage.name : "-";
  }

  function getPartUsageSummary(state, service) {
    const usages = service.partUsages || [];
    if (!usages.length) {
      return "Belum ada sparepart dipakai";
    }

    return usages
      .map(function (usage) {
        const part = getPart(state, usage.partId);
        return (part ? part.sku : usage.partId) + " x" + usage.qty;
      })
      .join(", ");
  }

  function getPaymentStatus(state, serviceId) {
    const payment = state.payments.find(function (item) {
      return item.serviceId === serviceId;
    });

    return payment ? payment.status : "Belum dibayar";
  }

  function getDashboardDate(state) {
    return state.serviceOrders
      .map(function (service) {
        return toDateKey(service.receivedAt);
      })
      .filter(Boolean)
      .sort()
      .pop();
  }

  function getAssignments(state, technicianId) {
    return state.serviceOrders.filter(function (service) {
      return service.technicianId === technicianId;
    });
  }

  function getVisibleAssignments(state, technicianId) {
    return getAssignments(state, technicianId)
      .filter(function (service) {
        const text = [
          service.receipt,
          getCustomerName(state, service.customerId),
          getDeviceName(service),
          service.complaint,
          getDamageName(state, service.damageTypeId)
        ].join(" ");
        const searchOk = !filters.assignmentSearch || normalize(text).includes(normalize(filters.assignmentSearch));
        const statusOk =
          filters.assignmentStatus === "ALL" ||
          (filters.assignmentStatus === "ACTIVE" && !closedStatuses.includes(service.status)) ||
          service.status === filters.assignmentStatus;
        const priorityOk = filters.assignmentPriority === "ALL" || service.priority === filters.assignmentPriority;
        return searchOk && statusOk && priorityOk;
      })
      .sort(function (first, second) {
        return new Date(second.receivedAt) - new Date(first.receivedAt);
      });
  }

  function getTechnicianStats(state, technicianId) {
    const assignments = getAssignments(state, technicianId);
    const active = assignments.filter(function (service) {
      return !closedStatuses.includes(service.status);
    });
    const dashboardDate = getDashboardDate(state);
    const weekStart = dashboardDate ? new Date(dashboardDate + "T00:00:00") : null;
    if (weekStart) {
      weekStart.setDate(weekStart.getDate() - 6);
    }
    const completedWeek = assignments.filter(function (service) {
      const completion = getCompletionDate(service);
      return (
        completion &&
        ["SIAP_DIAMBIL", "SELESAI", "DIAMBIL"].includes(service.status) &&
        (!weekStart || new Date(completion) >= weekStart)
      );
    });

    return {
      active: active.length,
      highPriority: active.filter(function (service) {
        return service.priority === "Tinggi";
      }).length,
      waitingParts: active.filter(function (service) {
        return service.status === "MENUNGGU_SPAREPART";
      }).length,
      completedWeek: completedWeek.length
    };
  }

  function getStockTone(part) {
    if (part.stock <= 0) {
      return {
        label: "Habis",
        className: "border-red-200 bg-red-50 text-red-700"
      };
    }
    if (part.stock <= part.minStock) {
      return {
        label: "Menipis",
        className: "border-amber-200 bg-amber-50 text-amber-700"
      };
    }
    return {
      label: "Aman",
      className: "border-green-200 bg-green-50 text-green-700"
    };
  }

  function isNormalTransition(fromStatus, toStatus) {
    if (fromStatus === toStatus) {
      return true;
    }
    if (fromStatus === "DITERIMA" && toStatus === "DIAGNOSA") {
      return true;
    }
    if (fromStatus === "DIAGNOSA" && (toStatus === "MENUNGGU_SPAREPART" || toStatus === "PENGERJAAN")) {
      return true;
    }
    if (fromStatus === "MENUNGGU_SPAREPART" && toStatus === "PENGERJAAN") {
      return true;
    }
    if (fromStatus === "PENGERJAAN" && toStatus === "SIAP_DIAMBIL") {
      return true;
    }

    return false;
  }

  function option(value, label, selected) {
    return [
      '<option value="',
      attr(value),
      '"',
      String(value) === String(selected) ? " selected" : "",
      ">",
      html(label),
      "</option>"
    ].join("");
  }

  function statusOptions(selected) {
    const transitions = {
      DITERIMA: ["DITERIMA", "DIAGNOSA"],
      DIAGNOSA: ["DIAGNOSA", "MENUNGGU_SPAREPART", "PENGERJAAN"],
      MENUNGGU_SPAREPART: ["MENUNGGU_SPAREPART", "PENGERJAAN"],
      PENGERJAAN: ["PENGERJAAN", "SIAP_DIAMBIL"],
      SIAP_DIAMBIL: ["SIAP_DIAMBIL"]
    };
    return (transitions[selected] || [selected])
      .map(function (status) {
        return option(status, getStatusLabel(status), selected);
      })
      .join("");
  }

  function partOptions(state) {
    return (
      option("", "Tidak memakai sparepart", "") +
      state.parts
        .map(function (part) {
          return option(part.id, part.sku + " - " + part.name + " (stok " + part.stock + ")", "");
        })
        .join("")
    );
  }

  function inputField(label, name, value, settings) {
    const options = Object.assign({ type: "text", required: false, min: "", helper: "", placeholder: "" }, settings || {});
    return [
      '<label class="block text-sm font-semibold text-neutral-700">',
      html(label),
      options.required ? ' <span class="text-danger-500">*</span>' : "",
      '<input name="',
      attr(name),
      '" type="',
      attr(options.type),
      '" value="',
      attr(value || ""),
      '"',
      options.required ? " required" : "",
      options.min !== "" ? ' min="' + attr(options.min) + '"' : "",
      options.placeholder ? ' placeholder="' + attr(options.placeholder) + '"' : "",
      ' class="mt-2 min-h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15">',
      options.helper ? '<span class="mt-1 block text-xs leading-5 text-neutral-500">' + html(options.helper) + "</span>" : "",
      "</label>"
    ].join("");
  }

  function selectField(label, name, optionsHtml, settings) {
    const options = Object.assign({ required: false, helper: "" }, settings || {});
    return [
      '<label class="block text-sm font-semibold text-neutral-700">',
      html(label),
      options.required ? ' <span class="text-danger-500">*</span>' : "",
      '<select name="',
      attr(name),
      '"',
      options.required ? " required" : "",
      ' class="mt-2 min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15">',
      optionsHtml,
      "</select>",
      options.helper ? '<span class="mt-1 block text-xs leading-5 text-neutral-500">' + html(options.helper) + "</span>" : "",
      "</label>"
    ].join("");
  }

  function textareaField(label, name, value, settings) {
    const options = Object.assign({ rows: 3, required: false, helper: "" }, settings || {});
    return [
      '<label class="block text-sm font-semibold text-neutral-700">',
      html(label),
      options.required ? ' <span class="text-danger-500">*</span>' : "",
      '<textarea name="',
      attr(name),
      '" rows="',
      attr(options.rows),
      '"',
      options.required ? " required" : "",
      ' class="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15">',
      html(value || ""),
      "</textarea>",
      options.helper ? '<span class="mt-1 block text-xs leading-5 text-neutral-500">' + html(options.helper) + "</span>" : "",
      "</label>"
    ].join("");
  }

  function actionButton(label, action, id, variant) {
    const tones = {
      primary: "bg-primary-500 text-white hover:bg-primary-600 focus-visible:outline-primary-500",
      secondary: "border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 focus-visible:outline-primary-500",
      danger: "bg-danger-500 text-white hover:bg-red-600 focus-visible:outline-danger-500"
    };
    return [
      '<button type="button" class="inline-flex min-h-10 items-center justify-center rounded-xl px-3 py-2 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ',
      tones[variant || "secondary"],
      '" data-action="',
      attr(action),
      '"',
      id ? ' data-id="' + attr(id) + '"' : "",
      ">",
      html(label),
      "</button>"
    ].join("");
  }

  function iconAction(label, action, id, iconName) {
    return [
      '<button type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-xl text-neutral-700 transition hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500" aria-label="',
      attr(label),
      '" title="',
      attr(label),
      '" data-action="',
      attr(action),
      '" data-id="',
      attr(id),
      '">',
      components.icon(iconName || "layout", "h-4 w-4"),
      "</button>"
    ].join("");
  }

  function closeModal(overlay) {
    if (overlay) {
      overlay.remove();
    }
  }

  function openModal(options) {
    const settings = Object.assign(
      {
        title: "Form",
        description: "",
        body: "",
        confirmText: "Simpan",
        cancelText: "Batal",
        onSubmit: null
      },
      options || {}
    );
    const previousFocus = document.activeElement;
    const overlay = document.createElement("div");

    overlay.className = "fixed inset-0 z-50 flex items-end bg-slate-900/50 p-4 sm:items-center sm:justify-center";
    overlay.setAttribute("data-technician-modal", "");
    overlay.innerHTML = [
      '<section role="dialog" aria-modal="true" aria-labelledby="technician-modal-title" aria-describedby="technician-modal-desc" class="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-soft">',
      '<form data-technician-modal-form>',
      '<div class="flex items-start justify-between gap-4 border-b border-neutral-200 p-5">',
      '<div><h2 id="technician-modal-title" class="text-lg font-black text-neutral-900">',
      html(settings.title),
      '</h2><p id="technician-modal-desc" class="mt-2 text-sm leading-6 text-neutral-600">',
      html(settings.description),
      "</p></div>",
      '<button type="button" class="rounded-xl p-2 text-neutral-600 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500" aria-label="Tutup dialog" data-modal-close>',
      components.icon("close", "h-5 w-5"),
      "</button></div>",
      '<div class="p-5">',
      '<p class="mb-4 hidden rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert" data-form-error></p>',
      settings.body,
      "</div>",
      '<div class="flex flex-col-reverse gap-3 border-t border-neutral-200 p-5 sm:flex-row sm:justify-end">',
      components.button({ label: settings.cancelText, variant: "secondary", attr: "data-modal-close" }),
      components.button({ label: settings.confirmText, variant: "primary", type: "submit", iconName: "check" }),
      "</div>",
      "</form></section>"
    ].join("");

    document.body.appendChild(overlay);

    function close() {
      closeModal(overlay);
      if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
      }
      document.removeEventListener("keydown", onKeydown);
    }

    function onKeydown(event) {
      if (event.key === "Escape") {
        close();
      }
    }

    overlay.querySelectorAll("[data-modal-close]").forEach(function (control) {
      control.addEventListener("click", close);
    });
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) {
        close();
      }
    });
    overlay.querySelector("[data-technician-modal-form]").addEventListener("submit", async function (event) {
      event.preventDefault();
      const form = event.target;
      const submitButton = form.querySelector('[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
      }
      try {
        const result =
          typeof settings.onSubmit === "function"
            ? await settings.onSubmit(new FormData(form), form, close)
            : true;
        if (result !== false) {
          close();
        }
      } catch (error) {
        setFormError(form, error.message || "Data gagal disimpan melalui API.");
      } finally {
        if (submitButton && overlay.isConnected) {
          submitButton.disabled = false;
        }
      }
    });
    document.addEventListener("keydown", onKeydown);

    const firstInput = overlay.querySelector("input, select, textarea, button");
    if (firstInput && typeof firstInput.focus === "function") {
      firstInput.focus();
    }
  }

  function setFormError(form, message) {
    const error = form.querySelector("[data-form-error]");
    if (!error) {
      return;
    }
    error.textContent = message;
    error.classList.remove("hidden");
  }

  function showSuccess(message) {
    components.toast(message, { type: "success" });
  }

  function showError(message) {
    components.toast(message, { type: "error" });
  }

  function renderKpiCard(label, value, note, iconName, tone) {
    return [
      '<article class="app-card p-5 sm:p-6">',
      '<div class="flex items-start justify-between gap-4"><div><p class="text-sm font-semibold text-neutral-600">',
      html(label),
      '</p><p class="mt-3 text-3xl font-black tabular-nums text-neutral-900">',
      html(value),
      '</p></div><div class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ',
      html(tone),
      '">',
      components.icon(iconName, "h-5 w-5"),
      "</div></div>",
      '<p class="mt-3 text-xs leading-5 text-neutral-500">',
      html(note),
      "</p></article>"
    ].join("");
  }

  function renderSessionIdentity(technician) {
    const skills = technician.skills
      .map(function (skill) {
        return [
          '<span class="inline-flex min-h-8 items-center rounded-md border border-neutral-200 bg-neutral-50 px-3 text-xs font-bold text-neutral-700">',
          html(skill),
          "</span>"
        ].join("");
      })
      .join("");

    return [
      '<section id="dashboard" class="app-card scroll-mt-24 p-5 sm:p-6">',
      '<div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">',
      '<div><p class="text-sm font-semibold text-primary-600">Sesi teknisi aktif</p>',
      '<h2 class="mt-2 text-3xl font-black text-neutral-900">',
      html(technician.name),
      '</h2><p class="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">Dashboard hanya menampilkan tiket yang assigned ke akun ini.</p>',
      '<p class="mt-2 text-xs font-semibold text-neutral-500">',
      html(authSession.email),
      "</p></div>",
      '<div class="lg:max-w-md"><div class="flex flex-wrap gap-2">',
      '<span class="inline-flex min-h-8 items-center rounded-md bg-neutral-900 px-3 text-xs font-bold text-white">',
      html(technician.availability),
      "</span>",
      skills,
      "</div></div></div>",
      "</section>"
    ].join("");
  }

  function renderKpis(state, technician) {
    const stats = getTechnicianStats(state, technician.id);
    return [
      '<section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">',
      renderKpiCard("Tugas aktif", stats.active, "Assigned dan belum ditutup", "layout", "bg-primary-500/10 text-primary-600"),
      renderKpiCard("Prioritas tinggi", stats.highPriority, "Butuh perhatian cepat", "alert", "bg-orange-50 text-accent-500"),
      renderKpiCard("Menunggu sparepart", stats.waitingParts, "Pantau stok komponen", "phone", "bg-amber-50 text-amber-600"),
      renderKpiCard("Selesai minggu ini", stats.completedWeek, "Siap/selesai/diambil", "check", "bg-green-50 text-green-600"),
      "</section>"
    ].join("");
  }

  function renderFilterForm(state) {
    return [
      '<form class="grid gap-3 border-b border-neutral-200 bg-white p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-4" data-assignment-filter>',
      '<label class="text-xs font-bold text-neutral-600">Cari tugas',
      '<input name="assignmentSearch" type="search" value="',
      attr(filters.assignmentSearch),
      '" placeholder="Resi, perangkat, keluhan" class="mt-2 min-h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15"></label>',
      '<label class="text-xs font-bold text-neutral-600">Status',
      '<select name="assignmentStatus" class="mt-2 min-h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15">',
      option("ACTIVE", "Aktif", filters.assignmentStatus),
      option("ALL", "Semua assigned", filters.assignmentStatus),
      config.serviceStatuses
        .map(function (status) {
          return option(status.key, status.label, filters.assignmentStatus);
        })
        .join(""),
      "</select></label>",
      '<label class="text-xs font-bold text-neutral-600">Prioritas',
      '<select name="assignmentPriority" class="mt-2 min-h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15">',
      option("ALL", "Semua", filters.assignmentPriority),
      option("Normal", "Normal", filters.assignmentPriority),
      option("Tinggi", "Tinggi", filters.assignmentPriority),
      "</select></label>",
      '<div class="flex items-end gap-2">',
      components.button({ label: "Filter", type: "submit", variant: "primary", iconName: "search", className: "w-full" }),
      '<button type="button" class="inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-900 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500" data-action="reset-filter">Reset</button>',
      "</div></form>"
    ].join("");
  }

  function renderAssignments(state, technician) {
    const rows = getVisibleAssignments(state, technician.id);
    const cards = rows.length
      ? rows
          .map(function (service) {
            const closed = closedStatuses.includes(service.status);
            return [
              '<article class="rounded-2xl border border-neutral-200 bg-white p-5">',
              '<div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">',
              '<div><p class="text-xs font-bold text-primary-600">',
              html(service.receipt),
              '</p><h3 class="mt-2 text-lg font-black text-neutral-900">',
              html(getDeviceName(service)),
              '</h3><p class="mt-2 text-sm leading-6 text-neutral-600">',
              html(service.complaint),
              "</p></div>",
              '<div class="flex flex-wrap gap-2 md:justify-end">',
              components.statusBadge(service.status),
              '<span class="inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-bold text-neutral-700">',
              html(service.priority),
              "</span></div></div>",
              '<dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">',
              '<div><dt class="text-xs font-bold text-neutral-500">Pelanggan</dt><dd class="mt-1 font-semibold text-neutral-900">',
              html(getCustomerName(state, service.customerId)),
              "</dd></div>",
              '<div><dt class="text-xs font-bold text-neutral-500">Kerusakan</dt><dd class="mt-1 font-semibold text-neutral-900">',
              html(getDamageName(state, service.damageTypeId)),
              "</dd></div>",
              '<div><dt class="text-xs font-bold text-neutral-500">Estimasi</dt><dd class="mt-1 font-semibold text-neutral-900">',
              html(service.estimatedDoneAt ? components.formatDate(service.estimatedDoneAt) : "Belum tersedia"),
              "</dd></div>",
              '<div><dt class="text-xs font-bold text-neutral-500">Pembayaran</dt><dd class="mt-1 font-semibold text-neutral-900">',
              html(getPaymentStatus(state, service.id)),
              "</dd></div></dl>",
              '<div class="mt-4 flex flex-wrap gap-2">',
              actionButton("Detail", "detail-service", service.id),
              closed ? "" : actionButton("Update Pekerjaan", "update-service", service.id, "primary"),
              closed ? "" : actionButton("Catat Sparepart", "part-service", service.id),
              !closed && service.status !== "SIAP_DIAMBIL" ? actionButton("Tandai Siap Diambil", "mark-ready", service.id, "secondary") : "",
              '<a class="inline-flex min-h-10 items-center justify-center rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-900 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500" href="tracking.html?resi=',
              attr(encodeURIComponent(service.receipt)),
              '">Preview Tracking</a>',
              "</div></article>"
            ].join("");
          })
          .join("")
      : components.emptyState({
          title: "Tidak ada assignment cocok",
          message: "Ubah filter atau pilih teknisi demo lain.",
          iconName: "user"
        });

    return [
      '<section id="tugas" class="app-card scroll-mt-24 overflow-hidden" aria-labelledby="tugas-heading">',
      '<div class="border-b border-neutral-200 p-5 sm:p-6"><p class="text-sm font-semibold text-primary-600">Assignment</p>',
      '<h2 id="tugas-heading" class="mt-2 text-2xl font-black text-neutral-900">Tugas Aktif</h2>',
      '<p class="mt-2 text-sm leading-6 text-neutral-600">Daftar ini dibatasi pada service yang assigned ke teknisi aktif.</p></div>',
      renderFilterForm(state),
      '<div class="grid gap-4 p-5 sm:p-6">',
      cards,
      "</div>",
      '<div class="border-t border-neutral-200 px-5 py-4 text-xs text-neutral-500 sm:px-6">Menampilkan ',
      html(rows.length),
      " dari ",
      html(getAssignments(state, technician.id).length),
      " assignment.</div></section>"
    ].join("");
  }

  function renderWaitingParts(state, technician) {
    const assignments = getAssignments(state, technician.id).filter(function (service) {
      return service.status === "MENUNGGU_SPAREPART";
    });
    const stockRows = state.parts
      .map(function (part) {
        const tone = getStockTone(part);
        return [
          '<tr class="hover:bg-neutral-50"><td class="px-4 py-3 font-bold text-neutral-900">',
          html(part.sku),
          '<p class="mt-1 text-xs font-normal text-neutral-500">',
          html(part.name),
          '</p></td><td class="px-4 py-3 text-neutral-700">',
          html(part.sku),
          '</td><td class="px-4 py-3 font-bold tabular-nums text-neutral-900">',
          html(part.stock),
          '</td><td class="px-4 py-3"><span class="inline-flex rounded-full border px-3 py-1 text-xs font-bold ',
          html(tone.className),
          '">',
          html(tone.label),
          "</span></td></tr>"
        ].join("");
      })
      .join("");

    return [
      '<section id="sparepart" class="grid scroll-mt-24 gap-6 xl:grid-cols-[0.85fr_1.15fr]">',
      '<article class="app-card p-5 sm:p-6">',
      '<p class="text-sm font-semibold text-primary-600">Menunggu Sparepart</p>',
      '<h2 class="mt-2 text-2xl font-black text-neutral-900">Tiket tertahan komponen</h2>',
      '<div class="mt-5 space-y-3">',
      assignments.length
        ? assignments
            .map(function (service) {
              return [
                '<div class="rounded-2xl border border-amber-200 bg-amber-50 p-5">',
                '<p class="text-xs font-bold text-amber-700">',
                html(service.receipt),
                '</p><p class="mt-2 font-black text-neutral-900">',
                html(getDeviceName(service)),
                '</p><p class="mt-2 text-sm leading-6 text-neutral-700">',
                html(service.safeDiagnosis || service.complaint),
                '</p><div class="mt-3">',
                actionButton("Catat Sparepart", "part-service", service.id, "primary"),
                "</div></div>"
              ].join("");
            })
            .join("")
        : '<p class="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-sm text-neutral-600">Tidak ada assignment menunggu sparepart.</p>',
      "</div></article>",
      '<article class="app-card overflow-hidden">',
      '<div class="border-b border-neutral-200 p-5 sm:p-6"><p class="text-sm font-semibold text-primary-600">Stok Komponen</p><h2 class="mt-2 text-2xl font-black text-neutral-900">Sparepart tersedia</h2></div>',
      '<div class="p-5 sm:p-6"><div class="overflow-x-auto rounded-xl border border-neutral-200"><table class="min-w-[720px] w-full divide-y divide-neutral-200 text-sm">',
      '<thead class="bg-neutral-50 text-left text-xs font-bold text-neutral-600"><tr><th class="px-4 py-3">SKU/Nama</th><th class="px-4 py-3">Kompatibilitas</th><th class="px-4 py-3">Stok</th><th class="px-4 py-3">Status</th></tr></thead>',
      '<tbody class="divide-y divide-neutral-200 bg-white">',
      stockRows,
      "</tbody></table></div></div></article></section>"
    ].join("");
  }

  function renderHistory(state, technician) {
    const serviceIds = new Set(
      getAssignments(state, technician.id).map(function (service) {
        return service.id;
      })
    );
    const rows = state.timelines
      .filter(function (entry) {
        return serviceIds.has(entry.serviceId);
      })
      .sort(function (first, second) {
        return new Date(second.at) - new Date(first.at);
      });

    return [
      '<section id="riwayat" class="app-card scroll-mt-24 p-5 sm:p-6" aria-labelledby="riwayat-heading">',
      '<p class="text-sm font-semibold text-primary-600">Riwayat Update</p>',
      '<h2 id="riwayat-heading" class="mt-2 text-2xl font-black text-neutral-900">Timeline assignment</h2>',
      '<ol class="mt-5 space-y-3">',
      rows.length
        ? rows
            .slice(0, 10)
            .map(function (entry) {
              const service = state.serviceOrders.find(function (item) {
                return item.id === entry.serviceId;
              });
              return [
                '<li class="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">',
                '<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">',
                '<div><p class="text-sm font-bold text-neutral-900">',
                html(service ? service.receipt + " - " + getDeviceName(service) : entry.serviceId),
                '</p><p class="mt-1 text-sm leading-6 text-neutral-700">',
                html(entry.note),
                "</p></div>",
                '<div class="shrink-0">',
                components.statusBadge(entry.status),
                '<p class="mt-2 text-xs text-neutral-500">',
                html(components.formatDateTime(entry.at)),
                "</p></div></div></li>"
              ].join("");
            })
            .join("")
        : '<li class="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-sm text-neutral-600">Belum ada riwayat update.</li>',
      "</ol></section>"
    ].join("");
  }

  function renderProfile(state, technician) {
    const stats = getTechnicianStats(state, technician.id);
    const skillSummary = technician.skills.length ? technician.skills.join(", ") : "Belum diatur";
    const whatsapp = authSession.whatsapp ? displayPhone(authSession.whatsapp) : "Belum diatur";
    return [
      '<section id="profil" class="app-card min-w-0 scroll-mt-24 p-5 sm:p-6" aria-labelledby="profil-heading">',
      '<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div>',
      '<p class="text-sm font-semibold text-primary-600">Profil</p>',
      '<h2 id="profil-heading" class="mt-2 text-2xl font-black text-neutral-900">',
      html(technician.name),
      '</h2><p class="mt-2 text-sm leading-6 text-neutral-600">Kelola identitas akun dan informasi kerja teknisi.</p></div>',
      components.button({
        label: "Edit Profil",
        variant: "primary",
        iconName: "settings",
        attr: 'data-action="edit-profile"',
        className: "shrink-0"
      }),
      '</div><div class="mt-5 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-5">',
      '<article class="min-w-0 rounded-2xl border border-neutral-200 bg-neutral-50 p-5"><p class="text-xs font-bold text-neutral-500">Email</p><p class="mt-2 break-all text-sm font-bold text-neutral-900">',
      html(authSession.email),
      "</p></article>",
      '<article class="min-w-0 rounded-2xl border border-neutral-200 bg-neutral-50 p-5"><p class="text-xs font-bold text-neutral-500">WhatsApp</p><p class="mt-2 text-sm font-bold text-neutral-900">',
      html(whatsapp),
      "</p></article>",
      '<article class="min-w-0 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 md:col-span-2 xl:col-span-1"><p class="text-xs font-bold text-neutral-500">Keahlian</p><p class="mt-2 break-words text-sm font-bold leading-6 text-neutral-900">',
      html(skillSummary),
      "</p></article>",
      '<article class="rounded-2xl border border-neutral-200 bg-neutral-50 p-5"><p class="text-xs font-bold text-neutral-500">Ketersediaan</p><p class="mt-2 text-sm font-bold text-neutral-900">',
      html(technician.availability),
      "</p></article>",
      '<article class="rounded-2xl border border-neutral-200 bg-neutral-50 p-5"><p class="text-xs font-bold text-neutral-500">Assignment aktif</p><p class="mt-2 text-3xl font-black text-neutral-900">',
      html(stats.active),
      "</p></article>",
      "</div></section>"
    ].join("");
  }

  function renderApp() {
    const state = store.getState();
    const technician = getTechnician(state, activeTechnicianId);

    if (!technician) {
      components.initAppShell({
        role: "technician",
        active: "dashboard",
        title: "Dashboard Teknisi",
        subtitle: "Akun teknisi belum terhubung ke profil data",
        content: components.emptyState({
          title: "Profil teknisi tidak ditemukan",
          message: "Keluar lalu gunakan kembali salah satu akun teknisi demo.",
          iconName: "alert"
        })
      });
      return;
    }

    const content = [
      '<div class="space-y-6">',
      renderSessionIdentity(technician),
      renderKpis(state, technician),
      renderAssignments(state, technician),
      renderWaitingParts(state, technician),
      renderHistory(state, technician),
      renderProfile(state, technician),
      "</div>"
    ].join("");

    components.initAppShell({
      role: "technician",
      active: getActiveMenuId(),
      title: "Dashboard Teknisi",
      subtitle: technician.name + " - workflow assignment pribadi",
      content
    });
    syncActiveMenu();
  }

  function getActiveMenuId() {
    const hash = String(window.location.hash || "#dashboard");
    const match = config.menus.technician.find(function (item) {
      return item.href.endsWith(hash);
    });
    return match ? match.id : "dashboard";
  }

  function syncActiveMenu() {
    const activeId = getActiveMenuId();
    document.querySelectorAll("aside nav a").forEach(function (link) {
      const href = link.getAttribute("href") || "";
      const item = config.menus.technician.find(function (menuItem) {
        return menuItem.href === href;
      });
      const active = item && item.id === activeId;
      link.className =
        "flex min-h-12 items-center rounded-xl px-4 text-sm font-semibold transition " +
        (active ? "bg-primary-500 text-white" : "text-white/75 hover:bg-white/10 hover:text-white");
      if (active) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function bindEvents() {
    if (eventsBound) {
      return;
    }
    eventsBound = true;

    document.addEventListener("submit", function (event) {
      const form = event.target.closest("[data-assignment-filter]");
      if (!form) {
        return;
      }
      event.preventDefault();
      const data = new FormData(form);
      filters.assignmentSearch = data.get("assignmentSearch") || "";
      filters.assignmentStatus = data.get("assignmentStatus") || "ACTIVE";
      filters.assignmentPriority = data.get("assignmentPriority") || "ALL";
      renderApp();
    });
    document.addEventListener("click", handleClick);
  }

  function handleClick(event) {
    const action = event.target.closest("[data-action]");
    if (!action) {
      return;
    }
    const actionName = action.getAttribute("data-action");
    const id = action.getAttribute("data-id") || "";
    if (actionName === "reset-filter") {
      filters.assignmentSearch = "";
      filters.assignmentStatus = "ACTIVE";
      filters.assignmentPriority = "ALL";
      renderApp();
    }
    if (actionName === "detail-service") {
      openServiceDetail(id);
    }
    if (actionName === "update-service") {
      openUpdateForm(id);
    }
    if (actionName === "part-service") {
      openPartForm(id);
    }
    if (actionName === "mark-ready") {
      markReady(id);
    }
    if (actionName === "edit-profile") {
      openProfileForm();
    }
  }

  function openProfileForm() {
    const technician = getTechnician(store.getState(), activeTechnicianId);
    if (!technician) {
      showError("Profil teknisi tidak ditemukan.");
      return;
    }

    openModal({
      title: "Edit Profil",
      description: "Perubahan disimpan ke akun login dan profil teknisi yang terhubung.",
      body: [
        '<div class="grid gap-4 md:grid-cols-2">',
        inputField("Nama lengkap", "name", authSession.name || technician.name, {
          required: true,
          helper: "Nama ini juga tampil pada assignment teknisi."
        }),
        inputField("Email", "email", authSession.email, {
          type: "email",
          required: true
        }),
        inputField("WhatsApp", "whatsapp", displayPhone(authSession.whatsapp), {
          type: "tel",
          placeholder: "08xxxxxxxxxx",
          helper: "Boleh dikosongkan."
        }),
        selectField(
          "Ketersediaan",
          "availability",
          option("Available", "Available", technician.availability) +
            option("Busy", "Busy", technician.availability) +
            option("Off", "Off", technician.availability),
          { required: true }
        ),
        '</div><div class="mt-4">',
        textareaField("Keahlian", "skills", technician.skills.join(", "), {
          rows: 3,
          helper: "Pisahkan setiap keahlian dengan koma atau baris baru."
        }),
        "</div>"
      ].join(""),
      confirmText: "Simpan Profil",
      onSubmit: async function (data, form) {
        const name = String(data.get("name") || "").trim();
        const email = String(data.get("email") || "").trim().toLowerCase();
        const whatsapp = String(data.get("whatsapp") || "").trim();
        const availability = String(data.get("availability") || "");
        const skills = parseSkills(data.get("skills"));

        if (name.length < 3 || name.length > 100) {
          setFormError(form, "Nama harus terdiri dari 3 sampai 100 karakter.");
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setFormError(form, "Masukkan alamat email yang valid.");
          return false;
        }
        const whatsappDigits = whatsapp.replace(/\D/g, "");
        const validWhatsapp =
          !whatsapp ||
          /^0\d{9,14}$/.test(whatsappDigits) ||
          /^62\d{8,13}$/.test(whatsappDigits);
        if (!validWhatsapp) {
          setFormError(form, "Masukkan nomor WhatsApp Indonesia yang valid atau kosongkan.");
          return false;
        }
        if (!["Available", "Busy", "Off"].includes(availability)) {
          setFormError(form, "Pilih ketersediaan yang valid.");
          return false;
        }
        if (skills.length > 20 || skills.some(function (skill) { return skill.length > 100; })) {
          setFormError(form, "Keahlian maksimal 20 item dan 100 karakter per item.");
          return false;
        }

        await store.updateMyProfile({
          name,
          email,
          whatsapp,
          availability,
          skills
        });
        authSession = auth.getSession();
        renderApp();
        showSuccess("Profil berhasil diperbarui melalui API.");
        return true;
      }
    });
  }

  function getAssignedServiceOrFail(state, serviceId) {
    const service = state.serviceOrders.find(function (item) {
      return item.id === serviceId;
    });
    if (!service || service.technicianId !== activeTechnicianId) {
      return null;
    }

    return service;
  }

  function openServiceDetail(serviceId) {
    const state = store.getState();
    const service = getAssignedServiceOrFail(state, serviceId);
    if (!service) {
      showError("Tiket tidak termasuk assignment teknisi aktif.");
      return;
    }
    const customer = getCustomer(state, service.customerId);
    const timeline = state.timelines
      .filter(function (entry) {
        return entry.serviceId === service.id;
      })
      .sort(function (first, second) {
        return new Date(first.at) - new Date(second.at);
      });
    openModal({
      title: "Detail " + service.receipt,
      description: getDeviceName(service) + " - " + getStatusLabel(service.status),
      confirmText: "Tutup",
      cancelText: "Kembali",
      body: [
        '<div class="grid gap-4 md:grid-cols-2">',
        '<article class="rounded-2xl border border-neutral-200 p-4"><p class="text-xs font-bold text-neutral-500">Pelanggan</p><p class="mt-2 font-bold text-neutral-900">',
        html(customer ? customer.name : "-"),
        '</p><p class="mt-1 text-sm text-neutral-600">',
        html(service.device.color || "-"),
        " - IMEI ",
        html(service.device.imei || "tidak diisi"),
        "</p></article>",
        '<article class="rounded-2xl border border-neutral-200 p-4"><p class="text-xs font-bold text-neutral-500">Kerusakan</p><p class="mt-2 font-bold text-neutral-900">',
        html(getDamageName(state, service.damageTypeId)),
        '</p><p class="mt-1 text-sm text-neutral-600">',
        html(components.formatRupiah(service.estimatedCost || service.finalCost || 0)),
        " - ",
        html(getPaymentStatus(state, service.id)),
        "</p></article>",
        "</div>",
        '<article class="mt-4 rounded-2xl border border-neutral-200 p-4"><p class="text-xs font-bold text-neutral-500">Keluhan dan diagnosis</p><p class="mt-2 text-sm leading-6 text-neutral-700">',
        html(service.complaint),
        '</p><p class="mt-3 text-sm leading-6 text-neutral-700">',
        html(service.safeDiagnosis || "-"),
        "</p></article>",
        '<article class="mt-4 rounded-2xl border border-neutral-200 p-4"><p class="text-xs font-bold text-neutral-500">Timeline</p><ol class="mt-3 space-y-2">',
        timeline
          .map(function (entry) {
            return [
              '<li class="rounded-xl bg-neutral-50 p-3 text-sm"><span class="font-bold">',
              html(getStatusLabel(entry.status)),
              "</span> - ",
              html(entry.actor),
              '<span class="block text-xs text-neutral-500">',
              html(components.formatDateTime(entry.at)),
              '</span><span class="text-neutral-700">',
              html(entry.note),
              "</span></li>"
            ].join("");
          })
          .join(""),
        "</ol></article>"
      ].join(""),
      onSubmit: function () {
        return true;
      }
    });
  }

  function openUpdateForm(serviceId) {
    const state = store.getState();
    const service = getAssignedServiceOrFail(state, serviceId);
    if (!service || closedStatuses.includes(service.status)) {
      showError("Tiket tidak dapat diupdate oleh teknisi aktif.");
      return;
    }
    const body = [
      '<div class="grid gap-4 md:grid-cols-2">',
      selectField("Status", "status", statusOptions(service.status), { required: true }),
      inputField("Estimasi selesai", "estimatedDoneAt", service.estimatedDoneAt ? toDateKey(service.estimatedDoneAt) : "", { type: "date" }),
      inputField("Biaya rekomendasi", "estimatedCost", service.estimatedCost || service.finalCost || "", { type: "number", min: "0", helper: "Rupiah tanpa desimal." }),
      selectField("Sparepart opsional", "partId", partOptions(state), { helper: "Kosongkan bila belum memakai sparepart." }),
      inputField("Jumlah sparepart", "qty", "1", { type: "number", min: "1" }),
      "</div>",
      '<div class="mt-4 grid gap-4 md:grid-cols-2">',
      textareaField("Catatan diagnosis", "diagnosis", service.safeDiagnosis || "", { rows: 4 }),
      textareaField("Catatan tindakan", "actionNote", "", { rows: 4, helper: "Wajib bila status tidak berubah." }),
      "</div>"
    ].join("");

    openModal({
      title: "Update Pekerjaan",
      description: service.receipt + " - " + getDeviceName(service),
      body,
      confirmText: "Simpan Update",
      onSubmit: function (data, form, close) {
        return submitWorkUpdate(serviceId, data, form, close);
      }
    });
  }

  function openPartForm(serviceId) {
    const state = store.getState();
    const service = getAssignedServiceOrFail(state, serviceId);
    if (!service || closedStatuses.includes(service.status)) {
      showError("Tiket tidak dapat menerima catatan sparepart.");
      return;
    }

    openModal({
      title: "Catat Sparepart",
      description: service.receipt + " - " + getDeviceName(service),
      body: [
        '<div class="grid gap-4 md:grid-cols-2">',
        selectField("Sparepart", "partId", partOptions(state).replace('value="" selected', 'value=""'), { required: true }),
        inputField("Jumlah", "qty", "1", { type: "number", min: "1", required: true }),
        "</div>",
        '<div class="mt-4">',
        textareaField("Catatan tindakan", "actionNote", "", { rows: 3, required: true }),
        "</div>"
      ].join(""),
      confirmText: "Catat Sparepart",
      onSubmit: async function (data, form) {
        const result = await usePart(serviceId, data.get("partId"), data.get("qty"), data.get("actionNote"), form);
        if (result) {
          showSuccess("Pemakaian sparepart dicatat melalui API.");
        }
        return result;
      }
    });
  }

  async function submitWorkUpdate(serviceId, data, form, close) {
    const state = store.getState();
    const service = getAssignedServiceOrFail(state, serviceId);
    if (!service) {
      setFormError(form, "Tiket tidak termasuk assignment teknisi aktif.");
      return false;
    }
    const nextStatus = String(data.get("status") || service.status);
    const diagnosis = String(data.get("diagnosis") || "").trim();
    const actionNote = String(data.get("actionNote") || "").trim();
    const partId = String(data.get("partId") || "");
    const qty = toPositiveInt(data.get("qty"));
    const estimatedCost = data.get("estimatedCost") ? toNumber(data.get("estimatedCost")) : null;
    const estimatedDoneAt = data.get("estimatedDoneAt") ? data.get("estimatedDoneAt") + "T17:00:00" : null;

    if (!editableStatuses.includes(nextStatus)) {
      setFormError(form, "Status teknisi tidak valid.");
      return false;
    }
    if (nextStatus === service.status && !diagnosis && !actionNote && !partId && !estimatedDoneAt && estimatedCost === null) {
      setFormError(form, "Isi minimal satu catatan, status, estimasi, biaya, atau sparepart.");
      return false;
    }
    if (partId && qty < 1) {
      setFormError(form, "Jumlah sparepart wajib lebih dari nol.");
      return false;
    }
    if (partId) {
      const part = getPart(state, partId);
      if (!part || part.stock < qty) {
        setFormError(form, "Stok sparepart tidak cukup. Stok tersedia: " + (part ? part.stock : 0) + ".");
        return false;
      }
    }

    if (!isNormalTransition(service.status, nextStatus)) {
      setFormError(form, "Perubahan status tidak mengikuti alur canonical API.");
      return false;
    }

    await store.updateWork(serviceId, {
      nextStatus,
      diagnosis,
      actionNote,
      estimatedCost,
      estimatedDoneAt,
      partId,
      qty
    });
    showSuccess("Update pekerjaan tersimpan melalui API.");
    close();
    return false;
  }

  async function usePart(serviceId, partId, qtyValue, noteValue, form) {
    const state = store.getState();
    const service = getAssignedServiceOrFail(state, serviceId);
    const qty = toPositiveInt(qtyValue);
    const note = String(noteValue || "").trim();
    const part = getPart(state, partId);
    if (!service) {
      setFormError(form, "Tiket tidak termasuk assignment teknisi aktif.");
      return false;
    }
    if (!partId || !part || qty < 1 || !note) {
      setFormError(form, "Sparepart, jumlah, dan catatan tindakan wajib valid.");
      return false;
    }
    if (part.stock < qty) {
      setFormError(form, "Stok sparepart tidak cukup. Stok tersedia: " + part.stock + ".");
      return false;
    }

    await store.recordPartUsage(serviceId, partId, qty, "Tindakan: " + note);
    return true;
  }

  function markReady(serviceId) {
    const state = store.getState();
    const service = getAssignedServiceOrFail(state, serviceId);
    if (!service || closedStatuses.includes(service.status) || service.status === "SIAP_DIAMBIL") {
      showError("Tiket tidak dapat ditandai siap diambil.");
      return;
    }

    if (!isNormalTransition(service.status, "SIAP_DIAMBIL")) {
      showError("Status harus berada pada Pengerjaan sebelum ditandai Siap Diambil.");
      return;
    }

    store
      .updateStatus(
        serviceId,
        "SIAP_DIAMBIL",
        "Teknisi menandai service siap diambil. Status sebelumnya: " + getStatusLabel(service.status) + "."
      )
      .then(function () {
        showSuccess("Service ditandai siap diambil melalui API.");
      })
      .catch(function (error) {
        showError(error.message || "Status service gagal diperbarui.");
      });
  }

  components.onReady(async function () {
    const mount = document.getElementById("app");
    if (mount) {
      mount.innerHTML = components.loadingState({
        title: "Memuat tugas teknisi",
        message: "Mengambil assignment dan stok terbaru dari API.",
        label: "Memuat data API"
      });
    }
    bindEvents();
    window.addEventListener("hashchange", syncActiveMenu);
    try {
      const session = await auth.validateSession("technician");
      activeTechnicianId = session.technicianId || authSession.technicianId;
      await store.hydrate();
      renderApp();
      if (!unsubscribe) {
        unsubscribe = store.subscribe(renderApp);
      }
    } catch (error) {
      if (mount && mount.isConnected) {
        mount.innerHTML = components.emptyState({
          title: "Dashboard teknisi tidak dapat dimuat",
          message: error.message || "Periksa koneksi backend dan sesi login.",
          iconName: "alert",
          actionHtml:
            '<button type="button" class="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary-500 px-4 text-sm font-bold text-white" onclick="window.location.reload()">Coba Lagi</button>'
        });
      }
    }
  });
})();
