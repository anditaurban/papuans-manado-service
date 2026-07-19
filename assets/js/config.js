(function () {
  "use strict";

  const statusMeta = [
    {
      key: "DITERIMA",
      label: "Diterima",
      publicLabel: "Perangkat diterima",
      tone: "received",
      description: "Perangkat sudah diterima admin."
    },
    {
      key: "DIAGNOSA",
      label: "Diagnosa",
      publicLabel: "Sedang diperiksa",
      tone: "diagnosis",
      description: "Teknisi sedang memeriksa keluhan awal."
    },
    {
      key: "MENUNGGU_SPAREPART",
      label: "Menunggu Sparepart",
      publicLabel: "Menunggu sparepart",
      tone: "waiting",
      description: "Pengerjaan tertahan karena komponen service."
    },
    {
      key: "PENGERJAAN",
      label: "Pengerjaan",
      publicLabel: "Sedang dikerjakan",
      tone: "repair",
      description: "Perbaikan aktif sedang dilakukan."
    },
    {
      key: "SIAP_DIAMBIL",
      label: "Siap Diambil",
      publicLabel: "Siap diambil",
      tone: "ready",
      description: "Perangkat selesai dan dapat diambil pelanggan."
    },
    {
      key: "SELESAI",
      label: "Selesai",
      publicLabel: "Administrasi selesai",
      tone: "done",
      description: "Administrasi service telah diselesaikan."
    },
    {
      key: "DIAMBIL",
      label: "Diambil",
      publicLabel: "Perangkat telah diambil",
      tone: "picked",
      description: "Perangkat telah diserahkan kepada pelanggan."
    }
  ];

  const colors = {
    brand: {
      700: "#12354A",
      900: "#080B0E"
    },
    primary: {
      500: "#E1261C",
      600: "#B91C1C"
    },
    accent: {
      500: "#2D6F91"
    },
    success: {
      500: "#22C55E"
    },
    warning: {
      500: "#F59E0B"
    },
    danger: {
      500: "#EF4444"
    },
    neutral: {
      50: "#F8FAFC",
      200: "#E2E8F0",
      600: "#475569",
      900: "#0F172A"
    }
  };

  window.tailwind = window.tailwind || {};
  window.tailwind.config = {
    theme: {
      extend: {
        colors,
        fontFamily: {
          sans: [
            "ui-sans-serif",
            "system-ui",
            "-apple-system",
            "BlinkMacSystemFont",
            "Segoe UI",
            "sans-serif"
          ]
        },
        boxShadow: {
          soft: "0 16px 50px rgba(15, 23, 42, 0.08)"
        }
      }
    }
  };

  window.PMD_CONFIG = {
    app: {
      name: "Service Handphone Papuans Manado",
      shortName: "Papuans Manado",
      city: "Manado",
      address: "Jl. Teluk Bayur, Kelurahan Kleak, Kecamatan Malalayang, Kota Manado, Sulawesi Utara",
      hours: "Senin-Sabtu, 09.00-20.00 WITA",
      whatsappLabel: "+62 821-9008-7876",
      whatsappNumber: "6282190087876",
      whatsappUrl: "https://wa.me/6282190087876",
      logo: "assets/img/papuans-manado.jpg"
    },
    locale: "id-ID",
    currency: "IDR",
    storage: {
      key: "pmd-service-demo-state-v1",
      authUsersKey: "pmd-auth-demo-users-v1",
      authSessionKey: "pmd-auth-demo-session-v1"
    },
    colors,
    roles: {
      admin: {
        label: "Admin/Pemilik",
        home: "admin.html"
      },
      technician: {
        label: "Teknisi",
        home: "teknisi.html"
      },
      customer: {
        label: "Pelanggan",
        home: "tracking.html"
      }
    },
    routes: {
      publicHome: "index.html",
      tracking: "tracking.html",
      login: "login.html",
      register: "register.html",
      admin: "admin.html",
      technician: "teknisi.html"
    },
    menus: {
      public: [
        { id: "home", label: "Beranda", href: "index.html#main" },
        { id: "tracking", label: "Cek Status", href: "index.html#cek-status" },
        { id: "services", label: "Layanan", href: "index.html#layanan" },
        { id: "contact", label: "Kontak", href: "index.html#kontak" }
      ],
      admin: [
        { id: "dashboard", label: "Dashboard", href: "admin.html#dashboard", icon: "layout" },
        { id: "service", label: "Service Masuk", href: "admin.html#service", icon: "tool" },
        { id: "customers", label: "Pelanggan", href: "admin.html#pelanggan", icon: "users" },
        { id: "devices", label: "Perangkat", href: "admin.html#perangkat", icon: "phone" },
        { id: "damages", label: "Jenis Kerusakan", href: "admin.html#kerusakan", icon: "alert" },
        { id: "technicians", label: "Teknisi", href: "admin.html#teknisi", icon: "user" },
        { id: "parts", label: "Sparepart", href: "admin.html#sparepart", icon: "box" },
        { id: "payments", label: "Pembayaran", href: "admin.html#pembayaran", icon: "wallet" },
        { id: "reports", label: "Laporan", href: "admin.html#laporan", icon: "chart" },
        { id: "settings", label: "Pengaturan", href: "admin.html#pengaturan", icon: "settings" }
      ],
      technician: [
        { id: "dashboard", label: "Ringkasan", href: "teknisi.html#dashboard", icon: "layout" },
        { id: "assignments", label: "Tugas Aktif", href: "teknisi.html#tugas", icon: "tool" },
        { id: "waiting", label: "Menunggu Sparepart", href: "teknisi.html#sparepart", icon: "box" },
        { id: "history", label: "Riwayat Update", href: "teknisi.html#riwayat", icon: "chart" },
        { id: "profile", label: "Profil Demo", href: "teknisi.html#profil", icon: "user" }
      ]
    },
    serviceStatuses: statusMeta
  };
})();
