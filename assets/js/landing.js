(function () {
  "use strict";

  const components = window.PMD_COMPONENTS;
  const config = window.PMD_CONFIG;
  const api = window.PMD_API;
  const receiptPattern = /^PMD-\d{8}-\d{4}$/;

  function normalizeReceipt(value) {
    return String(value || "").trim().toUpperCase();
  }

  function setError(message) {
    const error = document.querySelector("[data-receipt-error]");
    const input = document.querySelector("[data-receipt-input]");

    if (!error || !input) {
      return;
    }

    error.textContent = message;
    error.classList.remove("hidden");
    input.setAttribute("aria-invalid", "true");
    input.focus();
  }

  function clearError() {
    const error = document.querySelector("[data-receipt-error]");
    const input = document.querySelector("[data-receipt-input]");

    if (!error || !input) {
      return;
    }

    error.textContent = "";
    error.classList.add("hidden");
    input.removeAttribute("aria-invalid");
  }

  function redirectToTracking(receipt) {
    window.location.href = "tracking.html?resi=" + encodeURIComponent(receipt);
  }

  async function handleReceiptSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const input = form.querySelector("[data-receipt-input]");
    const button = form.querySelector("[data-tracking-submit]");
    const receipt = normalizeReceipt(input.value);

    input.value = receipt;
    clearError();

    if (!receiptPattern.test(receipt)) {
      setError("Format nomor resi belum sesuai. Gunakan contoh PMD-20260714-0001.");
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = "Memeriksa API...";
    }

    try {
      await api.tracking(receipt);
      redirectToTracking(receipt);
    } catch (error) {
      setError(
        error.status === 404
          ? "Nomor resi tidak ditemukan. Periksa kembali penulisannya."
          : error.message || "API tracking tidak dapat dihubungi."
      );
      if (button) {
        button.disabled = false;
        button.textContent = "Cek Status";
      }
    }
  }

  function renderStatusStrips() {
    const statusStrips = document.querySelectorAll("[data-status-strip]");
    statusStrips.forEach(function (statusStrip) {
      statusStrip.innerHTML = [
        '<ol class="status-rail">',
        config.serviceStatuses
          .map(function (status, index) {
            return [
              '<li class="status-node">',
              '<span class="status-node-index">',
              String(index + 1).padStart(2, "0"),
              "</span>",
              '<div><p class="status-node-label">',
              components.escapeHtml(status.publicLabel),
              '</p><p class="status-node-description">',
              components.escapeHtml(status.description),
              "</p></div>",
              "</li>"
            ].join("");
          })
          .join(""),
        "</ol>"
      ].join("");
    });
  }

  function initTestimonialSlider() {
    const slider = document.querySelector("[data-testimonial-slider]");
    if (!slider) {
      return;
    }

    const slides = Array.from(slider.querySelectorAll("[data-testimonial-slide]"));
    const previous = slider.querySelector("[data-testimonial-prev]");
    const next = slider.querySelector("[data-testimonial-next]");
    const dotsMount = slider.querySelector("[data-testimonial-dots]");
    const counter = slider.querySelector("[data-testimonial-counter]");
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let activeIndex = 0;
    let timer = null;
    let pointerInside = false;
    let focusWithin = false;

    if (!slides.length || !previous || !next || !dotsMount || !counter) {
      return;
    }

    dotsMount.innerHTML = slides
      .map(function (_, index) {
        return [
          '<button type="button" aria-label="Tampilkan testimoni ',
          String(index + 1),
          '" data-testimonial-dot="',
          String(index),
          '"></button>'
        ].join("");
      })
      .join("");

    const dots = Array.from(dotsMount.querySelectorAll("[data-testimonial-dot]"));

    function render(nextIndex) {
      activeIndex = (nextIndex + slides.length) % slides.length;
      slides.forEach(function (slide, index) {
        const active = index === activeIndex;
        slide.classList.toggle("hidden", !active);
        slide.setAttribute("aria-hidden", String(!active));
      });
      dots.forEach(function (dot, index) {
        const active = index === activeIndex;
        dot.classList.toggle("is-active", active);
        if (active) {
          dot.setAttribute("aria-current", "true");
        } else {
          dot.removeAttribute("aria-current");
        }
      });
      counter.textContent =
        String(activeIndex + 1).padStart(2, "0") +
        " / " +
        String(slides.length).padStart(2, "0");
    }

    function stopAutoplay() {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    function startAutoplay() {
      stopAutoplay();
      if (!reduceMotion && !pointerInside && !focusWithin && !document.hidden) {
        timer = window.setInterval(function () {
          render(activeIndex + 1);
        }, 7000);
      }
    }

    previous.addEventListener("click", function () {
      render(activeIndex - 1);
      startAutoplay();
    });
    next.addEventListener("click", function () {
      render(activeIndex + 1);
      startAutoplay();
    });
    dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        render(Number(dot.getAttribute("data-testimonial-dot")));
        startAutoplay();
      });
    });
    slider.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        render(activeIndex - 1);
        startAutoplay();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        render(activeIndex + 1);
        startAutoplay();
      }
    });
    slider.addEventListener("mouseenter", function () {
      pointerInside = true;
      stopAutoplay();
    });
    slider.addEventListener("mouseleave", function () {
      pointerInside = false;
      startAutoplay();
    });
    slider.addEventListener("focusin", function () {
      focusWithin = true;
      stopAutoplay();
    });
    slider.addEventListener("focusout", function () {
      focusWithin = false;
      startAutoplay();
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        stopAutoplay();
      } else {
        startAutoplay();
      }
    });

    render(0);
    startAutoplay();
  }

  function initDemoReceipts() {
    document.querySelectorAll("[data-demo-receipt]").forEach(function (button) {
      button.addEventListener("click", function () {
        const input = document.querySelector("[data-receipt-input]");
        if (!input) {
          return;
        }

        input.value = button.getAttribute("data-demo-receipt") || "";
        input.focus();
        clearError();
      });
    });
  }

  components.onReady(function () {
    components.initPublicNav("home");
    components.initPublicFooter();
    renderStatusStrips();
    initDemoReceipts();
    initTestimonialSlider();

    const form = document.querySelector("[data-tracking-form]");
    if (form) {
      form.addEventListener("submit", handleReceiptSubmit);
    }
  });
})();
