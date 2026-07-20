(function () {
  "use strict";

  const components = window.PMD_COMPONENTS;
  const config = window.PMD_CONFIG;
  const store = window.PMD_STORE;
  const auth = window.PMD_AUTH;

  if (!auth || !auth.requireAdmin()) {
    return;
  }

  const filters = {
    serviceSearch: "",
    serviceStatus: "ALL",
    serviceTechnician: "ALL",
    serviceFrom: "",
    serviceTo: "",
    customerSearch: "",
    deviceSearch: "",
    damageSearch: "",
    damageActive: "ALL",
    technicianSearch: "",
    technicianAvailability: "ALL",
    partSearch: "",
    partStock: "ALL",
    paymentSearch: "",
    paymentStatus: "ALL",
    reportPreset: "monthly",
    reportFrom: "",
    reportTo: ""
  };

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

  function getDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function getDashboardDate(services) {
    return services
      .map(function (service) {
        return toDateKey(service.receivedAt);
      })
      .filter(Boolean)
      .sort()
      .pop();
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

  function getPaymentTotal(payment) {
    if (!payment) {
      return 0;
    }

    return toNumber(payment.serviceFee) + toNumber(payment.partsFee) - toNumber(payment.discount);
  }

  function toNumber(value) {
    const number = Number(String(value == null ? "" : value).replace(/[^\d.-]/g, ""));
    return Number.isFinite(number) ? number : 0;
  }

  function toPositiveInt(value) {
    const number = parseInt(value, 10);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function getCustomer(state, id) {
    return state.customers.find(function (customer) {
      return customer.id === id;
    });
  }

  function getTechnician(state, id) {
    return state.technicians.find(function (technician) {
      return technician.id === id;
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

  function getPaymentForService(state, serviceId) {
    return state.payments.find(function (payment) {
      return payment.serviceId === serviceId;
    });
  }

  function getCustomerName(state, customerId) {
    const customer = getCustomer(state, customerId);
    return customer ? customer.name : "-";
  }

  function getTechnicianName(state, technicianId) {
    if (!technicianId) {
      return "Belum assigned";
    }

    const technician = getTechnician(state, technicianId);
    return technician ? technician.name : "-";
  }

  function getDeviceName(service) {
    return [service.device.brand, service.device.model].filter(Boolean).join(" ");
  }

  function getStatusLabel(status) {
    const meta = config.serviceStatuses.find(function (item) {
      return item.key === status;
    });

    return meta ? meta.label : status;
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

  function getDashboardMetrics(state) {
    const services = state.serviceOrders;
    const dashboardDate = getDashboardDate(services);
    const counts = services.reduce(function (acc, service) {
      acc[service.status] = (acc[service.status] || 0) + 1;
      return acc;
    }, {});
    const completedServiceIds = new Set(
      services
        .filter(function (service) {
          return ["SELESAI", "DIAMBIL"].includes(service.status);
        })
        .map(function (service) {
          return service.id;
        })
    );
    const revenue = state.payments
      .filter(function (payment) {
        return payment.status === "Lunas" && completedServiceIds.has(payment.serviceId);
      })
      .reduce(function (sum, payment) {
        return sum + getPaymentTotal(payment);
      }, 0);
    const durations = services
      .map(function (service) {
        const completion = getCompletionDate(service);
        return completion ? daysBetween(service.receivedAt, completion) : null;
      })
      .filter(function (duration) {
        return typeof duration === "number";
      });
    const averageDuration = durations.length
      ? durations.reduce(function (sum, duration) {
          return sum + duration;
        }, 0) / durations.length
      : 0;

    return {
      dashboardDate,
      receivedToday: services.filter(function (service) {
        return toDateKey(service.receivedAt) === dashboardDate;
      }).length,
      inProgress: counts.PENGERJAAN || 0,
      waitingParts: counts.MENUNGGU_SPAREPART || 0,
      readyPickup: counts.SIAP_DIAMBIL || 0,
      revenue,
      averageDuration,
      lowStockCount: state.parts.filter(function (part) {
        return part.stock <= part.minStock;
      }).length,
      counts
    };
  }

  function getPartUsageEntries(state) {
    return state.serviceOrders.flatMap(function (service) {
      return (service.partUsages || []).map(function (usage) {
        const part = getPart(state, usage.partId);
        return {
          service,
          part,
          qty: usage.qty
        };
      });
    });
  }

  function getPartUsageSummary(state, service) {
    const usages = service.partUsages || [];
    if (!usages.length) {
      return "Belum ada";
    }

    return usages
      .map(function (usage) {
        const part = getPart(state, usage.partId);
        return (part ? part.sku : usage.partId) + " x" + usage.qty;
      })
      .join(", ");
  }

  function getTechnicianStats(state, technicianId) {
    const assigned = state.serviceOrders.filter(function (service) {
      return service.technicianId === technicianId;
    });
    const completed = assigned.filter(function (service) {
      return ["SELESAI", "DIAMBIL"].includes(service.status);
    });
    const active = assigned.filter(function (service) {
      return !["SELESAI", "DIAMBIL"].includes(service.status);
    });
    const durations = assigned
      .map(function (service) {
        const completion = getCompletionDate(service);
        return completion ? daysBetween(service.receivedAt, completion) : null;
      })
      .filter(function (duration) {
        return typeof duration === "number";
      });

    return {
      active: active.length,
      completed: completed.length,
      averageDuration: durations.length
        ? durations.reduce(function (sum, duration) {
            return sum + duration;
          }, 0) / durations.length
        : 0
    };
  }

  function matchesText(text, query) {
    return normalize(text).includes(normalize(query));
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

  function statusOptions(selected, includeAll) {
    const base = includeAll ? option("ALL", "Semua status", selected) : "";
    return (
      base +
      config.serviceStatuses
        .map(function (status) {
          return option(status.key, status.label, selected);
        })
        .join("")
    );
  }

  function workflowStatusOptions(currentStatus) {
    const transitions = {
      DITERIMA: ["DITERIMA", "DIAGNOSA"],
      DIAGNOSA: ["DIAGNOSA", "MENUNGGU_SPAREPART", "PENGERJAAN"],
      MENUNGGU_SPAREPART: ["MENUNGGU_SPAREPART", "PENGERJAAN"],
      PENGERJAAN: ["PENGERJAAN", "SIAP_DIAMBIL"],
      SIAP_DIAMBIL: ["SIAP_DIAMBIL", "SELESAI"],
      SELESAI: ["SELESAI", "DIAMBIL"],
      DIAMBIL: ["DIAMBIL"]
    };
    const statuses = currentStatus ? transitions[currentStatus] || [currentStatus] : ["DITERIMA"];
    return statuses
      .map(function (status) {
        return option(status, getStatusLabel(status), currentStatus || "DITERIMA");
      })
      .join("");
  }

  function technicianOptions(state, selected, includeAll, includeBlank) {
    return [
      includeAll ? option("ALL", "Semua teknisi", selected) : "",
      includeBlank ? option("", "Belum assigned", selected) : "",
      state.technicians
        .map(function (technician) {
          return option(technician.id, technician.name, selected);
        })
        .join("")
    ].join("");
  }

  function customerOptions(state, selected) {
    return (
      option("", "Pilih pelanggan", selected) +
      state.customers
        .map(function (customer) {
          return option(customer.id, customer.name + " - " + customer.whatsapp, selected);
        })
        .join("")
    );
  }

  function damageOptions(state, selected) {
    return (
      option("", "Pilih jenis kerusakan", selected) +
      state.damageTypes
        .filter(function (damage) {
          return damage.active || damage.id === selected;
        })
        .map(function (damage) {
          return option(damage.id, damage.name, selected);
        })
        .join("")
    );
  }

  function partOptions(state, selected) {
    return (
      option("", "Pilih sparepart", selected) +
      state.parts
        .map(function (part) {
          return option(part.id, part.sku + " - " + part.name + " (stok " + part.stock + ")", selected);
        })
        .join("")
    );
  }

  function serviceOptions(state, selected) {
    return (
      option("", "Pilih service", selected) +
      state.serviceOrders
        .map(function (service) {
          return option(service.id, service.receipt + " - " + getDeviceName(service), selected);
        })
        .join("")
    );
  }

  function inputField(label, name, value, settings) {
    const options = Object.assign(
      {
        type: "text",
        required: false,
        min: "",
        placeholder: "",
        helper: "",
        step: "",
        className: ""
      },
      settings || {}
    );

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
      options.step !== "" ? ' step="' + attr(options.step) + '"' : "",
      options.placeholder ? ' placeholder="' + attr(options.placeholder) + '"' : "",
      ' class="mt-2 min-h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15 ',
      attr(options.className),
      '">',
      options.helper ? '<span class="mt-1 block text-xs leading-5 text-neutral-500">' + html(options.helper) + "</span>" : "",
      "</label>"
    ].join("");
  }

  function textareaField(label, name, value, settings) {
    const options = Object.assign({ required: false, rows: 3, helper: "" }, settings || {});
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
      ' class="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none transition placeholder:text-neutral-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15">',
      html(value || ""),
      "</textarea>",
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

  function checkboxField(label, name, checked, helper) {
    return [
      '<label class="flex items-start gap-3 rounded-xl border border-neutral-200 p-3 text-sm font-semibold text-neutral-700">',
      '<input name="',
      attr(name),
      '" type="checkbox" value="1" class="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"',
      checked ? " checked" : "",
      ">",
      '<span>',
      html(label),
      helper ? '<span class="block pt-1 text-xs font-normal leading-5 text-neutral-500">' + html(helper) + "</span>" : "",
      "</span></label>"
    ].join("");
  }

  function actionButton(label, action, id, variant) {
    const classes = {
      primary: "bg-primary-500 text-white hover:bg-primary-600 focus-visible:outline-primary-500",
      secondary: "border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 focus-visible:outline-primary-500",
      ghost: "text-neutral-700 hover:bg-neutral-100 focus-visible:outline-primary-500",
      danger: "bg-danger-500 text-white hover:bg-red-600 focus-visible:outline-danger-500"
    };

    return [
      '<button type="button" class="inline-flex min-h-10 items-center justify-center rounded-xl px-3 py-2 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ',
      classes[variant || "secondary"],
      '" data-action="',
      attr(action),
      '"',
      id ? ' data-id="' + attr(id) + '"' : "",
      ">",
      html(label),
      "</button>"
    ].join("");
  }

  function iconAction(label, action, id, iconName, variant) {
    const classes = variant === "danger" ? "text-danger-500 hover:bg-red-50" : "text-neutral-700 hover:bg-neutral-100";
    return [
      '<button type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-xl transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 ',
      classes,
      '" aria-label="',
      attr(label),
      '" title="',
      attr(label),
      '" data-action="',
      attr(action),
      '"',
      id ? ' data-id="' + attr(id) + '"' : "",
      ">",
      components.icon(iconName || "layout", "h-4 w-4"),
      "</button>"
    ].join("");
  }

  function filterInput(name, label, value, placeholder, type) {
    return [
      '<label class="text-xs font-bold text-neutral-600">',
      html(label),
      '<input name="',
      attr(name),
      '" type="',
      attr(type || "search"),
      '" value="',
      attr(value),
      '" placeholder="',
      attr(placeholder || ""),
      '" class="mt-2 min-h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15">',
      "</label>"
    ].join("");
  }

  function filterSelect(name, label, optionsHtml) {
    return [
      '<label class="text-xs font-bold text-neutral-600">',
      html(label),
      '<select name="',
      attr(name),
      '" class="mt-2 min-h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15">',
      optionsHtml,
      "</select></label>"
    ].join("");
  }

  function tableWrap(headers, rows) {
    return [
      '<div class="admin-table-shell">',
      '<table class="admin-responsive-table w-full divide-y divide-neutral-200 text-sm">',
      '<thead class="bg-neutral-50 text-left text-xs font-bold text-neutral-600"><tr>',
      headers
        .map(function (header) {
          return '<th scope="col">' + html(header) + "</th>";
        })
        .join(""),
      "</tr></thead>",
      '<tbody class="divide-y divide-neutral-200 bg-white">',
      rows.join(""),
      "</tbody></table></div>"
    ].join("");
  }

  function enhanceAdminTables() {
    document.querySelectorAll(".admin-responsive-table").forEach(function (table) {
      const labels = Array.from(table.querySelectorAll("thead th")).map(function (header) {
        return String(header.textContent || "").trim();
      });

      table.querySelectorAll("tbody tr").forEach(function (row) {
        const cells = Array.from(row.children).filter(function (cell) {
          return cell.tagName === "TD";
        });

        if (cells.length === 1 && cells[0].colSpan > 1) {
          cells[0].classList.add("admin-table-empty");
          return;
        }

        cells.forEach(function (cell, index) {
          cell.setAttribute("data-label", labels[index] || "Data");
        });
      });
    });
  }

  function emptyRow(colspan, message) {
    return [
      '<tr><td colspan="',
      attr(colspan),
      '" class="px-4 py-10 text-center text-sm text-neutral-500">',
      html(message),
      "</td></tr>"
    ].join("");
  }

  function moduleFooter(count, total) {
    return [
      '<div class="flex flex-col gap-2 border-t border-neutral-200 px-5 py-4 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">',
      '<span>Menampilkan ',
      html(count),
      " dari ",
      html(total),
      " data.</span>",
      '<span>Halaman 1 dari 1</span>',
      "</div>"
    ].join("");
  }

  function renderModuleShell(options) {
    return [
      '<section id="',
      attr(options.id),
      '" class="app-card scroll-mt-24 overflow-hidden" aria-labelledby="',
      attr(options.id),
      '-heading">',
      '<div class="flex flex-col gap-4 border-b border-neutral-200 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">',
      '<div><p class="text-sm font-semibold text-primary-600">',
      html(options.eyebrow),
      '</p><h2 id="',
      attr(options.id),
      '-heading" class="mt-2 text-2xl font-black text-neutral-900">',
      html(options.title),
      '</h2><p class="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">',
      html(options.description),
      "</p></div>",
      options.actionHtml || "",
      "</div>",
      options.body,
      "</section>"
    ].join("");
  }

  function renderFilterForm(module, controls) {
    return [
      '<form class="grid gap-3 border-b border-neutral-200 bg-white p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-4" data-filter-form="',
      attr(module),
      '">',
      controls.join(""),
      '<div class="flex items-end gap-2">',
      components.button({
        label: "Filter",
        type: "submit",
        variant: "primary",
        iconName: "search",
        className: "w-full"
      }),
      '<button type="button" class="inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-900 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500" data-clear-filters="',
      attr(module),
      '">Reset</button>',
      "</div>",
      "</form>"
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
    overlay.setAttribute("data-admin-modal", "");
    overlay.innerHTML = [
      '<section role="dialog" aria-modal="true" aria-labelledby="admin-modal-title" aria-describedby="admin-modal-desc" class="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-soft">',
      '<form data-admin-modal-form>',
      '<div class="flex items-start justify-between gap-4 border-b border-neutral-200 p-5 sm:p-6">',
      '<div><h2 id="admin-modal-title" class="text-lg font-black text-neutral-900">',
      html(settings.title),
      '</h2><p id="admin-modal-desc" class="mt-2 text-sm leading-6 text-neutral-600">',
      html(settings.description),
      "</p></div>",
      '<button type="button" class="rounded-xl p-2 text-neutral-600 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500" aria-label="Tutup dialog" data-modal-close>',
      components.icon("close", "h-5 w-5"),
      "</button></div>",
      '<div class="p-5 sm:p-6">',
      '<p class="mb-4 hidden rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert" data-form-error></p>',
      settings.body,
      "</div>",
      '<div class="flex flex-col-reverse gap-3 border-t border-neutral-200 p-5 sm:flex-row sm:justify-end sm:p-6">',
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
    overlay.querySelector("[data-admin-modal-form]").addEventListener("submit", async function (event) {
      event.preventDefault();
      const form = event.target;
      const submitButton = form.querySelector('[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
      }
      try {
        const result =
          typeof settings.onSubmit === "function"
            ? await settings.onSubmit(new FormData(form), form)
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

  function openInfoModal(title, description, body) {
    openModal({
      title,
      description,
      body,
      confirmText: "Tutup",
      cancelText: "Kembali",
      onSubmit: function () {
        return true;
      }
    });
  }

  function setFormError(form, message) {
    const error = form.querySelector("[data-form-error]");
    if (!error) {
      return;
    }

    error.textContent = message;
    error.classList.remove("hidden");
    error.focus();
  }

  function showSuccess(message) {
    components.toast(message, { type: "success" });
  }

  function showError(message) {
    components.toast(message, { type: "error" });
  }

  function renderKpiCard(options) {
    return [
      '<article class="app-card p-5 sm:p-6">',
      '<div class="flex items-start justify-between gap-4">',
      '<div><p class="text-sm font-semibold text-neutral-600">',
      html(options.label),
      '</p><p class="mt-3 text-3xl font-black tabular-nums text-neutral-900">',
      html(options.value),
      '</p></div><div class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ',
      html(options.iconClass),
      '">',
      components.icon(options.iconName, "h-5 w-5"),
      "</div></div>",
      '<p class="mt-3 text-xs leading-5 text-neutral-500">',
      html(options.note),
      "</p>",
      "</article>"
    ].join("");
  }

  function renderKpiGrid(state, metrics) {
    return [
      '<section id="dashboard-kpi" class="scroll-mt-24">',
      '<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">',
      renderKpiCard({
        label: "Service masuk hari ini",
        value: String(metrics.receivedToday),
        note: metrics.dashboardDate ? components.formatDate(metrics.dashboardDate) : "Tanggal demo belum tersedia",
        iconName: "phone",
        iconClass: "bg-primary-500/10 text-primary-600"
      }),
      renderKpiCard({
        label: "Sedang dikerjakan",
        value: String(metrics.inProgress),
        note: "Status Pengerjaan",
        iconName: "layout",
        iconClass: "bg-indigo-50 text-indigo-600"
      }),
      renderKpiCard({
        label: "Menunggu sparepart",
        value: String(metrics.waitingParts),
        note: "Perlu pantau stok komponen",
        iconName: "alert",
        iconClass: "bg-amber-50 text-amber-600"
      }),
      renderKpiCard({
        label: "Siap diambil",
        value: String(metrics.readyPickup),
        note: "Perlu follow-up pelanggan",
        iconName: "check",
        iconClass: "bg-emerald-50 text-emerald-600"
      }),
      renderKpiCard({
        label: "Pendapatan selesai",
        value: components.formatRupiah(metrics.revenue),
        note: "Hanya service selesai/diambil",
        iconName: "check",
        iconClass: "bg-green-50 text-green-600"
      }),
      renderKpiCard({
        label: "Rata-rata durasi",
        value: metrics.averageDuration.toFixed(1) + " hari",
        note: "Dari diterima sampai siap/selesai",
        iconName: "layout",
        iconClass: "bg-cyan-50 text-cyan-600"
      }),
      renderKpiCard({
        label: "Stok menipis",
        value: String(metrics.lowStockCount),
        note: "Stok di bawah atau sama minimum",
        iconName: "alert",
        iconClass: "bg-orange-50 text-accent-500"
      }),
      renderKpiCard({
        label: "Total tiket demo",
        value: String(state.serviceOrders.length),
        note: "Sumber: data lokal browser",
        iconName: "search",
        iconClass: "bg-slate-100 text-slate-700"
      }),
      "</div>",
      "</section>"
    ].join("");
  }

  function getActionItems(state, metrics) {
    const dashboardEnd = metrics.dashboardDate ? metrics.dashboardDate + "T23:59:59" : "";
    const activeStatuses = ["DITERIMA", "DIAGNOSA", "MENUNGGU_SPAREPART", "PENGERJAAN"];
    const delayed = state.serviceOrders.filter(function (service) {
      const age = daysBetween(service.receivedAt, dashboardEnd);
      return activeStatuses.includes(service.status) && age !== null && age >= 3;
    });
    const waiting = state.serviceOrders.filter(function (service) {
      return service.status === "MENUNGGU_SPAREPART";
    });
    const ready = state.serviceOrders.filter(function (service) {
      return service.status === "SIAP_DIAMBIL";
    });
    const unpaid = state.serviceOrders.filter(function (service) {
      const payment = getPaymentForService(state, service.id);
      return !payment || payment.status !== "Lunas";
    });
    const lowParts = state.parts.filter(function (part) {
      return part.stock <= part.minStock;
    });
    const unassigned = state.serviceOrders.filter(function (service) {
      return !service.technicianId;
    });

    return [
      {
        id: "action-delayed",
        title: "Service terlalu lama",
        count: delayed.length,
        tone: "border-amber-200 bg-amber-50 text-amber-800",
        detail: delayed.map(function (service) {
          return service.receipt + " - " + getDeviceName(service);
        })
      },
      {
        id: "action-waiting-parts",
        title: "Menunggu sparepart",
        count: waiting.length,
        tone: "border-orange-200 bg-orange-50 text-orange-800",
        detail: waiting.map(function (service) {
          return service.receipt + " - " + getDeviceName(service);
        })
      },
      {
        id: "action-unpaid",
        title: "Pembayaran belum lunas",
        count: unpaid.length,
        tone: "border-cyan-200 bg-cyan-50 text-cyan-800",
        detail: unpaid.slice(0, 4).map(function (service) {
          const payment = getPaymentForService(state, service.id);
          return service.receipt + " - " + (payment ? payment.status : "Belum dibayar");
        })
      },
      {
        id: "action-pickup",
        title: "Siap diambil",
        count: ready.length,
        tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
        detail: ready.map(function (service) {
          return service.receipt + " - " + getCustomerName(state, service.customerId);
        })
      },
      {
        id: "action-stock",
        title: "Stok menipis/habis",
        count: lowParts.length,
        tone: "border-red-200 bg-red-50 text-red-800",
        detail: lowParts.slice(0, 4).map(function (part) {
          return part.sku + " - stok " + part.stock;
        })
      },
      {
        id: "action-unassigned",
        title: "Belum assigned",
        count: unassigned.length,
        tone: "border-slate-200 bg-slate-50 text-slate-800",
        detail: unassigned.map(function (service) {
          return service.receipt + " - " + getDeviceName(service);
        })
      }
    ];
  }

  function renderActionPanel(state, metrics) {
    const items = getActionItems(state, metrics);

    return [
      '<section class="app-card p-5 sm:p-6" aria-labelledby="action-heading">',
      '<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">',
      '<div><p class="text-sm font-semibold text-primary-600">Perlu Tindakan</p>',
      '<h2 id="action-heading" class="mt-2 text-2xl font-black text-neutral-900">Prioritas operasional hari ini</h2></div>',
      '<p class="text-sm leading-6 text-neutral-600">Dihitung dari status service, pembayaran, assignment, dan stok database.</p>',
      "</div>",
      '<div class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">',
      items
        .map(function (item) {
          return [
            '<article id="',
            html(item.id),
            '" class="scroll-mt-24 rounded-2xl border p-5 ',
            html(item.tone),
            '">',
            '<div class="flex items-center justify-between gap-3">',
            '<h3 class="text-sm font-black">',
            html(item.title),
            '</h3><span class="text-2xl font-black tabular-nums">',
            html(item.count),
            "</span></div>",
            item.detail.length
              ? '<ul class="mt-3 space-y-1 text-xs leading-5">' +
                item.detail
                  .map(function (detail) {
                    return "<li>" + html(detail) + "</li>";
                  })
                  .join("") +
                "</ul>"
              : '<p class="mt-3 text-xs leading-5">Tidak ada item prioritas.</p>',
            "</article>"
          ].join("");
        })
        .join(""),
      "</div>",
      "</section>"
    ].join("");
  }

  function renderStatusBreakdown(state, metrics) {
    const maxCount = Math.max.apply(
      null,
      config.serviceStatuses.map(function (status) {
        return metrics.counts[status.key] || 0;
      })
    );

    return [
      '<section id="status-breakdown" class="app-card scroll-mt-24 p-5 sm:p-6" aria-labelledby="status-heading">',
      '<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">',
      '<div><p class="text-sm font-semibold text-primary-600">Ringkasan status</p>',
      '<h2 id="status-heading" class="mt-2 text-2xl font-black text-neutral-900">Breakdown service aktif</h2></div>',
      '<p class="text-sm leading-6 text-neutral-600">Grafik sederhana dari jumlah tiket per status.</p>',
      "</div>",
      '<div class="mt-6 space-y-4">',
      config.serviceStatuses
        .map(function (status) {
          const count = metrics.counts[status.key] || 0;
          const width = maxCount ? Math.max(8, Math.round((count / maxCount) * 100)) : 0;
          return [
            '<div><div class="mb-2 flex items-center justify-between gap-3 text-sm">',
            '<span class="font-semibold text-neutral-700">',
            html(status.label),
            '</span><span class="font-black tabular-nums text-neutral-900">',
            html(count),
            "</span></div>",
            '<div class="h-3 overflow-hidden rounded-full bg-neutral-100" role="img" aria-label="',
            html(status.label + " " + count + " tiket"),
            '"><div class="h-full rounded-full bg-primary-500" style="width: ',
            html(width),
            '%"></div></div></div>'
          ].join("");
        })
        .join(""),
      "</div>",
      '<div class="admin-table-shell mt-6 rounded-2xl border border-neutral-200">',
      '<table class="admin-responsive-table w-full divide-y divide-neutral-200 text-sm">',
      '<thead class="bg-neutral-50 text-left text-xs font-bold text-neutral-600"><tr><th scope="col">Status</th><th scope="col">Jumlah</th></tr></thead>',
      '<tbody class="divide-y divide-neutral-200 bg-white">',
      config.serviceStatuses
        .map(function (status) {
          return [
            '<tr><td class="px-4 py-3">',
            html(status.label),
            '</td><td class="px-4 py-3 font-bold tabular-nums">',
            html(metrics.counts[status.key] || 0),
            "</td></tr>"
          ].join("");
        })
        .join(""),
      "</tbody></table></div>",
      "</section>"
    ].join("");
  }

  function formatDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return [year, month, day].join("-");
  }

  function shiftDateKey(dateKey, days) {
    const date = new Date(dateKey + "T00:00:00");
    date.setDate(date.getDate() + days);
    return formatDateInput(date);
  }

  function getReportRange(state) {
    const fallbackDate = getDashboardDate(state.serviceOrders) || toDateKey(new Date().toISOString());
    const base = new Date(fallbackDate + "T00:00:00");
    let from = fallbackDate;
    let to = fallbackDate;
    let label = "Harian";

    if (filters.reportPreset === "weekly") {
      from = shiftDateKey(fallbackDate, -6);
      label = "Mingguan";
    } else if (filters.reportPreset === "monthly") {
      from = formatDateInput(new Date(base.getFullYear(), base.getMonth(), 1));
      label = "Bulanan";
    } else if (filters.reportPreset === "custom") {
      from = filters.reportFrom || fallbackDate;
      to = filters.reportTo || filters.reportFrom || fallbackDate;
      label = "Custom";
    }

    if (from > to) {
      const originalFrom = from;
      from = to;
      to = originalFrom;
    }

    return {
      from,
      to,
      label
    };
  }

  function isInRange(dateValue, range) {
    const dateKey = toDateKey(dateValue);
    return Boolean(dateKey && dateKey >= range.from && dateKey <= range.to);
  }

  function isRevenueService(service) {
    return ["SELESAI", "DIAMBIL"].includes(service.status);
  }

  function getReportData(state) {
    const range = getReportRange(state);
    const receivedServices = state.serviceOrders.filter(function (service) {
      return isInRange(service.receivedAt, range);
    });
    const durationServices = state.serviceOrders.filter(function (service) {
      return ["SIAP_DIAMBIL", "SELESAI", "DIAMBIL"].includes(service.status) && isInRange(getCompletionDate(service), range);
    });
    const revenueServices = state.serviceOrders.filter(function (service) {
      return isRevenueService(service) && isInRange(getCompletionDate(service), range);
    });
    const revenueIds = new Set(
      revenueServices.map(function (service) {
        return service.id;
      })
    );
    const revenuePayments = state.payments.filter(function (payment) {
      return payment.status === "Lunas" && revenueIds.has(payment.serviceId);
    });
    const statusCounts = config.serviceStatuses.reduce(function (counts, status) {
      counts[status.key] = 0;
      return counts;
    }, {});
    receivedServices.forEach(function (service) {
      statusCounts[service.status] = (statusCounts[service.status] || 0) + 1;
    });
    const durations = durationServices
      .map(function (service) {
        return daysBetween(service.receivedAt, getCompletionDate(service));
      })
      .filter(function (duration) {
        return typeof duration === "number";
      });
    const technicianPerformance = state.technicians.map(function (technician) {
      const assigned = state.serviceOrders.filter(function (service) {
        return service.technicianId === technician.id;
      });
      const active = assigned.filter(function (service) {
        return !["SELESAI", "DIAMBIL"].includes(service.status);
      });
      const completed = assigned.filter(function (service) {
        return isRevenueService(service) && isInRange(getCompletionDate(service), range);
      });
      const technicianDurations = completed
        .map(function (service) {
          return daysBetween(service.receivedAt, getCompletionDate(service));
        })
        .filter(function (duration) {
          return typeof duration === "number";
        });

      return {
        technician,
        active: active.length,
        completed: completed.length,
        averageDuration: technicianDurations.length
          ? technicianDurations.reduce(function (sum, duration) {
              return sum + duration;
            }, 0) / technicianDurations.length
          : 0
      };
    });
    const partUsageMap = {};
    state.serviceOrders.forEach(function (service) {
      if (!isInRange(service.receivedAt, range)) {
        return;
      }
      (service.partUsages || []).forEach(function (usage) {
        if (!partUsageMap[usage.partId]) {
          partUsageMap[usage.partId] = {
            part: getPart(state, usage.partId),
            qty: 0,
            services: 0
          };
        }
        partUsageMap[usage.partId].qty += usage.qty;
        partUsageMap[usage.partId].services += 1;
      });
    });
    const partUsages = Object.keys(partUsageMap)
      .map(function (partId) {
        return partUsageMap[partId];
      })
      .sort(function (first, second) {
        return second.qty - first.qty;
      });
    const totals = revenuePayments.reduce(
      function (acc, payment) {
        acc.serviceFee += toNumber(payment.serviceFee);
        acc.partsFee += toNumber(payment.partsFee);
        acc.discount += toNumber(payment.discount);
        acc.total += getPaymentTotal(payment);
        return acc;
      },
      { serviceFee: 0, partsFee: 0, discount: 0, total: 0 }
    );

    return {
      range,
      receivedServices,
      durationServices,
      revenueServices,
      revenuePayments,
      statusCounts,
      technicianPerformance,
      partUsages,
      totals,
      averageDuration: durations.length
        ? durations.reduce(function (sum, duration) {
            return sum + duration;
          }, 0) / durations.length
        : 0
    };
  }

  function renderReportMetricCard(options) {
    return [
      '<article class="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">',
      '<div class="flex items-start justify-between gap-4"><div><p class="text-sm font-semibold text-neutral-600">',
      html(options.label),
      '</p><p class="mt-3 text-2xl font-black tabular-nums text-neutral-900">',
      html(options.value),
      '</p></div><div class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ',
      html(options.iconClass),
      '">',
      components.icon(options.iconName, "h-5 w-5"),
      "</div></div>",
      '<p class="mt-3 text-xs leading-5 text-neutral-500">',
      html(options.note),
      "</p></article>"
    ].join("");
  }

  function renderReportKpis(report) {
    return [
      '<div class="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">',
      renderReportMetricCard({
        label: "Service masuk",
        value: String(report.receivedServices.length),
        note: "Berdasarkan tanggal terima",
        iconName: "phone",
        iconClass: "bg-primary-500/10 text-primary-600"
      }),
      renderReportMetricCard({
        label: "Selesai/diambil",
        value: String(report.revenueServices.length),
        note: "Sesuai status pendapatan",
        iconName: "check",
        iconClass: "bg-green-50 text-green-600"
      }),
      renderReportMetricCard({
        label: "Pendapatan selesai",
        value: components.formatRupiah(report.totals.total),
        note: "Hanya pembayaran lunas service selesai/diambil",
        iconName: "check",
        iconClass: "bg-emerald-50 text-emerald-600"
      }),
      renderReportMetricCard({
        label: "Rata-rata durasi",
        value: report.averageDuration ? report.averageDuration.toFixed(1) + " hari" : "-",
        note: "Diterima sampai siap/selesai",
        iconName: "layout",
        iconClass: "bg-cyan-50 text-cyan-600"
      }),
      renderReportMetricCard({
        label: "Pendapatan jasa",
        value: components.formatRupiah(report.totals.serviceFee),
        note: "Komponen biaya jasa",
        iconName: "layout",
        iconClass: "bg-slate-100 text-slate-700"
      }),
      renderReportMetricCard({
        label: "Pendapatan sparepart",
        value: components.formatRupiah(report.totals.partsFee),
        note: "Komponen pemakaian sparepart",
        iconName: "phone",
        iconClass: "bg-orange-50 text-accent-500"
      }),
      renderReportMetricCard({
        label: "Diskon",
        value: components.formatRupiah(report.totals.discount),
        note: "Potongan pada pembayaran lunas",
        iconName: "alert",
        iconClass: "bg-amber-50 text-amber-600"
      }),
      renderReportMetricCard({
        label: "Transaksi laporan",
        value: String(report.revenuePayments.length),
        note: "Pembayaran yang masuk aturan",
        iconName: "search",
        iconClass: "bg-indigo-50 text-indigo-600"
      }),
      "</div>"
    ].join("");
  }

  function renderReportFilters(report) {
    const customHidden = filters.reportPreset === "custom" ? "" : " md:opacity-60";
    return [
      '<form class="report-controls grid gap-3 border-b border-neutral-200 bg-white p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-5" data-filter-form="report">',
      filterSelect(
        "reportPreset",
        "Periode",
        option("daily", "Harian", filters.reportPreset) +
          option("weekly", "Mingguan", filters.reportPreset) +
          option("monthly", "Bulanan", filters.reportPreset) +
          option("custom", "Rentang custom", filters.reportPreset)
      ),
      '<label class="text-xs font-bold text-neutral-600',
      customHidden,
      '">Dari tanggal<input name="reportFrom" type="date" value="',
      attr(filters.reportFrom || report.range.from),
      '" class="mt-2 min-h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15"></label>',
      '<label class="text-xs font-bold text-neutral-600',
      customHidden,
      '">Sampai tanggal<input name="reportTo" type="date" value="',
      attr(filters.reportTo || report.range.to),
      '" class="mt-2 min-h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15"></label>',
      '<div class="flex items-end gap-2">',
      components.button({ label: "Terapkan", type: "submit", variant: "primary", iconName: "search", className: "w-full" }),
      '<button type="button" class="inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-900 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500" data-clear-filters="report">Reset</button>',
      "</div>",
      '<div class="flex items-end gap-2">',
      actionButton("Print", "print-report", "", "secondary"),
      actionButton("Unduh CSV", "export-report", "", "secondary"),
      "</div>",
      "</form>"
    ].join("");
  }

  function renderReportStatusBreakdown(report) {
    const maxCount = Math.max.apply(
      null,
      config.serviceStatuses.map(function (status) {
        return report.statusCounts[status.key] || 0;
      })
    );

    return [
      '<article class="report-print-break-inside rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">',
      '<div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">',
      '<div><p class="text-sm font-semibold text-primary-600">Status breakdown</p>',
      '<h3 class="mt-2 text-xl font-black text-neutral-900">Distribusi service masuk periode ini</h3></div>',
      '<p class="text-sm leading-6 text-neutral-600">Ringkasan teks dan tabel tersedia agar grafik tidak menjadi satu-satunya representasi.</p></div>',
      '<div class="mt-5 space-y-4">',
      config.serviceStatuses
        .map(function (status) {
          const count = report.statusCounts[status.key] || 0;
          const width = maxCount ? Math.max(8, Math.round((count / maxCount) * 100)) : 0;
          return [
            '<div><div class="mb-2 flex items-center justify-between gap-3 text-sm"><span class="font-semibold text-neutral-700">',
            html(status.label),
            '</span><span class="font-black tabular-nums text-neutral-900">',
            html(count),
            '</span></div><div class="h-3 overflow-hidden rounded-full bg-neutral-100" role="img" aria-label="',
            html(status.label + " " + count + " tiket"),
            '"><div class="h-full rounded-full bg-primary-500" style="width: ',
            html(width),
            '%"></div></div></div>'
          ].join("");
        })
        .join(""),
      "</div>",
      '<div class="admin-table-shell mt-5 rounded-2xl border border-neutral-200"><table class="admin-responsive-table w-full divide-y divide-neutral-200 text-sm">',
      '<thead class="bg-neutral-50 text-left text-xs font-bold text-neutral-600"><tr><th scope="col">Status</th><th scope="col">Jumlah</th></tr></thead>',
      '<tbody class="divide-y divide-neutral-200 bg-white">',
      config.serviceStatuses
        .map(function (status) {
          return '<tr><td class="px-4 py-3">' + html(status.label) + '</td><td class="px-4 py-3 font-bold tabular-nums">' + html(report.statusCounts[status.key] || 0) + "</td></tr>";
        })
        .join(""),
      "</tbody></table></div></article>"
    ].join("");
  }

  function renderTechnicianReport(report) {
    return [
      '<article class="report-print-break-inside rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">',
      '<p class="text-sm font-semibold text-primary-600">Performa teknisi</p>',
      '<h3 class="mt-2 text-xl font-black text-neutral-900">Assignment dan service selesai</h3>',
      '<div class="admin-table-shell mt-5 rounded-2xl border border-neutral-200"><table class="admin-responsive-table w-full divide-y divide-neutral-200 text-sm">',
      '<thead class="bg-neutral-50 text-left text-xs font-bold text-neutral-600"><tr><th scope="col">Teknisi</th><th scope="col">Aktif</th><th scope="col">Selesai/Diambil</th><th scope="col">Rata-rata durasi</th></tr></thead>',
      '<tbody class="divide-y divide-neutral-200 bg-white">',
      report.technicianPerformance
        .map(function (item) {
          return [
            '<tr><td class="px-4 py-3 font-bold text-neutral-900">',
            html(item.technician.name),
            '</td><td class="px-4 py-3 tabular-nums">',
            html(item.active),
            '</td><td class="px-4 py-3 tabular-nums">',
            html(item.completed),
            '</td><td class="px-4 py-3">',
            html(item.averageDuration ? item.averageDuration.toFixed(1) + " hari" : "-"),
            "</td></tr>"
          ].join("");
        })
        .join(""),
      "</tbody></table></div></article>"
    ].join("");
  }

  function renderPartUsageReport(report) {
    const rows = report.partUsages.length
      ? report.partUsages
          .map(function (item) {
            return [
              '<tr><td class="px-4 py-3 font-bold text-neutral-900">',
              html(item.part ? item.part.sku : "-"),
              '<p class="mt-1 text-xs font-normal text-neutral-500">',
              html(item.part ? item.part.name : "Sparepart terhapus"),
              '</p></td><td class="px-4 py-3 tabular-nums">',
              html(item.qty),
              '</td><td class="px-4 py-3 tabular-nums">',
              html(item.services),
              "</td></tr>"
            ].join("");
          })
          .join("")
      : emptyRow(3, "Belum ada sparepart terpakai pada periode ini.");

    return [
      '<article class="report-print-break-inside rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">',
      '<p class="text-sm font-semibold text-primary-600">Sparepart terpakai</p>',
      '<h3 class="mt-2 text-xl font-black text-neutral-900">Komponen paling sering digunakan</h3>',
      '<div class="admin-table-shell mt-5 rounded-2xl border border-neutral-200"><table class="admin-responsive-table w-full divide-y divide-neutral-200 text-sm">',
      '<thead class="bg-neutral-50 text-left text-xs font-bold text-neutral-600"><tr><th scope="col">Sparepart</th><th scope="col">Qty</th><th scope="col">Service</th></tr></thead>',
      '<tbody class="divide-y divide-neutral-200 bg-white">',
      rows,
      "</tbody></table></div></article>"
    ].join("");
  }

  function renderRevenueTable(state, report) {
    const rows = report.revenuePayments.length
      ? report.revenuePayments
          .map(function (payment) {
            const service = state.serviceOrders.find(function (item) {
              return item.id === payment.serviceId;
            });
            return [
              '<tr><td class="px-4 py-3 font-bold text-neutral-900">',
              html(service ? service.receipt : payment.serviceId),
              '<p class="mt-1 text-xs font-normal text-neutral-500">',
              html(service ? getCustomerName(state, service.customerId) : "-"),
              '</p></td><td class="px-4 py-3">',
              html(service ? getStatusLabel(service.status) : "-"),
              '</td><td class="px-4 py-3">',
              html(payment.method),
              '</td><td class="px-4 py-3 text-right tabular-nums">',
              html(components.formatRupiah(payment.serviceFee)),
              '</td><td class="px-4 py-3 text-right tabular-nums">',
              html(components.formatRupiah(payment.partsFee)),
              '</td><td class="px-4 py-3 text-right tabular-nums">',
              html(components.formatRupiah(payment.discount)),
              '</td><td class="px-4 py-3 text-right font-bold tabular-nums text-neutral-900">',
              html(components.formatRupiah(getPaymentTotal(payment))),
              "</td></tr>"
            ].join("");
          })
          .join("")
      : emptyRow(7, "Tidak ada transaksi yang masuk aturan pendapatan pada periode ini.");

    return [
      '<article class="report-print-break-inside rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 xl:col-span-2">',
      '<p class="text-sm font-semibold text-primary-600">Tabel transaksi</p>',
      '<h3 class="mt-2 text-xl font-black text-neutral-900">Pendapatan service selesai/diambil</h3>',
      '<div class="admin-table-shell mt-5 rounded-2xl border border-neutral-200"><table class="admin-responsive-table w-full divide-y divide-neutral-200 text-sm">',
      '<thead class="bg-neutral-50 text-left text-xs font-bold text-neutral-600"><tr><th scope="col">Resi/Pelanggan</th><th scope="col">Status</th><th scope="col">Metode</th><th scope="col" class="text-right">Jasa</th><th scope="col" class="text-right">Sparepart</th><th scope="col" class="text-right">Diskon</th><th scope="col" class="text-right">Total</th></tr></thead>',
      '<tbody class="divide-y divide-neutral-200 bg-white">',
      rows,
      "</tbody></table></div></article>"
    ].join("");
  }

  function renderReportsModule(state) {
    const report = getReportData(state);
    const periodText = report.range.label + " - " + components.formatDate(report.range.from) + " sampai " + components.formatDate(report.range.to);
    const body = [
      renderReportFilters(report),
      '<div class="report-print-surface">',
      '<div class="report-print-only border-b border-neutral-200 p-5"><p class="text-sm font-bold text-neutral-900">',
      html(config.app.name),
      '</p><p class="mt-1 text-xs text-neutral-600">Laporan operasional frontend - ',
      html(periodText),
      '</p><p class="mt-1 text-xs text-neutral-500">Dicetak ',
      html(components.formatDateTime(new Date().toISOString())),
      "</p></div>",
      '<div class="border-b border-neutral-200 p-5 sm:p-6"><p class="text-sm font-semibold text-primary-600">Laporan operasional</p>',
      '<h2 class="mt-2 text-2xl font-black text-neutral-900">Ringkasan periode</h2>',
      '<p class="mt-2 text-sm leading-6 text-neutral-600">',
      html(periodText),
      ". Data dihitung dari state frontend yang tersedia di browser.</p></div>",
      renderReportKpis(report),
      '<div class="grid gap-5 p-5 sm:p-6 xl:grid-cols-2">',
      renderReportStatusBreakdown(report),
      renderTechnicianReport(report),
      renderPartUsageReport(report),
      renderRevenueTable(state, report),
      "</div></div>"
    ].join("");

    return renderModuleShell({
      id: "laporan",
      eyebrow: "Laporan",
      title: "Reports & Print",
      description: "Filter periode, KPI laporan, breakdown status, performa teknisi, transaksi, sparepart terpakai, print, dan CSV frontend.",
      body
    });
  }

  function getReportCsvRows(state) {
    const report = getReportData(state);
    const rows = [
      ["Periode", report.range.label, report.range.from, report.range.to],
      ["Service masuk", report.receivedServices.length],
      ["Selesai/Diambil", report.revenueServices.length],
      ["Pendapatan jasa", report.totals.serviceFee],
      ["Pendapatan sparepart", report.totals.partsFee],
      ["Diskon", report.totals.discount],
      ["Pendapatan selesai", report.totals.total],
      [],
      ["Resi", "Pelanggan", "Status", "Teknisi", "Jasa", "Sparepart", "Diskon", "Total"]
    ];

    report.revenuePayments.forEach(function (payment) {
      const service = state.serviceOrders.find(function (item) {
        return item.id === payment.serviceId;
      });
      rows.push([
        service ? service.receipt : payment.serviceId,
        service ? getCustomerName(state, service.customerId) : "-",
        service ? getStatusLabel(service.status) : "-",
        service ? getTechnicianName(state, service.technicianId) : "-",
        payment.serviceFee,
        payment.partsFee,
        payment.discount,
        getPaymentTotal(payment)
      ]);
    });

    return rows;
  }

  function csvCell(value) {
    const text = String(value == null ? "" : value);
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function exportReportCsv() {
    const rows = getReportCsvRows(store.getState());
    const csv = rows
      .map(function (row) {
        return row.map(csvCell).join(",");
      })
      .join("\r\n");
    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    link.download = "laporan-papuans-manado.csv";
    document.body.appendChild(link);
    if (typeof link.click === "function") {
      link.click();
    }
    link.remove();
    showSuccess("CSV laporan disiapkan dari data frontend.");
  }

  function printReport() {
    document.body.classList.add("is-printing-report");
    window.print();
    window.setTimeout(function () {
      document.body.classList.remove("is-printing-report");
    }, 250);
  }

  function filterServices(state) {
    return state.serviceOrders
      .filter(function (service) {
        const text = [
          service.receipt,
          getCustomerName(state, service.customerId),
          getDeviceName(service),
          service.complaint,
          service.priority
        ].join(" ");
        const dateKey = toDateKey(service.receivedAt);
        const searchOk = !filters.serviceSearch || matchesText(text, filters.serviceSearch);
        const statusOk = filters.serviceStatus === "ALL" || service.status === filters.serviceStatus;
        const technicianOk = filters.serviceTechnician === "ALL" || service.technicianId === filters.serviceTechnician;
        const fromOk = !filters.serviceFrom || dateKey >= filters.serviceFrom;
        const toOk = !filters.serviceTo || dateKey <= filters.serviceTo;
        return searchOk && statusOk && technicianOk && fromOk && toOk;
      })
      .sort(function (first, second) {
        return new Date(second.receivedAt) - new Date(first.receivedAt);
      });
  }

  function renderServiceModule(state) {
    const rows = filterServices(state);
    const tableRows = rows.length
      ? rows
          .map(function (service) {
            const payment = getPaymentForService(state, service.id);
            return [
              '<tr class="hover:bg-neutral-50">',
              '<td class="px-4 py-4 font-bold text-neutral-900">',
              html(service.receipt),
              '<p class="mt-1 text-xs font-normal text-neutral-500">',
              html(components.formatDateTime(service.receivedAt)),
              "</p></td>",
              '<td class="px-4 py-4 text-neutral-700">',
              html(getCustomerName(state, service.customerId)),
              "</td>",
              '<td class="px-4 py-4 text-neutral-700">',
              html(getDeviceName(service)),
              "</td>",
              '<td class="px-4 py-4">',
              components.statusBadge(service.status),
              "</td>",
              '<td class="px-4 py-4">',
              '<select class="min-h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15" aria-label="Assign teknisi untuk ',
              attr(service.receipt),
              '" data-service-technician="',
              attr(service.id),
              '">',
              technicianOptions(state, service.technicianId || "", false, true),
              "</select>",
              "</td>",
              '<td class="px-4 py-4 text-neutral-700">',
              html(payment ? payment.status : "Belum dibayar"),
              "</td>",
              '<td class="px-4 py-4 text-neutral-700">',
              html(getPartUsageSummary(state, service)),
              "</td>",
              '<td class="px-4 py-4"><div class="flex flex-wrap gap-2">',
              iconAction("Detail service", "detail-service", service.id, "search"),
              iconAction("Edit service", "edit-service", service.id, "layout"),
              iconAction("Pakai sparepart", "use-part", service.id, "check"),
              iconAction("Hapus service", "delete-service", service.id, "alert", "danger"),
              "</div></td>",
              "</tr>"
            ].join("");
          })
          .join("")
      : emptyRow(8, "Tidak ada service yang cocok dengan filter.");

    const body = [
      renderFilterForm("service", [
        filterInput("serviceSearch", "Cari service", filters.serviceSearch, "Resi, pelanggan, perangkat"),
        filterSelect("serviceStatus", "Status", statusOptions(filters.serviceStatus, true)),
        filterSelect("serviceTechnician", "Teknisi", technicianOptions(state, filters.serviceTechnician, true, false)),
        filterInput("serviceFrom", "Dari tanggal", filters.serviceFrom, "", "date"),
        filterInput("serviceTo", "Sampai tanggal", filters.serviceTo, "", "date")
      ]),
      tableWrap(
        ["Resi", "Pelanggan", "Perangkat", "Status", "Teknisi", "Pembayaran", "Sparepart", "Aksi"],
        [tableRows]
      ),
      moduleFooter(rows.length, state.serviceOrders.length)
    ].join("");

    return renderModuleShell({
      id: "service",
      eyebrow: "Operasional",
      title: "Service Masuk",
      description: "Kelola tiket service, assignment teknisi, status, pemakaian sparepart, dan preview tracking publik.",
      actionHtml: actionButton("Tambah Service", "new-service", "", "primary"),
      body
    });
  }

  function filterCustomers(state) {
    return state.customers.filter(function (customer) {
      return (
        !filters.customerSearch ||
        matchesText([customer.name, customer.whatsapp, customer.address].join(" "), filters.customerSearch)
      );
    });
  }

  function renderCustomerModule(state) {
    const rows = filterCustomers(state);
    const tableRows = rows.length
      ? rows
          .map(function (customer) {
            const history = state.serviceOrders.filter(function (service) {
              return service.customerId === customer.id;
            });
            return [
              '<tr class="hover:bg-neutral-50">',
              '<td class="px-4 py-4 font-bold text-neutral-900">',
              html(customer.name),
              "</td>",
              '<td class="px-4 py-4 text-neutral-700">',
              html(customer.whatsapp),
              "</td>",
              '<td class="px-4 py-4 text-neutral-700">',
              html(customer.address),
              "</td>",
              '<td class="px-4 py-4 font-bold tabular-nums text-neutral-900">',
              html(history.length),
              "</td>",
              '<td class="px-4 py-4"><div class="flex flex-wrap gap-2">',
              iconAction("Detail pelanggan", "detail-customer", customer.id, "search"),
              iconAction("Edit pelanggan", "edit-customer", customer.id, "layout"),
              iconAction("Hapus pelanggan", "delete-customer", customer.id, "alert", "danger"),
              "</div></td></tr>"
            ].join("");
          })
          .join("")
      : emptyRow(5, "Tidak ada pelanggan yang cocok.");

    const body = [
      renderFilterForm("customer", [filterInput("customerSearch", "Cari pelanggan", filters.customerSearch, "Nama, WhatsApp, alamat")]),
      tableWrap(["Nama", "WhatsApp", "Alamat", "Riwayat", "Aksi"], [tableRows]),
      moduleFooter(rows.length, state.customers.length)
    ].join("");

    return renderModuleShell({
      id: "pelanggan",
      eyebrow: "Master data",
      title: "Pelanggan",
      description: "Profil pelanggan dari API untuk service dan riwayat perangkat.",
      actionHtml: actionButton("Tambah Pelanggan", "new-customer", "", "primary"),
      body
    });
  }

  function filterDevices(state) {
    return state.serviceOrders.filter(function (service) {
      const customer = getCustomerName(state, service.customerId);
      const text = [service.receipt, customer, service.device.brand, service.device.model, service.device.color, service.device.imei].join(" ");
      return !filters.deviceSearch || matchesText(text, filters.deviceSearch);
    });
  }

  function renderDeviceModule(state) {
    const rows = filterDevices(state);
    const tableRows = rows.length
      ? rows
          .map(function (service) {
            return [
              '<tr class="hover:bg-neutral-50">',
              '<td class="px-4 py-4 font-bold text-neutral-900">',
              html(getDeviceName(service)),
              '<p class="mt-1 text-xs font-normal text-neutral-500">',
              html(service.device.color || "-"),
              "</p></td>",
              '<td class="px-4 py-4 text-neutral-700">',
              html(getCustomerName(state, service.customerId)),
              "</td>",
              '<td class="px-4 py-4 text-neutral-700">',
              html(service.device.imei || "Tidak diisi"),
              "</td>",
              '<td class="px-4 py-4 text-neutral-700">',
              html(service.receipt),
              "</td>",
              '<td class="px-4 py-4">',
              components.statusBadge(service.status),
              "</td>",
              '<td class="px-4 py-4"><div class="flex flex-wrap gap-2">',
              iconAction("Detail perangkat", "detail-device", service.id, "search"),
              iconAction("Edit perangkat", "edit-device", service.id, "layout"),
              iconAction("Hapus perangkat", "delete-device", service.id, "alert", "danger"),
              "</div></td></tr>"
            ].join("");
          })
          .join("")
      : emptyRow(6, "Tidak ada perangkat yang cocok.");

    const body = [
      renderFilterForm("device", [filterInput("deviceSearch", "Cari perangkat", filters.deviceSearch, "Merk, tipe, IMEI, resi")]),
      tableWrap(["Perangkat", "Pelanggan", "IMEI", "Resi", "Status", "Aksi"], [tableRows]),
      moduleFooter(rows.length, state.serviceOrders.length)
    ].join("");

    return renderModuleShell({
      id: "perangkat",
      eyebrow: "Operasional",
      title: "Perangkat",
      description: "Perangkat dicatat sebagai bagian dari tiket service agar riwayat dan relasi tetap valid.",
      actionHtml: actionButton("Tambah Lewat Service", "new-service", "", "primary"),
      body
    });
  }

  function filterDamages(state) {
    return state.damageTypes.filter(function (damage) {
      const searchOk =
        !filters.damageSearch ||
        matchesText([damage.name, damage.estimatedDuration, damage.priceRange].join(" "), filters.damageSearch);
      const activeOk =
        filters.damageActive === "ALL" ||
        (filters.damageActive === "ACTIVE" && damage.active) ||
        (filters.damageActive === "INACTIVE" && !damage.active);
      return searchOk && activeOk;
    });
  }

  function renderDamageModule(state) {
    const rows = filterDamages(state);
    const tableRows = rows.length
      ? rows
          .map(function (damage) {
            const usedCount = state.serviceOrders.filter(function (service) {
              return service.damageTypeId === damage.id;
            }).length;
            return [
              '<tr class="hover:bg-neutral-50">',
              '<td class="px-4 py-4 font-bold text-neutral-900">',
              html(damage.name),
              "</td>",
              '<td class="px-4 py-4 text-neutral-700">',
              html(damage.estimatedDuration),
              "</td>",
              '<td class="px-4 py-4 text-neutral-700">',
              html(damage.priceRange),
              "</td>",
              '<td class="px-4 py-4">',
              damage.active
                ? '<span class="inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">Aktif</span>'
                : '<span class="inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-bold text-neutral-600">Nonaktif</span>',
              "</td>",
              '<td class="px-4 py-4 font-bold tabular-nums text-neutral-900">',
              html(usedCount),
              "</td>",
              '<td class="px-4 py-4"><div class="flex flex-wrap gap-2">',
              iconAction("Detail jenis kerusakan", "detail-damage", damage.id, "search"),
              iconAction("Edit jenis kerusakan", "edit-damage", damage.id, "layout"),
              iconAction("Hapus jenis kerusakan", "delete-damage", damage.id, "alert", "danger"),
              "</div></td></tr>"
            ].join("");
          })
          .join("")
      : emptyRow(6, "Tidak ada jenis kerusakan yang cocok.");

    const body = [
      renderFilterForm("damage", [
        filterInput("damageSearch", "Cari jenis kerusakan", filters.damageSearch, "Nama, durasi, biaya"),
        filterSelect(
          "damageActive",
          "Status",
          option("ALL", "Semua", filters.damageActive) +
            option("ACTIVE", "Aktif", filters.damageActive) +
            option("INACTIVE", "Nonaktif", filters.damageActive)
        )
      ]),
      tableWrap(["Nama", "Durasi", "Kisaran Biaya", "Status", "Dipakai", "Aksi"], [tableRows]),
      moduleFooter(rows.length, state.damageTypes.length)
    ].join("");

    return renderModuleShell({
      id: "kerusakan",
      eyebrow: "Master data",
      title: "Jenis Kerusakan",
      description: "Kategori service aktif/nonaktif untuk form tiket dan laporan.",
      actionHtml: actionButton("Tambah Jenis", "new-damage", "", "primary"),
      body
    });
  }

  function filterTechnicians(state) {
    return state.technicians.filter(function (technician) {
      const searchOk =
        !filters.technicianSearch ||
        matchesText([technician.name, technician.skills.join(" "), technician.availability].join(" "), filters.technicianSearch);
      const availabilityOk =
        filters.technicianAvailability === "ALL" || technician.availability === filters.technicianAvailability;
      return searchOk && availabilityOk;
    });
  }

  function renderTechnicianModule(state) {
    const rows = filterTechnicians(state);
    const tableRows = rows.length
      ? rows
          .map(function (technician) {
            const stats = getTechnicianStats(state, technician.id);
            return [
              '<tr class="hover:bg-neutral-50">',
              '<td class="px-4 py-4 font-bold text-neutral-900">',
              html(technician.name),
              "</td>",
              '<td class="px-4 py-4 text-neutral-700">',
              html(technician.skills.join(", ")),
              "</td>",
              '<td class="px-4 py-4 text-neutral-700">',
              html(technician.availability),
              "</td>",
              '<td class="px-4 py-4 font-bold tabular-nums text-neutral-900">',
              html(stats.active),
              "</td>",
              '<td class="px-4 py-4 font-bold tabular-nums text-neutral-900">',
              html(stats.completed),
              "</td>",
              '<td class="px-4 py-4 text-neutral-700">',
              html(stats.averageDuration ? stats.averageDuration.toFixed(1) + " hari" : "-"),
              "</td>",
              '<td class="px-4 py-4"><div class="flex flex-wrap gap-2">',
              iconAction("Detail teknisi", "detail-technician", technician.id, "search"),
              iconAction("Edit teknisi", "edit-technician", technician.id, "layout"),
              iconAction("Hapus teknisi", "delete-technician", technician.id, "alert", "danger"),
              "</div></td></tr>"
            ].join("");
          })
          .join("")
      : emptyRow(7, "Tidak ada teknisi yang cocok.");

    const body = [
      renderFilterForm("technician", [
        filterInput("technicianSearch", "Cari teknisi", filters.technicianSearch, "Nama, skill"),
        filterSelect(
          "technicianAvailability",
          "Ketersediaan",
          option("ALL", "Semua", filters.technicianAvailability) +
            option("Available", "Available", filters.technicianAvailability) +
            option("Busy", "Busy", filters.technicianAvailability)
        )
      ]),
      tableWrap(["Nama", "Keahlian", "Status", "Aktif", "Selesai", "Rata-rata", "Aksi"], [tableRows]),
      moduleFooter(rows.length, state.technicians.length)
    ].join("");

    return renderModuleShell({
      id: "teknisi",
      eyebrow: "Master data",
      title: "Teknisi",
      description: "Profil teknisi, assignment aktif, hasil selesai, dan status ketersediaan.",
      actionHtml: actionButton("Tambah Teknisi", "new-technician", "", "primary"),
      body
    });
  }

  function filterParts(state) {
    return state.parts.filter(function (part) {
      const searchOk =
        !filters.partSearch ||
        matchesText([part.sku, part.name].join(" "), filters.partSearch);
      const stockTone = getStockTone(part).label;
      const stockOk = filters.partStock === "ALL" || stockTone === filters.partStock;
      return searchOk && stockOk;
    });
  }

  function renderPartModule(state) {
    const rows = filterParts(state);
    const usages = getPartUsageEntries(state);
    const tableRows = rows.length
      ? rows
          .map(function (part) {
            const tone = getStockTone(part);
            const used = usages
              .filter(function (entry) {
                return entry.part && entry.part.id === part.id;
              })
              .reduce(function (sum, entry) {
                return sum + entry.qty;
              }, 0);
            return [
              '<tr class="hover:bg-neutral-50">',
              '<td class="px-4 py-4 font-bold text-neutral-900">',
              html(part.sku),
              '<p class="mt-1 text-xs font-normal text-neutral-500">',
              html(part.name),
              "</p></td>",
              '<td class="px-4 py-4 font-bold tabular-nums text-neutral-900">',
              html(part.stock),
              " / ",
              html(part.minStock),
              "</td>",
              '<td class="px-4 py-4"><span class="inline-flex rounded-full border px-3 py-1 text-xs font-bold ',
              html(tone.className),
              '">',
              html(tone.label),
              "</span></td>",
              '<td class="px-4 py-4 text-neutral-700">',
              html(components.formatRupiah(part.costPrice)),
              "</td>",
              '<td class="px-4 py-4 text-neutral-700">',
              html(components.formatRupiah(part.servicePrice)),
              "</td>",
              '<td class="px-4 py-4 font-bold tabular-nums text-neutral-900">',
              html(used),
              "</td>",
              '<td class="px-4 py-4"><div class="flex flex-wrap gap-2">',
              iconAction("Detail sparepart", "detail-part", part.id, "search"),
              iconAction("Edit sparepart", "edit-part", part.id, "layout"),
              iconAction("Hapus sparepart", "delete-part", part.id, "alert", "danger"),
              "</div></td></tr>"
            ].join("");
          })
          .join("")
      : emptyRow(7, "Tidak ada sparepart yang cocok.");

    const body = [
      renderFilterForm("part", [
        filterInput("partSearch", "Cari sparepart", filters.partSearch, "SKU atau nama"),
        filterSelect(
          "partStock",
          "Status stok",
          option("ALL", "Semua", filters.partStock) +
            option("Aman", "Aman", filters.partStock) +
            option("Menipis", "Menipis", filters.partStock) +
            option("Habis", "Habis", filters.partStock)
        )
      ]),
      tableWrap(
        ["SKU/Nama", "Stok/Min", "Status", "Harga Modal", "Harga Jasa", "Terpakai", "Aksi"],
        [tableRows]
      ),
      moduleFooter(rows.length, state.parts.length)
    ].join("");

    return renderModuleShell({
      id: "sparepart",
      eyebrow: "Stok service",
      title: "Sparepart",
      description: "Komponen perbaikan, stok minimum, harga penggunaan jasa, dan riwayat pemakaian.",
      actionHtml: actionButton("Tambah Sparepart", "new-part", "", "primary"),
      body
    });
  }

  function filterPayments(state) {
    return state.payments.filter(function (payment) {
      const service = state.serviceOrders.find(function (item) {
        return item.id === payment.serviceId;
      });
      const text = [
        payment.id,
        service ? service.receipt : "",
        service ? getCustomerName(state, service.customerId) : "",
        payment.method,
        payment.status,
        payment.proofFileName
      ].join(" ");
      const searchOk = !filters.paymentSearch || matchesText(text, filters.paymentSearch);
      const statusOk = filters.paymentStatus === "ALL" || payment.status === filters.paymentStatus;
      return searchOk && statusOk;
    });
  }

  function renderPaymentModule(state) {
    const rows = filterPayments(state);
    const tableRows = rows.length
      ? rows
          .map(function (payment) {
            const service = state.serviceOrders.find(function (item) {
              return item.id === payment.serviceId;
            });
            const total = getPaymentTotal(payment);
            return [
              '<tr class="hover:bg-neutral-50">',
              '<td class="px-4 py-4 font-bold text-neutral-900">',
              html(payment.id),
              '<p class="mt-1 text-xs font-normal text-neutral-500">',
              html(service ? service.receipt : "Service terhapus"),
              "</p></td>",
              '<td class="px-4 py-4 text-neutral-700">',
              html(service ? getCustomerName(state, service.customerId) : "-"),
              "</td>",
              '<td class="px-4 py-4 text-neutral-700">',
              html(payment.method),
              "</td>",
              '<td class="px-4 py-4 text-neutral-700">',
              html(payment.status),
              "</td>",
              '<td class="px-4 py-4 text-neutral-700">',
              html(components.formatRupiah(payment.serviceFee)),
              "</td>",
              '<td class="px-4 py-4 text-neutral-700">',
              html(components.formatRupiah(payment.partsFee)),
              "</td>",
              '<td class="px-4 py-4 text-neutral-700">',
              html(components.formatRupiah(payment.discount)),
              "</td>",
              '<td class="px-4 py-4 font-bold text-neutral-900">',
              html(components.formatRupiah(total)),
              "</td>",
              '<td class="px-4 py-4 text-neutral-700">',
              html(components.formatRupiah(payment.paid)),
              "</td>",
              '<td class="px-4 py-4"><div class="flex flex-wrap gap-2">',
              iconAction("Detail pembayaran", "detail-payment", payment.id, "search"),
              iconAction("Edit pembayaran", "edit-payment", payment.id, "layout"),
              iconAction("Hapus pembayaran", "delete-payment", payment.id, "alert", "danger"),
              "</div></td></tr>"
            ].join("");
          })
          .join("")
      : emptyRow(10, "Tidak ada pembayaran yang cocok.");

    const body = [
      renderFilterForm("payment", [
        filterInput("paymentSearch", "Cari pembayaran", filters.paymentSearch, "ID, resi, pelanggan"),
        filterSelect(
          "paymentStatus",
          "Status pembayaran",
          option("ALL", "Semua", filters.paymentStatus) +
            option("Belum dibayar", "Belum dibayar", filters.paymentStatus) +
            option("DP", "DP", filters.paymentStatus) +
            option("Lunas", "Lunas", filters.paymentStatus)
        )
      ]),
      tableWrap(
        ["ID/Resi", "Pelanggan", "Metode", "Status", "Jasa", "Sparepart", "Diskon", "Total", "Dibayar", "Aksi"],
        [tableRows]
      ),
      moduleFooter(rows.length, state.payments.length)
    ].join("");

    return renderModuleShell({
      id: "pembayaran",
      eyebrow: "Transaksi manual",
      title: "Pembayaran",
      description: "Pencatatan tunai atau transfer manual. Total dihitung dari jasa + sparepart - diskon.",
      actionHtml: actionButton("Tambah Pembayaran", "new-payment", "", "primary"),
      body
    });
  }

  function renderSettingsModule(state) {
    const edgeCoverage = getEdgeCoverage(state);
    const body = [
      '<div class="grid gap-4 p-5 sm:p-6 md:grid-cols-3">',
      '<article class="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">',
      '<p class="text-sm font-semibold text-neutral-600">Endpoint API</p><p class="mt-2 break-all text-sm font-bold text-neutral-900">',
      html(window.PMD_API.getBaseUrl()),
      "</p></article>",
      '<article class="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">',
      '<p class="text-sm font-semibold text-neutral-600">Jumlah data runtime</p><p class="mt-2 text-sm font-bold text-neutral-900">',
      html(state.customers.length + " pelanggan, " + state.serviceOrders.length + " service, " + state.parts.length + " sparepart"),
      "</p></article>",
      '<article class="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">',
      '<p class="text-sm font-semibold text-neutral-600">Mode</p><p class="mt-2 text-sm font-bold text-neutral-900">REST API + MySQL</p></article>',
      "</div>",
      renderEdgeCoverage(edgeCoverage),
      '<div class="border-t border-neutral-200 p-5 sm:p-6">',
      '<p class="max-w-3xl text-sm leading-6 text-neutral-600">Muat ulang mengambil state terbaru langsung dari backend tanpa mengubah data.</p>',
      '<div class="mt-4 flex flex-wrap gap-3">',
      actionButton("Muat Ulang Data", "reset-data", "", "primary"),
      '<a class="inline-flex min-h-10 items-center justify-center rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-900 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500" href="tracking.html?resi=PMD-20260714-0001">Tes Tracking</a>',
      "</div></div>"
    ].join("");

    return renderModuleShell({
      id: "pengaturan",
      eyebrow: "Koneksi sistem",
      title: "Pengaturan",
      description: "Informasi endpoint, data runtime, dan pemeriksaan cakupan data API.",
      body
    });
  }

  function hasLongServiceText(service) {
    return [service.complaint, service.initialCondition, service.safeDiagnosis].some(function (text) {
      return String(text || "").length >= 120;
    });
  }

  function getEdgeCoverage(state) {
    const statusCounts = config.serviceStatuses.reduce(function (counts, status) {
      counts[status.key] = state.serviceOrders.filter(function (service) {
        return service.status === status.key;
      }).length;
      return counts;
    }, {});
    const moduleCounts = [
      { label: "Pelanggan", count: state.customers.length },
      { label: "Teknisi", count: state.technicians.length },
      { label: "Jenis kerusakan", count: state.damageTypes.length },
      { label: "Sparepart", count: state.parts.length },
      { label: "Service", count: state.serviceOrders.length },
      { label: "Timeline", count: state.timelines.length },
      { label: "Pembayaran", count: state.payments.length }
    ];
    const serviceIds = state.serviceOrders.map(function (service) {
      return service.id;
    });
    const longContent = state.serviceOrders.find(hasLongServiceText);
    const noImei = state.serviceOrders.find(function (service) {
      return !String(service.device && service.device.imei ? service.device.imei : "").trim();
    });
    const unassigned = state.serviceOrders.find(function (service) {
      return !service.technicianId;
    });
    const waitingPart = state.serviceOrders.find(function (service) {
      return service.status === "MENUNGGU_SPAREPART";
    });
    const pickedUp = state.serviceOrders.find(function (service) {
      return service.status === "DIAMBIL";
    });
    const noPartService = state.serviceOrders.find(function (service) {
      return !(service.partUsages || []).length && !(service.plannedParts || []).length;
    });
    const highPriority = state.serviceOrders.find(function (service) {
      return service.priority === "Tinggi";
    });
    const outOfStock = state.parts.find(function (part) {
      return part.stock <= 0;
    });
    const dpPayment = state.payments.find(function (payment) {
      return payment.status === "DP";
    });

    return [
      {
        label: "Semua modul memiliki data",
        passed: moduleCounts.every(function (item) {
          return item.count > 0;
        }),
        detail: moduleCounts
          .map(function (item) {
            return item.label + ": " + item.count;
          })
          .join(", ")
      },
      {
        label: "Status canonical terwakili",
        passed: config.serviceStatuses.every(function (status) {
          return statusCounts[status.key] > 0;
        }),
        detail: config.serviceStatuses
          .map(function (status) {
            return status.label + ": " + statusCounts[status.key];
          })
          .join(", ")
      },
      {
        label: "Relasi timeline dan pembayaran valid",
        passed:
          state.timelines.every(function (entry) {
            return serviceIds.includes(entry.serviceId);
          }) &&
          state.payments.every(function (payment) {
            return serviceIds.includes(payment.serviceId);
          }),
        detail: state.timelines.length + " timeline, " + state.payments.length + " pembayaran"
      },
      {
        label: "Tiket tanpa IMEI",
        passed: Boolean(noImei),
        detail: noImei ? noImei.receipt : "Belum tersedia"
      },
      {
        label: "Tiket belum assigned",
        passed: Boolean(unassigned),
        detail: unassigned ? unassigned.receipt : "Belum tersedia"
      },
      {
        label: "Stok sparepart habis",
        passed: Boolean(outOfStock),
        detail: outOfStock ? outOfStock.sku + " - " + outOfStock.name : "Belum tersedia"
      },
      {
        label: "Pembayaran DP",
        passed: Boolean(dpPayment),
        detail: dpPayment ? dpPayment.id + " untuk " + dpPayment.serviceId : "Belum tersedia"
      },
      {
        label: "Tiket tanpa sparepart",
        passed: Boolean(noPartService),
        detail: noPartService ? noPartService.receipt : "Belum tersedia"
      },
      {
        label: "Prioritas tinggi",
        passed: Boolean(highPriority),
        detail: highPriority ? highPriority.receipt : "Belum tersedia"
      },
      {
        label: "Menunggu sparepart",
        passed: Boolean(waitingPart),
        detail: waitingPart ? waitingPart.receipt : "Belum tersedia"
      },
      {
        label: "Tiket sudah diambil",
        passed: Boolean(pickedUp),
        detail: pickedUp ? pickedUp.receipt : "Belum tersedia"
      },
      {
        label: "Long content",
        passed: Boolean(longContent),
        detail: longContent ? longContent.receipt : "Belum tersedia"
      },
      {
        label: "Refresh API tersedia",
        passed: typeof store.refresh === "function",
        detail: "Dashboard dapat mengambil ulang state backend"
      }
    ];
  }

  function renderEdgeCoverage(items) {
    return [
      '<section class="border-t border-neutral-200 p-5 sm:p-6" aria-labelledby="edge-coverage-heading">',
      '<div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">',
      '<div><h3 id="edge-coverage-heading" class="text-base font-black text-neutral-900">Coverage data API</h3>',
      '<p class="mt-1 text-sm leading-6 text-neutral-600">Checklist ini memeriksa variasi data operasional yang diterima dari backend.</p></div>',
      '<span class="inline-flex min-h-7 w-fit items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">',
      html(items.filter(function (item) {
        return item.passed;
      }).length),
      " / ",
      html(items.length),
      " terpenuhi</span></div>",
      '<div class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">',
      items
        .map(function (item) {
          const tone = item.passed
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-red-200 bg-red-50 text-red-700";
          return [
            '<article class="rounded-2xl border border-neutral-200 bg-white p-5">',
            '<div class="flex items-start justify-between gap-3">',
            '<p class="text-sm font-bold text-neutral-900">',
            html(item.label),
            "</p>",
            '<span class="inline-flex min-h-7 shrink-0 items-center rounded-full border px-3 py-1 text-xs font-bold ',
            tone,
            '">',
            html(item.passed ? "PASS" : "CEK"),
            "</span></div>",
            '<p class="mt-3 text-xs leading-5 text-neutral-600">',
            html(item.detail),
            "</p></article>"
          ].join("");
        })
        .join(""),
      "</div></section>"
    ].join("");
  }

  function renderDashboard(state) {
    const metrics = getDashboardMetrics(state);

    return [
      '<section id="dashboard" class="flex scroll-mt-24 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" aria-labelledby="dashboard-heading">',
      '<div><p class="text-sm font-semibold text-primary-600">Operasional admin</p>',
      '<h2 id="dashboard-heading" class="mt-2 text-3xl font-black text-neutral-900">Ringkasan service Papuans Manado</h2>',
      '<p class="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">Angka dashboard dihitung dari data API dan mengikuti status canonical service.</p></div>',
      '<div class="flex flex-wrap gap-2">',
      actionButton("Tambah Service", "new-service", "", "primary"),
      actionButton("Muat Ulang", "reset-data", "", "secondary"),
      "</div></section>",
      renderKpiGrid(state, metrics),
      renderActionPanel(state, metrics)
    ].join("");
  }

  function getActiveView(state) {
    const activeId = getActiveMenuId();
    const views = {
      dashboard: {
        title: "Dashboard",
        subtitle: "Ringkasan operasional dan pekerjaan yang perlu ditindaklanjuti.",
        render: renderDashboard
      },
      service: {
        title: "Service Masuk",
        subtitle: "Kelola tiket, assignment teknisi, status, dan detail perangkat.",
        render: renderServiceModule
      },
      customers: {
        title: "Pelanggan",
        subtitle: "Kelola profil pelanggan dan riwayat service.",
        render: renderCustomerModule
      },
      devices: {
        title: "Perangkat",
        subtitle: "Lihat perangkat pelanggan dan keterkaitannya dengan tiket.",
        render: renderDeviceModule
      },
      damages: {
        title: "Jenis Kerusakan",
        subtitle: "Kelola master kategori kerusakan dan estimasi awal.",
        render: renderDamageModule
      },
      technicians: {
        title: "Teknisi",
        subtitle: "Pantau profil, keahlian, ketersediaan, dan assignment.",
        render: renderTechnicianModule
      },
      parts: {
        title: "Sparepart",
        subtitle: "Kelola komponen perbaikan, stok, dan riwayat pemakaian.",
        render: renderPartModule
      },
      payments: {
        title: "Pembayaran",
        subtitle: "Catat pembayaran tunai atau transfer manual.",
        render: renderPaymentModule
      },
      reports: {
        title: "Laporan",
        subtitle: "Tinjau ringkasan operasional berdasarkan periode.",
        render: renderReportsModule
      },
      settings: {
        title: "Pengaturan",
        subtitle: "Kelola simulasi frontend dan coverage data demo.",
        render: renderSettingsModule
      }
    };

    const view = views[activeId] || views.dashboard;
    return {
      id: views[activeId] ? activeId : "dashboard",
      title: view.title,
      subtitle: view.subtitle,
      content: view.render(state)
    };
  }

  function renderApp() {
    const state = store.getState();
    const active = getActiveView(state);
    const content = '<div class="admin-content-view space-y-6">' + active.content + "</div>";

    components.initAppShell({
      role: "admin",
      active: active.id,
      title: active.title,
      subtitle: active.subtitle,
      content
    });
    syncActiveMenu();
    enhanceAdminTables();
  }

  function getActiveMenuId() {
    const hash = String(window.location.hash || "#dashboard");
    const match = config.menus.admin.find(function (item) {
      return item.href.endsWith(hash);
    });
    return match ? match.id : "dashboard";
  }

  function syncActiveMenu() {
    const activeId = getActiveMenuId();
    document.querySelectorAll("aside nav a").forEach(function (link) {
      const href = link.getAttribute("href") || "";
      const item = config.menus.admin.find(function (menuItem) {
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

  function updateFilterValues(module, form) {
    const data = new FormData(form);
    if (module === "service") {
      filters.serviceSearch = data.get("serviceSearch") || "";
      filters.serviceStatus = data.get("serviceStatus") || "ALL";
      filters.serviceTechnician = data.get("serviceTechnician") || "ALL";
      filters.serviceFrom = data.get("serviceFrom") || "";
      filters.serviceTo = data.get("serviceTo") || "";
    }
    if (module === "customer") {
      filters.customerSearch = data.get("customerSearch") || "";
    }
    if (module === "device") {
      filters.deviceSearch = data.get("deviceSearch") || "";
    }
    if (module === "damage") {
      filters.damageSearch = data.get("damageSearch") || "";
      filters.damageActive = data.get("damageActive") || "ALL";
    }
    if (module === "technician") {
      filters.technicianSearch = data.get("technicianSearch") || "";
      filters.technicianAvailability = data.get("technicianAvailability") || "ALL";
    }
    if (module === "part") {
      filters.partSearch = data.get("partSearch") || "";
      filters.partStock = data.get("partStock") || "ALL";
    }
    if (module === "payment") {
      filters.paymentSearch = data.get("paymentSearch") || "";
      filters.paymentStatus = data.get("paymentStatus") || "ALL";
    }
    if (module === "report") {
      filters.reportPreset = data.get("reportPreset") || "monthly";
      filters.reportFrom = data.get("reportFrom") || "";
      filters.reportTo = data.get("reportTo") || "";
    }
  }

  function resetFilters(module) {
    if (module === "report") {
      filters.reportPreset = "monthly";
      filters.reportFrom = "";
      filters.reportTo = "";
      return;
    }

    Object.keys(filters).forEach(function (key) {
      if (key.toLowerCase().startsWith(module)) {
        filters[key] = key.endsWith("Status") || key.endsWith("Technician") || key.endsWith("Active") || key.endsWith("Availability") || key.endsWith("Stock") ? "ALL" : "";
      }
    });
  }

  function bindEvents() {
    if (eventsBound) {
      return;
    }

    eventsBound = true;
    document.addEventListener("submit", function (event) {
      const form = event.target.closest("[data-filter-form]");
      if (!form) {
        return;
      }

      event.preventDefault();
      updateFilterValues(form.getAttribute("data-filter-form"), form);
      renderApp();
    });
    document.addEventListener("click", handleClick);
    document.addEventListener("change", handleChange);
  }

  function handleClick(event) {
    const clear = event.target.closest("[data-clear-filters]");
    if (clear) {
      resetFilters(clear.getAttribute("data-clear-filters"));
      renderApp();
      return;
    }

    const action = event.target.closest("[data-action]");
    if (!action) {
      return;
    }

    const actionName = action.getAttribute("data-action");
    const id = action.getAttribute("data-id") || "";
    const actions = {
      "new-service": function () {
        openServiceForm("");
      },
      "edit-service": function () {
        openServiceForm(id);
      },
      "detail-service": function () {
        openServiceDetail(id);
      },
      "delete-service": function () {
        deleteService(id);
      },
      "use-part": function () {
        openPartUsageForm(id);
      },
      "new-customer": function () {
        openCustomerForm("");
      },
      "edit-customer": function () {
        openCustomerForm(id);
      },
      "detail-customer": function () {
        openCustomerDetail(id);
      },
      "delete-customer": function () {
        deleteCustomer(id);
      },
      "edit-device": function () {
        openDeviceForm(id);
      },
      "detail-device": function () {
        openDeviceDetail(id);
      },
      "delete-device": function () {
        showError("Perangkat melekat pada tiket service. Hapus tiket service jika data perangkat benar-benar harus dihapus.");
      },
      "new-damage": function () {
        openDamageForm("");
      },
      "edit-damage": function () {
        openDamageForm(id);
      },
      "detail-damage": function () {
        openDamageDetail(id);
      },
      "delete-damage": function () {
        deleteDamage(id);
      },
      "new-technician": function () {
        openTechnicianForm("");
      },
      "edit-technician": function () {
        openTechnicianForm(id);
      },
      "detail-technician": function () {
        openTechnicianDetail(id);
      },
      "delete-technician": function () {
        deleteTechnician(id);
      },
      "new-part": function () {
        openPartForm("");
      },
      "edit-part": function () {
        openPartForm(id);
      },
      "detail-part": function () {
        openPartDetail(id);
      },
      "delete-part": function () {
        deletePart(id);
      },
      "new-payment": function () {
        openPaymentForm("");
      },
      "edit-payment": function () {
        openPaymentForm(id);
      },
      "detail-payment": function () {
        openPaymentDetail(id);
      },
      "delete-payment": function () {
        deletePayment(id);
      },
      "print-report": printReport,
      "export-report": exportReportCsv,
      "reset-data": resetData
    };

    if (actions[actionName]) {
      actions[actionName]();
    }
  }

  async function handleChange(event) {
    const assign = event.target.closest("[data-service-technician]");
    if (!assign) {
      return;
    }

    const serviceId = assign.getAttribute("data-service-technician");
    const technicianId = assign.value || null;
    assign.disabled = true;
    try {
      await store.assignTechnician(serviceId, technicianId);
      showSuccess("Assignment teknisi diperbarui melalui API.");
    } catch (error) {
      showError(error.message || "Assignment teknisi gagal diperbarui.");
      renderApp();
    } finally {
      assign.disabled = false;
    }
  }

  function openServiceForm(id) {
    const state = store.getState();
    const service = state.serviceOrders.find(function (item) {
      return item.id === id;
    });
    const isEdit = Boolean(service);
    const body = [
      '<div class="grid gap-4 md:grid-cols-2">',
      selectField("Pelanggan", "customerId", customerOptions(state, service ? service.customerId : ""), { required: true }),
      selectField("Jenis Kerusakan", "damageTypeId", damageOptions(state, service ? service.damageTypeId : ""), { required: true }),
      inputField("Merk", "brand", service ? service.device.brand : "", { required: true }),
      inputField("Tipe", "model", service ? service.device.model : "", { required: true }),
      inputField("Warna", "color", service ? service.device.color : ""),
      inputField("IMEI opsional", "imei", service ? service.device.imei : "", { helper: "Boleh dikosongkan. IMEI bukan identifier utama frontend." }),
      selectField("Teknisi", "technicianId", technicianOptions(state, service ? service.technicianId || "" : "", false, true)),
      selectField("Prioritas", "priority", option("Normal", "Normal", service ? service.priority : "Normal") + option("Tinggi", "Tinggi", service ? service.priority : "Normal")),
      selectField("Status", "status", workflowStatusOptions(service ? service.status : null), { required: true }),
      inputField("Estimasi biaya", "estimatedCost", service && service.estimatedCost ? service.estimatedCost : "", { type: "number", min: "0", helper: "Rupiah tanpa desimal." }),
      inputField("Estimasi selesai", "estimatedDoneAt", service && service.estimatedDoneAt ? toDateKey(service.estimatedDoneAt) : "", { type: "date" }),
      "</div>",
      '<div class="mt-4 grid gap-4 md:grid-cols-2">',
      textareaField("Keluhan", "complaint", service ? service.complaint : "", { required: true }),
      textareaField("Kondisi fisik awal", "initialCondition", service ? service.initialCondition : ""),
      textareaField("Diagnosis aman", "safeDiagnosis", service ? service.safeDiagnosis : ""),
      textareaField("Catatan admin internal", "internalNote", service ? service.internalNote : ""),
      "</div>"
    ].join("");

    openModal({
      title: isEdit ? "Edit Service" : "Tambah Service",
      description: isEdit ? "Perubahan status mengikuti alur canonical API dan menambah timeline." : "Resi dan ID dibuat otomatis oleh API.",
      body,
      confirmText: isEdit ? "Simpan Service" : "Buat Service",
      onSubmit: async function (data, form) {
        const customerId = String(data.get("customerId") || "");
        const damageTypeId = String(data.get("damageTypeId") || "");
        const brand = String(data.get("brand") || "").trim();
        const model = String(data.get("model") || "").trim();
        const complaint = String(data.get("complaint") || "").trim();
        const status = String(data.get("status") || "DITERIMA");

        if (!customerId || !damageTypeId || !brand || !model || !complaint) {
          setFormError(form, "Pelanggan, jenis kerusakan, merk, tipe, dan keluhan wajib diisi.");
          return false;
        }

        await store.saveService(id || null, {
          customerId,
          damageTypeId,
          technicianId: data.get("technicianId") || null,
          status,
          priority: data.get("priority") || "Normal",
          estimatedCost: data.get("estimatedCost") ? toNumber(data.get("estimatedCost")) : null,
          estimatedDoneAt: data.get("estimatedDoneAt") ? data.get("estimatedDoneAt") + "T17:00:00" : null,
          receivedAt: service ? service.receivedAt : new Date().toISOString(),
          complaint,
          initialCondition: String(data.get("initialCondition") || "").trim(),
          safeDiagnosis: String(data.get("safeDiagnosis") || "Menunggu pemeriksaan awal.").trim(),
          internalNote: String(data.get("internalNote") || "").trim(),
          device: {
            brand,
            model,
            color: String(data.get("color") || "").trim(),
            imei: String(data.get("imei") || "").trim()
          }
        });
        showSuccess(isEdit ? "Service diperbarui melalui API." : "Service baru dibuat melalui API.");
        return true;
      }
    });
  }

  function openServiceDetail(id) {
    const state = store.getState();
    const service = state.serviceOrders.find(function (item) {
      return item.id === id;
    });
    if (!service) {
      showError("Service tidak ditemukan.");
      return;
    }
    const payment = getPaymentForService(state, service.id);
    const timeline = state.timelines
      .filter(function (entry) {
        return entry.serviceId === service.id;
      })
      .sort(function (first, second) {
        return new Date(first.at) - new Date(second.at);
      });
    const body = [
      '<div class="grid gap-4 md:grid-cols-2">',
      '<article class="rounded-2xl border border-neutral-200 p-5"><p class="text-xs font-bold text-neutral-500">Pelanggan</p><p class="mt-2 font-bold text-neutral-900">',
      html(getCustomerName(state, service.customerId)),
      '</p><p class="mt-1 text-sm text-neutral-600">',
      html(getDeviceName(service)),
      " - ",
      html(service.device.color || "-"),
      "</p></article>",
      '<article class="rounded-2xl border border-neutral-200 p-5"><p class="text-xs font-bold text-neutral-500">Status dan biaya</p><div class="mt-2">',
      components.statusBadge(service.status),
      '</div><p class="mt-2 text-sm text-neutral-600">',
      html(components.formatRupiah(service.finalCost || service.estimatedCost || 0)),
      " - ",
      html(payment ? payment.status : "Belum dibayar"),
      "</p></article>",
      "</div>",
      '<div class="mt-4 grid gap-4 md:grid-cols-2">',
      '<article class="rounded-2xl border border-neutral-200 p-5"><p class="text-xs font-bold text-neutral-500">Keluhan</p><p class="mt-2 text-sm leading-6 text-neutral-700">',
      html(service.complaint),
      '</p><p class="mt-3 text-xs font-bold text-neutral-500">Diagnosis aman</p><p class="mt-2 text-sm leading-6 text-neutral-700">',
      html(service.safeDiagnosis || "-"),
      "</p></article>",
      '<article class="rounded-2xl border border-neutral-200 p-5"><p class="text-xs font-bold text-neutral-500">Sparepart</p><p class="mt-2 text-sm leading-6 text-neutral-700">',
      html(getPartUsageSummary(state, service)),
      '</p><p class="mt-3 text-xs font-bold text-neutral-500">Catatan internal</p><p class="mt-2 text-sm leading-6 text-neutral-700">',
      html(service.internalNote || "-"),
      "</p></article>",
      "</div>",
      '<div class="mt-4 rounded-2xl border border-neutral-200 p-5"><p class="text-xs font-bold text-neutral-500">Timeline</p><ul class="mt-3 space-y-3">',
      timeline
        .map(function (entry) {
          return [
            '<li class="rounded-xl bg-neutral-50 p-3 text-sm leading-6"><span class="font-bold text-neutral-900">',
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
      "</ul></div>"
    ].join("");
    openInfoModal("Detail Service " + service.receipt, "Informasi internal admin, termasuk catatan dan relasi pembayaran.", body);
  }

  function deleteService(id) {
    const state = store.getState();
    const service = state.serviceOrders.find(function (item) {
      return item.id === id;
    });
    if (!service) {
      showError("Service tidak ditemukan.");
      return;
    }

    components.confirmAction({
      title: "Hapus service?",
      message: "Tiket " + service.receipt + " beserta timeline, pemakaian sparepart, dan pembayaran terkait akan dihapus dari database.",
      confirmText: "Hapus",
      variant: "danger",
      onConfirm: async function () {
        await store.deleteService(id);
        showSuccess("Service dihapus dari database.");
      }
    });
  }

  function openPartUsageForm(serviceId) {
    const state = store.getState();
    const service = state.serviceOrders.find(function (item) {
      return item.id === serviceId;
    });
    const body = [
      '<div class="grid gap-4 md:grid-cols-2">',
      selectField("Service", "serviceId", serviceOptions(state, service ? service.id : ""), { required: true }),
      selectField("Sparepart", "partId", partOptions(state, ""), { required: true }),
      inputField("Jumlah", "qty", "1", { type: "number", min: "1", required: true }),
      inputField("Catatan", "note", "", { placeholder: "Contoh: penggantian komponen utama" }),
      "</div>"
    ].join("");

    openModal({
      title: "Catat Pemakaian Sparepart",
      description: "Stok akan berkurang sesuai jumlah yang dipakai.",
      body,
      confirmText: "Catat Pemakaian",
      onSubmit: async function (data, form) {
        const selectedServiceId = String(data.get("serviceId") || "");
        const partId = String(data.get("partId") || "");
        const qty = toPositiveInt(data.get("qty"));
        if (!selectedServiceId || !partId || qty < 1) {
          setFormError(form, "Service, sparepart, dan jumlah wajib valid.");
          return false;
        }

        const currentPart = state.parts.find(function (part) {
          return part.id === partId;
        });
        if (!currentPart || currentPart.stock < qty) {
          setFormError(form, "Stok sparepart tidak cukup. Stok tersedia: " + (currentPart ? currentPart.stock : 0) + ".");
          return false;
        }

        await store.recordPartUsage(
          selectedServiceId,
          partId,
          qty,
          String(data.get("note") || "").trim()
        );
        showSuccess("Pemakaian sparepart dicatat dan stok API diperbarui.");
        return true;
      }
    });
  }

  function openCustomerForm(id) {
    const state = store.getState();
    const customer = getCustomer(state, id);
    const body = [
      '<div class="grid gap-4 md:grid-cols-2">',
      inputField("Nama", "name", customer ? customer.name : "", { required: true }),
      inputField("WhatsApp", "whatsapp", customer ? customer.whatsapp : "", {
        required: true,
        helper: "Gunakan nomor Indonesia, contoh 081234567890."
      }),
      inputField("Alamat", "address", customer ? customer.address : "", { required: true }),
      "</div>"
    ].join("");

    openModal({
      title: customer ? "Edit Pelanggan" : "Tambah Pelanggan",
      description: "Data pelanggan dipakai sebagai relasi tiket service.",
      body,
      confirmText: "Simpan Pelanggan",
      onSubmit: async function (data, form) {
        const name = String(data.get("name") || "").trim();
        const whatsapp = String(data.get("whatsapp") || "").trim();
        const address = String(data.get("address") || "").trim();
        if (!name || !/^08\d{8,13}$/.test(whatsapp) || !address) {
          setFormError(form, "Nama, nomor WhatsApp valid, dan alamat wajib diisi.");
          return false;
        }
        await store.saveCustomer(id || null, { name, whatsapp, address });
        showSuccess("Pelanggan disimpan melalui API.");
        return true;
      }
    });
  }

  function openCustomerDetail(id) {
    const state = store.getState();
    const customer = getCustomer(state, id);
    if (!customer) {
      showError("Pelanggan tidak ditemukan.");
      return;
    }
    const history = state.serviceOrders.filter(function (service) {
      return service.customerId === id;
    });
    openInfoModal(
      "Detail Pelanggan",
      customer.name,
      [
        '<div class="grid gap-4 md:grid-cols-2">',
        '<article class="rounded-2xl border border-neutral-200 p-5"><p class="text-xs font-bold text-neutral-500">Kontak</p><p class="mt-2 font-bold text-neutral-900">',
        html(customer.whatsapp),
        '</p><p class="mt-1 text-sm text-neutral-600">',
        html(customer.address),
        "</p></article>",
        '<article class="rounded-2xl border border-neutral-200 p-5"><p class="text-xs font-bold text-neutral-500">Riwayat service</p><p class="mt-2 text-3xl font-black text-neutral-900">',
        html(history.length),
        "</p></article>",
        "</div>",
        '<ul class="mt-4 space-y-2">',
        history
          .map(function (service) {
            return '<li class="rounded-xl bg-neutral-50 p-3 text-sm">' + html(service.receipt + " - " + getDeviceName(service) + " - " + getStatusLabel(service.status)) + "</li>";
          })
          .join("") || '<li class="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-500">Belum ada riwayat.</li>',
        "</ul>"
      ].join("")
    );
  }

  function deleteCustomer(id) {
    const state = store.getState();
    const customer = getCustomer(state, id);
    const used = state.serviceOrders.some(function (service) {
      return service.customerId === id;
    });
    if (!customer) {
      showError("Pelanggan tidak ditemukan.");
      return;
    }
    if (used) {
      showError("Pelanggan masih memiliki tiket service. Hapus atau ubah service terkait lebih dulu.");
      return;
    }
    components.confirmAction({
      title: "Hapus pelanggan?",
      message: "Data pelanggan " + customer.name + " akan dihapus dari database.",
      confirmText: "Hapus",
      variant: "danger",
      onConfirm: async function () {
        await store.deleteCustomer(id);
        showSuccess("Pelanggan dihapus dari database.");
      }
    });
  }

  function openDeviceForm(serviceId) {
    const state = store.getState();
    const service = state.serviceOrders.find(function (item) {
      return item.id === serviceId;
    });
    if (!service) {
      showError("Perangkat tidak ditemukan.");
      return;
    }
    const body = [
      '<div class="grid gap-4 md:grid-cols-2">',
      inputField("Merk", "brand", service.device.brand, { required: true }),
      inputField("Tipe", "model", service.device.model, { required: true }),
      inputField("Warna", "color", service.device.color || ""),
      inputField("IMEI opsional", "imei", service.device.imei || "", { helper: "IMEI boleh kosong." }),
      "</div>"
    ].join("");

    openModal({
      title: "Edit Perangkat",
      description: service.receipt + " - " + getCustomerName(state, service.customerId),
      body,
      confirmText: "Simpan Perangkat",
      onSubmit: async function (data, form) {
        const brand = String(data.get("brand") || "").trim();
        const model = String(data.get("model") || "").trim();
        if (!brand || !model) {
          setFormError(form, "Merk dan tipe perangkat wajib diisi.");
          return false;
        }
        await store.saveDevice(serviceId, {
          brand,
          model,
          color: String(data.get("color") || "").trim(),
          imei: String(data.get("imei") || "").trim()
        });
        showSuccess("Perangkat diperbarui melalui API.");
        return true;
      }
    });
  }

  function openDeviceDetail(serviceId) {
    const state = store.getState();
    const service = state.serviceOrders.find(function (item) {
      return item.id === serviceId;
    });
    if (!service) {
      showError("Perangkat tidak ditemukan.");
      return;
    }
    openInfoModal(
      "Detail Perangkat",
      service.receipt,
      [
        '<div class="grid gap-4 md:grid-cols-2">',
        '<article class="rounded-2xl border border-neutral-200 p-5"><p class="text-xs font-bold text-neutral-500">Perangkat</p><p class="mt-2 font-bold text-neutral-900">',
        html(getDeviceName(service)),
        '</p><p class="mt-1 text-sm text-neutral-600">',
        html(service.device.color || "-"),
        "</p></article>",
        '<article class="rounded-2xl border border-neutral-200 p-5"><p class="text-xs font-bold text-neutral-500">Riwayat service</p><p class="mt-2 text-sm text-neutral-700">',
        html(service.complaint),
        "</p></article>",
        "</div>"
      ].join("")
    );
  }

  function openDamageForm(id) {
    const state = store.getState();
    const damage = getDamageType(state, id);
    const body = [
      '<div class="grid gap-4 md:grid-cols-2">',
      inputField("Nama", "name", damage ? damage.name : "", { required: true }),
      inputField("Estimasi durasi", "estimatedDuration", damage ? damage.estimatedDuration : "", { required: true, placeholder: "1-3 hari" }),
      inputField("Kisaran biaya", "priceRange", damage ? damage.priceRange : "", { required: true, placeholder: "Rp350.000-Rp2.500.000" }),
      checkboxField("Aktif", "active", damage ? damage.active : true, "Jenis aktif tampil di form service."),
      "</div>"
    ].join("");

    openModal({
      title: damage ? "Edit Jenis Kerusakan" : "Tambah Jenis Kerusakan",
      description: "Kategori kerusakan untuk form service.",
      body,
      confirmText: "Simpan Jenis",
      onSubmit: async function (data, form) {
        const name = String(data.get("name") || "").trim();
        const estimatedDuration = String(data.get("estimatedDuration") || "").trim();
        const priceRange = String(data.get("priceRange") || "").trim();
        if (!name || !estimatedDuration || !priceRange) {
          setFormError(form, "Nama, estimasi durasi, dan kisaran biaya wajib diisi.");
          return false;
        }
        await store.saveDamage(id || null, {
          name,
          estimatedDuration,
          priceRange,
          active: Boolean(data.get("active"))
        });
        showSuccess("Jenis kerusakan disimpan melalui API.");
        return true;
      }
    });
  }

  function openDamageDetail(id) {
    const state = store.getState();
    const damage = getDamageType(state, id);
    if (!damage) {
      showError("Jenis kerusakan tidak ditemukan.");
      return;
    }
    const used = state.serviceOrders.filter(function (service) {
      return service.damageTypeId === id;
    });
    openInfoModal(
      "Detail Jenis Kerusakan",
      damage.name,
      '<p class="text-sm leading-6 text-neutral-700">' +
        html(damage.estimatedDuration + " - " + damage.priceRange + " - " + (damage.active ? "Aktif" : "Nonaktif")) +
        '</p><p class="mt-4 text-sm font-bold text-neutral-900">Dipakai pada ' +
        html(used.length) +
        " service.</p>"
    );
  }

  function deleteDamage(id) {
    const state = store.getState();
    const damage = getDamageType(state, id);
    const used = state.serviceOrders.some(function (service) {
      return service.damageTypeId === id;
    });
    if (!damage) {
      showError("Jenis kerusakan tidak ditemukan.");
      return;
    }
    if (used) {
      showError("Jenis kerusakan masih dipakai service. Nonaktifkan saja bila tidak dipakai untuk tiket baru.");
      return;
    }
    components.confirmAction({
      title: "Hapus jenis kerusakan?",
      message: damage.name + " akan dihapus dari database.",
      confirmText: "Hapus",
      variant: "danger",
      onConfirm: async function () {
        await store.deleteDamage(id);
        showSuccess("Jenis kerusakan dihapus dari database.");
      }
    });
  }

  function openTechnicianForm(id) {
    const state = store.getState();
    const technician = getTechnician(state, id);
    const body = [
      '<div class="grid gap-4 md:grid-cols-2">',
      inputField("Nama", "name", technician ? technician.name : "", { required: true }),
      inputField("Keahlian", "skills", technician ? technician.skills.join(", ") : "", {
        required: true,
        helper: "Pisahkan dengan koma."
      }),
      selectField(
        "Status ketersediaan",
        "availability",
        option("Available", "Available", technician ? technician.availability : "Available") +
          option("Busy", "Busy", technician ? technician.availability : "Available"),
        { required: true }
      ),
      "</div>"
    ].join("");

    openModal({
      title: technician ? "Edit Teknisi" : "Tambah Teknisi",
      description: "Teknisi dapat dipilih untuk assignment service.",
      body,
      confirmText: "Simpan Teknisi",
      onSubmit: async function (data, form) {
        const name = String(data.get("name") || "").trim();
        const skills = String(data.get("skills") || "")
          .split(",")
          .map(function (skill) {
            return skill.trim();
          })
          .filter(Boolean);
        if (!name || !skills.length) {
          setFormError(form, "Nama dan minimal satu keahlian wajib diisi.");
          return false;
        }
        await store.saveTechnician(id || null, {
          name,
          skills,
          availability: data.get("availability") || "Available"
        });
        showSuccess("Teknisi dan keahliannya disimpan melalui API.");
        return true;
      }
    });
  }

  function openTechnicianDetail(id) {
    const state = store.getState();
    const technician = getTechnician(state, id);
    if (!technician) {
      showError("Teknisi tidak ditemukan.");
      return;
    }
    const stats = getTechnicianStats(state, id);
    const assignments = state.serviceOrders.filter(function (service) {
      return service.technicianId === id;
    });
    openInfoModal(
      "Detail Teknisi",
      technician.name,
      [
        '<div class="grid gap-4 md:grid-cols-3">',
        '<article class="rounded-2xl border border-neutral-200 p-5"><p class="text-xs font-bold text-neutral-500">Aktif</p><p class="mt-2 text-3xl font-black">',
        html(stats.active),
        "</p></article>",
        '<article class="rounded-2xl border border-neutral-200 p-5"><p class="text-xs font-bold text-neutral-500">Selesai</p><p class="mt-2 text-3xl font-black">',
        html(stats.completed),
        "</p></article>",
        '<article class="rounded-2xl border border-neutral-200 p-5"><p class="text-xs font-bold text-neutral-500">Keahlian</p><p class="mt-2 text-sm font-bold">',
        html(technician.skills.join(", ")),
        "</p></article>",
        "</div>",
        '<ul class="mt-4 space-y-2">',
        assignments
          .map(function (service) {
            return '<li class="rounded-xl bg-neutral-50 p-3 text-sm">' + html(service.receipt + " - " + getDeviceName(service) + " - " + getStatusLabel(service.status)) + "</li>";
          })
          .join("") || '<li class="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-500">Belum ada assignment.</li>',
        "</ul>"
      ].join("")
    );
  }

  function deleteTechnician(id) {
    const state = store.getState();
    const technician = getTechnician(state, id);
    const used = state.serviceOrders.some(function (service) {
      return service.technicianId === id;
    });
    if (!technician) {
      showError("Teknisi tidak ditemukan.");
      return;
    }
    if (used) {
      showError("Teknisi masih memiliki assignment. Kosongkan assignment service terkait sebelum menghapus.");
      return;
    }
    components.confirmAction({
      title: "Hapus teknisi?",
      message: technician.name + " akan dihapus dari database.",
      confirmText: "Hapus",
      variant: "danger",
      onConfirm: async function () {
        await store.deleteTechnician(id);
        showSuccess("Teknisi dihapus dari database.");
      }
    });
  }

  function openPartForm(id) {
    const state = store.getState();
    const part = getPart(state, id);
    const body = [
      '<div class="grid gap-4 md:grid-cols-2">',
      inputField("SKU", "sku", part ? part.sku : "", { required: true }),
      inputField("Nama", "name", part ? part.name : "", { required: true }),
      inputField("Stok", "stock", part ? part.stock : "0", { type: "number", min: "0", required: true }),
      inputField("Minimum stok", "minStock", part ? part.minStock : "1", { type: "number", min: "0", required: true }),
      inputField("Harga modal", "costPrice", part ? part.costPrice : "0", { type: "number", min: "0", required: true }),
      inputField("Harga penggunaan jasa", "servicePrice", part ? part.servicePrice : "0", { type: "number", min: "0", required: true }),
      "</div>"
    ].join("");

    openModal({
      title: part ? "Edit Sparepart" : "Tambah Sparepart",
      description: "Sparepart digunakan sebagai komponen perbaikan internal.",
      body,
      confirmText: "Simpan Sparepart",
      onSubmit: async function (data, form) {
        const sku = String(data.get("sku") || "").trim().toUpperCase();
        const name = String(data.get("name") || "").trim();
        const stock = Math.max(0, parseInt(data.get("stock"), 10) || 0);
        const minStock = Math.max(0, parseInt(data.get("minStock"), 10) || 0);
        const costPrice = toNumber(data.get("costPrice"));
        const servicePrice = toNumber(data.get("servicePrice"));
        if (!sku || !name || costPrice < 0 || servicePrice < costPrice) {
          setFormError(form, "SKU dan nama wajib diisi. Harga penggunaan tidak boleh di bawah harga modal.");
          return false;
        }
        await store.savePart(id || null, {
          sku,
          name,
          stock,
          minStock,
          costPrice,
          servicePrice
        });
        showSuccess("Sparepart disimpan melalui API.");
        return true;
      }
    });
  }

  function openPartDetail(id) {
    const state = store.getState();
    const part = getPart(state, id);
    if (!part) {
      showError("Sparepart tidak ditemukan.");
      return;
    }
    const usages = getPartUsageEntries(state).filter(function (entry) {
      return entry.part && entry.part.id === id;
    });
    openInfoModal(
      "Detail Sparepart",
      part.sku,
      [
        '<div class="grid gap-4 md:grid-cols-2">',
        '<article class="rounded-2xl border border-neutral-200 p-5"><p class="text-xs font-bold text-neutral-500">Stok</p><p class="mt-2 text-3xl font-black">',
        html(part.stock),
        '</p><p class="text-sm text-neutral-600">Minimum ',
        html(part.minStock),
        "</p></article>",
        '<article class="rounded-2xl border border-neutral-200 p-5"><p class="text-xs font-bold text-neutral-500">Harga</p><p class="mt-2 text-sm font-bold">',
        html(components.formatRupiah(part.costPrice) + " modal / " + components.formatRupiah(part.servicePrice) + " jasa"),
        "</p></article>",
        "</div>",
        '<ul class="mt-4 space-y-2">',
        usages
          .map(function (entry) {
            return '<li class="rounded-xl bg-neutral-50 p-3 text-sm">' + html(entry.service.receipt + " - x" + entry.qty) + "</li>";
          })
          .join("") || '<li class="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-500">Belum pernah dipakai.</li>',
        "</ul>"
      ].join("")
    );
  }

  function deletePart(id) {
    const state = store.getState();
    const part = getPart(state, id);
    const used = state.serviceOrders.some(function (service) {
      return (service.partUsages || []).some(function (usage) {
        return usage.partId === id;
      }) || (service.plannedParts || []).some(function (usage) {
        return usage.partId === id;
      });
    });
    if (!part) {
      showError("Sparepart tidak ditemukan.");
      return;
    }
    if (used) {
      showError("Sparepart masih dipakai atau direncanakan pada service. Relasi harus tetap valid.");
      return;
    }
    components.confirmAction({
      title: "Hapus sparepart?",
      message: part.sku + " akan dihapus dari database.",
      confirmText: "Hapus",
      variant: "danger",
      onConfirm: async function () {
        await store.deletePart(id);
        showSuccess("Sparepart dihapus dari database.");
      }
    });
  }

  function openPaymentForm(id) {
    const state = store.getState();
    const payment = state.payments.find(function (item) {
      return item.id === id;
    });
    const selectedService = payment ? payment.serviceId : "";
    const body = [
      '<div class="grid gap-4 md:grid-cols-2">',
      selectField("Service", "serviceId", serviceOptions(state, selectedService), { required: true }),
      selectField(
        "Metode",
        "method",
        option("Tunai", "Tunai", payment ? payment.method : "Tunai") +
          option("Transfer manual", "Transfer manual", payment ? payment.method : "Tunai"),
        { required: true }
      ),
      selectField(
        "Status pembayaran",
        "status",
        option("DP", "DP", payment ? payment.status : "DP") +
          option("Lunas", "Lunas", payment ? payment.status : "DP"),
        { required: true }
      ),
      inputField("Biaya jasa", "serviceFee", payment ? payment.serviceFee : "0", { type: "number", min: "0", required: true }),
      inputField("Biaya sparepart", "partsFee", payment ? payment.partsFee : "0", { type: "number", min: "0", required: true }),
      inputField("Diskon", "discount", payment ? payment.discount : "0", { type: "number", min: "0" }),
      inputField("Dibayar", "paid", payment ? payment.paid : "0", { type: "number", min: "0", required: true }),
      inputField("Nama file bukti", "proofFileName", payment ? payment.proofFileName : "", { helper: "Nama file referensi untuk arsip pembayaran." }),
      "</div>"
    ].join("");

    openModal({
      title: payment ? "Edit Pembayaran" : "Tambah Pembayaran",
      description: "Total dihitung dari biaya jasa + sparepart - diskon.",
      body,
      confirmText: "Simpan Pembayaran",
      onSubmit: async function (data, form) {
        const serviceId = String(data.get("serviceId") || "");
        const serviceFee = toNumber(data.get("serviceFee"));
        const partsFee = toNumber(data.get("partsFee"));
        const discount = toNumber(data.get("discount"));
        const paid = toNumber(data.get("paid"));
        const total = serviceFee + partsFee - discount;
        if (!serviceId || serviceFee < 0 || partsFee < 0 || discount < 0 || total < 0 || paid < 0) {
          setFormError(form, "Service dan komponen biaya wajib valid. Total tidak boleh negatif.");
          return false;
        }
        const duplicate = state.payments.find(function (item) {
          return item.serviceId === serviceId && item.id !== id;
        });
        if (duplicate) {
          setFormError(form, "Service ini sudah memiliki pembayaran. Edit pembayaran yang ada.");
          return false;
        }
        const status = String(data.get("status") || "DP");
        if (total <= 0) {
          setFormError(form, "Total pembayaran harus lebih dari nol.");
          return false;
        }
        if ((status === "Lunas" && paid !== total) || (status === "DP" && paid >= total)) {
          setFormError(
            form,
            status === "Lunas"
              ? "Status Lunas membutuhkan nominal dibayar sama dengan total."
              : "Status DP membutuhkan nominal dibayar lebih kecil dari total."
          );
          return false;
        }
        await store.savePayment(id || null, {
          serviceId,
          method: data.get("method") || "Tunai",
          status,
          serviceFee,
          partsFee,
          discount,
          paid,
          proofFileName: String(data.get("proofFileName") || "").trim()
        });
        showSuccess("Pembayaran disimpan melalui API. Total: " + components.formatRupiah(total) + ".");
        return true;
      }
    });
  }

  function openPaymentDetail(id) {
    const state = store.getState();
    const payment = state.payments.find(function (item) {
      return item.id === id;
    });
    if (!payment) {
      showError("Pembayaran tidak ditemukan.");
      return;
    }
    const service = state.serviceOrders.find(function (item) {
      return item.id === payment.serviceId;
    });
    const total = getPaymentTotal(payment);
    openInfoModal(
      "Detail Pembayaran",
      payment.id,
      [
        '<div class="grid gap-4 md:grid-cols-2">',
        '<article class="rounded-2xl border border-neutral-200 p-5"><p class="text-xs font-bold text-neutral-500">Service</p><p class="mt-2 font-bold text-neutral-900">',
        html(service ? service.receipt : "-"),
        '</p><p class="mt-1 text-sm text-neutral-600">',
        html(service ? getCustomerName(state, service.customerId) : "-"),
        "</p></article>",
        '<article class="rounded-2xl border border-neutral-200 p-5"><p class="text-xs font-bold text-neutral-500">Total</p><p class="mt-2 text-2xl font-black text-neutral-900">',
        html(components.formatRupiah(total)),
        '</p><p class="text-sm text-neutral-600">Dibayar ',
        html(components.formatRupiah(payment.paid)),
        "</p></article>",
        "</div>",
        '<p class="mt-4 text-sm leading-6 text-neutral-700">Metode: ',
        html(payment.method),
        " - Status: ",
        html(payment.status),
        " - Bukti: ",
        html(payment.proofFileName || "-"),
        "</p>"
      ].join("")
    );
  }

  function deletePayment(id) {
    const state = store.getState();
    const payment = state.payments.find(function (item) {
      return item.id === id;
    });
    if (!payment) {
      showError("Pembayaran tidak ditemukan.");
      return;
    }
    components.confirmAction({
      title: "Hapus pembayaran?",
      message: payment.id + " akan dihapus dari database.",
      confirmText: "Hapus",
      variant: "danger",
      onConfirm: async function () {
        await store.deletePayment(id);
        showSuccess("Pembayaran dihapus dari database.");
      }
    });
  }

  function resetData() {
    components.confirmAction({
      title: "Muat ulang data API?",
      message: "Dashboard akan mengambil ulang data terbaru dari backend.",
      confirmText: "Muat Ulang",
      variant: "primary",
      onConfirm: async function () {
        await store.refresh();
        showSuccess("Data terbaru berhasil dimuat dari API.");
      }
    });
  }

  components.onReady(async function () {
    const mount = document.getElementById("app");
    if (mount) {
      mount.innerHTML = components.loadingState({
        title: "Memuat dashboard",
        message: "Mengambil data operasional terbaru dari API.",
        label: "Memuat data API"
      });
    }
    bindEvents();
    window.addEventListener("hashchange", renderApp);
    try {
      await auth.validateSession("admin");
      await store.hydrate();
      renderApp();
      if (!unsubscribe) {
        unsubscribe = store.subscribe(renderApp);
      }
    } catch (error) {
      if (mount && mount.isConnected) {
        mount.innerHTML = components.emptyState({
          title: "Dashboard tidak dapat dimuat",
          message: error.message || "Periksa koneksi backend dan sesi login.",
          iconName: "alert",
          actionHtml:
            '<button type="button" class="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary-500 px-4 text-sm font-bold text-white" onclick="window.location.reload()">Coba Lagi</button>'
        });
      }
    }
  });
})();
