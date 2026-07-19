(function () {
  "use strict";

  const components = window.PMD_COMPONENTS;
  const config = window.PMD_CONFIG;
  const store = window.PMD_STORE;
  const receiptPattern = /^PMD-\d{8}-\d{4}$/;
  const notFoundDemoReceipt = "PMD-INVALID-0000";
  const loadingDelayMs = 350;
  let loadingTimer = null;

  function normalizeReceipt(value) {
    return String(value || "").trim().toUpperCase();
  }

  function html(value) {
    return components.escapeHtml(value);
  }

  function setSearchError(message) {
    const error = document.querySelector("[data-tracking-error]");
    const input = document.querySelector("[data-tracking-receipt-input]");

    if (!error || !input) {
      return;
    }

    error.textContent = message;
    error.classList.remove("hidden");
    input.setAttribute("aria-invalid", "true");
  }

  function clearSearchError() {
    const error = document.querySelector("[data-tracking-error]");
    const input = document.querySelector("[data-tracking-receipt-input]");

    if (!error || !input) {
      return;
    }

    error.textContent = "";
    error.classList.add("hidden");
    input.removeAttribute("aria-invalid");
  }

  function setReceiptInput(receipt) {
    const input = document.querySelector("[data-tracking-receipt-input]");
    if (input) {
      input.value = receipt || "";
    }
  }

  function getPaymentStatus(payment) {
    return payment ? payment.status : "Belum dibayar";
  }

  function isNotFoundDemo(receipt) {
    return receipt === notFoundDemoReceipt;
  }

  function getPaymentSummary(payment) {
    if (!payment) {
      return {
        status: "Belum dibayar",
        method: "Belum ada pembayaran",
        paid: "-",
        total: "-"
      };
    }

    const total = payment.serviceFee + payment.partsFee - payment.discount;
    return {
      status: payment.status,
      method: payment.method,
      paid: components.formatRupiah(payment.paid),
      total: components.formatRupiah(total)
    };
  }

  function getNextAction(service) {
    const actions = {
      DITERIMA: "Perangkat sudah diterima. Tim service akan melakukan pemeriksaan awal.",
      DIAGNOSA: "Perangkat sedang diperiksa oleh teknisi. Estimasi akan diperbarui bila diperlukan.",
      MENUNGGU_SPAREPART: "Sparepart sedang disiapkan. Estimasi selesai akan diperbarui setelah komponen tersedia.",
      PENGERJAAN: "Perbaikan sedang berjalan. Silakan pantau status ini secara berkala.",
      SIAP_DIAMBIL: "Perangkat siap diambil di lokasi Papuans Manado. Siapkan nomor resi saat datang.",
      SELESAI: "Administrasi service selesai. Hubungi service bila perlu konfirmasi pengambilan.",
      DIAMBIL: "Perangkat telah diambil pelanggan. Terima kasih sudah mempercayakan service kepada Papuans Manado."
    };

    return actions[service.status] || "Status service akan diperbarui oleh tim Papuans Manado.";
  }

  function getEstimatedCost(service) {
    if (typeof service.estimatedCost === "number") {
      return components.formatRupiah(service.estimatedCost);
    }

    return "Setelah diagnosis";
  }

  function getFinalCost(service) {
    if (typeof service.finalCost === "number") {
      return components.formatRupiah(service.finalCost);
    }

    return "Belum final";
  }

  function getTimelineStatusSet(timeline) {
    return new Set(
      timeline.map(function (entry) {
        return entry.status;
      })
    );
  }

  function renderProgress(service, timeline) {
    const currentIndex = config.serviceStatuses.findIndex(function (item) {
      return item.key === service.status;
    });
    const visited = getTimelineStatusSet(timeline);

    return [
      '<ol class="grid gap-3 lg:grid-cols-7" aria-label="Progress status service">',
      config.serviceStatuses
        .map(function (status, index) {
          const isActive = status.key === service.status;
          const isPast = index < currentIndex || visited.has(status.key);
          const markerClass = isActive
            ? "border-primary-500 bg-primary-500 text-white ring-4 ring-primary-500/20"
            : isPast
              ? "border-green-500 bg-green-500 text-white"
              : "border-neutral-200 bg-white text-neutral-500";
          const labelClass = isActive ? "text-primary-700" : isPast ? "text-neutral-900" : "text-neutral-500";

          return [
            '<li class="rounded-2xl border border-neutral-200 bg-white p-3">',
            '<div class="flex items-center gap-3 lg:flex-col lg:items-start">',
            '<span class="grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-black ',
            markerClass,
            '">',
            isPast && !isActive ? components.icon("check", "h-4 w-4") : String(index + 1),
            "</span>",
            '<div class="min-w-0">',
            '<p class="text-sm font-bold ',
            labelClass,
            '">',
            html(status.publicLabel),
            "</p>",
            '<p class="mt-1 hidden text-xs leading-5 text-neutral-500 lg:block">',
            html(isActive ? "Status saat ini" : status.description),
            "</p>",
            "</div></div></li>"
          ].join("");
        })
        .join(""),
      "</ol>"
    ].join("");
  }

  function renderTimeline(timeline) {
    if (!timeline.length) {
      return components.emptyState({
        title: "Timeline belum tersedia",
        message: "Update status akan muncul di sini setelah tim service mencatat progres.",
        iconName: "layout"
      });
    }

    return [
      '<ol class="space-y-4">',
      timeline
        .map(function (entry) {
          const meta = components.getStatusMeta(entry.status);
          return [
            '<li class="relative border-l-2 border-neutral-200 pl-5">',
            '<span class="absolute -left-[0.55rem] top-1 grid h-4 w-4 place-items-center rounded-full bg-primary-500 ring-4 ring-white"></span>',
            '<div class="rounded-2xl border border-neutral-200 bg-white p-4">',
            '<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">',
            '<div><p class="text-sm font-bold text-neutral-900">',
            html(meta.publicLabel),
            '</p><p class="mt-1 text-xs font-semibold text-neutral-500">',
            html(components.formatDateTime(entry.at)),
            " - ",
            html(entry.actor),
            "</p></div>",
            components.statusBadge(entry.status, { public: true }),
            "</div>",
            '<p class="mt-3 text-sm leading-6 text-neutral-600">',
            html(entry.note),
            "</p>",
            "</div></li>"
          ].join("");
        })
        .join(""),
      "</ol>"
    ].join("");
  }

  function renderInfoItem(label, value) {
    return [
      '<div class="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">',
      '<p class="text-xs font-semibold text-neutral-600">',
      html(label),
      '</p><p class="mt-1 text-sm font-bold text-neutral-900">',
      html(value || "-"),
      "</p></div>"
    ].join("");
  }

  function renderResult(service) {
    const customer = store.getCustomer(service.customerId) || {};
    const technician = store.getTechnician(service.technicianId) || null;
    const damageType = store.getDamageType(service.damageTypeId) || {};
    const timeline = store.getTimelineForService(service.id);
    const payment = store.getPaymentForService(service.id);
    const paymentSummary = getPaymentSummary(payment);
    const deviceName = [service.device.brand, service.device.model].filter(Boolean).join(" ");
    const currentStatus = components.getStatusMeta(service.status);

    return [
      '<article class="space-y-6">',
      '<section class="app-card overflow-hidden">',
      '<div class="border-b border-neutral-200 bg-white p-5 sm:p-6">',
      '<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">',
      '<div><p class="text-sm font-semibold text-primary-600">Nomor resi</p>',
      '<h2 class="mt-2 text-2xl font-black text-neutral-900 sm:text-3xl">',
      html(service.receipt),
      "</h2>",
      '<p class="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">',
      html(getNextAction(service)),
      "</p></div>",
      '<div class="flex flex-wrap gap-2">',
      components.statusBadge(service.status, { public: true }),
      '<span class="inline-flex min-h-7 items-center rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-neutral-700">',
      html(getPaymentStatus(payment)),
      "</span>",
      "</div></div></div>",
      '<div class="p-5 sm:p-6">',
      renderProgress(service, timeline),
      "</div></section>",
      '<section class="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">',
      '<div class="space-y-6">',
      '<section class="app-card p-5 sm:p-6">',
      '<h2 class="text-xl font-bold text-neutral-900">Detail perangkat</h2>',
      '<div class="mt-5 grid gap-3 sm:grid-cols-2">',
      renderInfoItem("Pelanggan", components.maskName(customer.name)),
      renderInfoItem("WhatsApp", components.maskWhatsApp(customer.whatsapp)),
      renderInfoItem("Perangkat", deviceName),
      renderInfoItem("Warna", service.device.color),
      renderInfoItem("IMEI", components.maskImei(service.device.imei)),
      renderInfoItem("Jenis kerusakan", damageType.name || "-"),
      "</div>",
      '<div class="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">',
      '<p class="text-xs font-semibold text-neutral-600">Keluhan awal</p>',
      '<p class="mt-2 text-sm leading-6 text-neutral-900">',
      html(service.complaint),
      "</p></div>",
      '<div class="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">',
      '<p class="text-xs font-semibold text-neutral-600">Ringkasan diagnosis</p>',
      '<p class="mt-2 text-sm leading-6 text-neutral-900">',
      html(service.safeDiagnosis || "Diagnosis aman belum tersedia."),
      "</p></div>",
      "</section>",
      '<section class="app-card p-5 sm:p-6">',
      '<h2 class="text-xl font-bold text-neutral-900">Timeline service</h2>',
      '<div class="mt-5">',
      renderTimeline(timeline),
      "</div></section>",
      "</div>",
      '<div class="space-y-6">',
      '<section class="app-card p-5 sm:p-6">',
      '<h2 class="text-xl font-bold text-neutral-900">Estimasi dan pembayaran</h2>',
      '<div class="mt-5 grid gap-3">',
      renderInfoItem("Estimasi biaya", getEstimatedCost(service)),
      renderInfoItem("Total final", getFinalCost(service)),
      renderInfoItem("Estimasi selesai", service.estimatedDoneAt ? components.formatDate(service.estimatedDoneAt) : "Belum tersedia"),
      renderInfoItem("Status pembayaran", paymentSummary.status),
      renderInfoItem("Metode", paymentSummary.method),
      renderInfoItem("Dibayar", paymentSummary.paid),
      renderInfoItem("Total tagihan tercatat", paymentSummary.total),
      renderInfoItem("Teknisi", technician ? technician.name : "Belum assigned"),
      "</div></section>",
      '<section class="app-card p-5 sm:p-6">',
      '<h2 class="text-xl font-bold text-neutral-900">Tindakan berikutnya</h2>',
      '<p class="mt-3 text-sm leading-6 text-neutral-600">',
      html(getNextAction(service)),
      "</p>",
      '<div class="mt-5 flex flex-col gap-3">',
      '<a class="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary-500 px-4 text-sm font-bold text-white hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500" href="',
      html(config.app.whatsappUrl),
      '" target="_blank" rel="noopener noreferrer">Hubungi Service</a>',
      '<a class="inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-900 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500" href="index.html#cek-status">Kembali</a>',
      '<button type="button" class="inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-900 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 no-print" data-print-tracking>Print Ringkas</button>',
      "</div></section>",
      "</div></section>",
      "</article>"
    ].join("");
  }

  function renderSearchState(mount) {
    mount.innerHTML = components.emptyState({
      title: "Masukkan nomor resi",
      message: "Gunakan nomor resi service untuk melihat status, timeline, estimasi biaya, dan informasi pengambilan.",
      iconName: "search",
      actionHtml:
        '<a class="inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-900 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500" href="index.html#cek-status">Kembali ke Landing</a>'
    });
  }

  function renderErrorState(mount, title, message) {
    mount.innerHTML = components.emptyState({
      title,
      message,
      iconName: "alert",
      actionHtml:
        '<a class="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary-500 px-4 text-sm font-bold text-white hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500" href="tracking.html">Coba Lagi</a>'
    });
  }

  function renderLoadingState(mount) {
    mount.innerHTML = components.loadingState({
      title: "Mencari nomor resi",
      message: "Sebentar, data service demo sedang disiapkan.",
      label: "Mencari data service"
    });
  }

  function withLoading(callback) {
    const mount = document.querySelector("[data-tracking-panel]");
    window.clearTimeout(loadingTimer);

    if (!mount) {
      callback();
      return;
    }

    renderLoadingState(mount);
    loadingTimer = window.setTimeout(callback, loadingDelayMs);
  }

  function renderFromReceipt(receipt) {
    const mount = document.querySelector("[data-tracking-panel]");
    if (!mount) {
      return;
    }

    if (!receipt) {
      renderSearchState(mount);
      return;
    }

    if (isNotFoundDemo(receipt)) {
      renderErrorState(
        mount,
        "Nomor resi tidak ditemukan",
        "Nomor resi tidak ditemukan. Periksa kembali penulisannya atau hubungi Papuans Manado."
      );
      setSearchError("Nomor resi tidak ditemukan. Periksa kembali penulisannya.");
      return;
    }

    if (!receiptPattern.test(receipt)) {
      renderErrorState(
        mount,
        "Format resi belum sesuai",
        "Gunakan format PMD-YYYYMMDD-0000. Periksa kembali nomor resi dari admin service."
      );
      setSearchError("Format nomor resi belum sesuai.");
      return;
    }

    const service = store.findServiceByReceipt(receipt);
    if (!service) {
      renderErrorState(
        mount,
        "Nomor resi tidak ditemukan",
        "Nomor resi tidak ditemukan. Periksa kembali penulisannya atau hubungi Papuans Manado."
      );
      setSearchError("Nomor resi tidak ditemukan. Periksa kembali penulisannya.");
      return;
    }

    clearSearchError();
    mount.innerHTML = renderResult(service);

    const printButton = mount.querySelector("[data-print-tracking]");
    if (printButton) {
      printButton.addEventListener("click", function () {
        window.print();
      });
    }
  }

  function initSearchForm() {
    const form = document.querySelector("[data-tracking-search-form]");
    if (!form) {
      return;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const input = form.querySelector("[data-tracking-receipt-input]");
      const receipt = normalizeReceipt(input ? input.value : "");

      setReceiptInput(receipt);
      clearSearchError();

      if (isNotFoundDemo(receipt)) {
        withLoading(function () {
          setSearchError("Nomor resi tidak ditemukan. Periksa kembali penulisannya.");
          renderFromReceipt(receipt);
        });
        return;
      }

      if (!receiptPattern.test(receipt)) {
        setSearchError("Format nomor resi belum sesuai. Gunakan contoh PMD-20260714-0001.");
        return;
      }

      if (!store.findServiceByReceipt(receipt)) {
        withLoading(function () {
          setSearchError("Nomor resi tidak ditemukan. Periksa kembali penulisannya.");
          renderFromReceipt(receipt);
        });
        return;
      }

      withLoading(function () {
        window.location.href = "tracking.html?resi=" + encodeURIComponent(receipt);
      });
    });
  }

  function initDemoReceipts() {
    document.querySelectorAll("[data-demo-receipt]").forEach(function (button) {
      button.addEventListener("click", function () {
        const receipt = normalizeReceipt(button.getAttribute("data-demo-receipt"));
        setReceiptInput(receipt);
        clearSearchError();
        withLoading(function () {
          renderFromReceipt(receipt);
        });
      });
    });
  }

  components.onReady(function () {
    components.initPublicNav("tracking");
    components.initPublicFooter();

    const params = new URLSearchParams(window.location.search);
    const receipt = normalizeReceipt(params.get("resi"));

    setReceiptInput(receipt);
    initSearchForm();
    initDemoReceipts();
    renderFromReceipt(receipt);
  });
})();
