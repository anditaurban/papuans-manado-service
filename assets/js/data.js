(function () {
  "use strict";

  window.PMD_DATA = {
    customers: [
      {
        id: "CUS-001",
        name: "Andi Maramis",
        whatsapp: "081234561234",
        address: "Tikala, Manado",
        createdAt: "2026-07-01T09:00:00"
      },
      {
        id: "CUS-002",
        name: "Maria Waworuntu",
        whatsapp: "082198765432",
        address: "Malalayang, Manado",
        createdAt: "2026-07-02T10:15:00"
      },
      {
        id: "CUS-003",
        name: "Yosua Rumbayan",
        whatsapp: "085256781111",
        address: "Paal Dua, Manado",
        createdAt: "2026-07-03T11:20:00"
      },
      {
        id: "CUS-004",
        name: "Citra Sumual",
        whatsapp: "081355507890",
        address: "Wenang, Manado",
        createdAt: "2026-07-05T14:00:00"
      },
      {
        id: "CUS-005",
        name: "Reza Ahmad",
        whatsapp: "082211119876",
        address: "Tuminting, Manado",
        createdAt: "2026-07-08T08:30:00"
      },
      {
        id: "CUS-006",
        name: "Natasya Lumintang",
        whatsapp: "081244449999",
        address: "Sario, Manado",
        createdAt: "2026-07-10T16:45:00"
      }
    ],
    technicians: [
      {
        id: "TEC-001",
        name: "Rian Kambu",
        skills: ["Android", "charging", "software"],
        availability: "Available"
      },
      {
        id: "TEC-002",
        name: "Melky Mandagi",
        skills: ["iPhone", "display", "microsoldering"],
        availability: "Busy"
      },
      {
        id: "TEC-003",
        name: "Fadly Pratama",
        skills: ["Android", "battery", "water damage"],
        availability: "Available"
      }
    ],
    damageTypes: [
      {
        id: "DMG-001",
        name: "Layar/LCD",
        estimatedDuration: "1-3 hari",
        priceRange: "Rp350.000-Rp2.500.000",
        active: true
      },
      {
        id: "DMG-002",
        name: "Baterai",
        estimatedDuration: "1 hari",
        priceRange: "Rp200.000-Rp900.000",
        active: true
      },
      {
        id: "DMG-003",
        name: "Port Charging",
        estimatedDuration: "1-2 hari",
        priceRange: "Rp250.000-Rp800.000",
        active: true
      },
      {
        id: "DMG-004",
        name: "Software/Bootloop",
        estimatedDuration: "1-2 hari",
        priceRange: "Rp150.000-Rp500.000",
        active: true
      },
      {
        id: "DMG-005",
        name: "Kamera",
        estimatedDuration: "1-3 hari",
        priceRange: "Rp300.000-Rp1.500.000",
        active: true
      },
      {
        id: "DMG-006",
        name: "Speaker/Mic",
        estimatedDuration: "1-2 hari",
        priceRange: "Rp200.000-Rp700.000",
        active: true
      },
      {
        id: "DMG-007",
        name: "Motherboard",
        estimatedDuration: "3-7 hari",
        priceRange: "Rp500.000-Rp3.000.000",
        active: true
      },
      {
        id: "DMG-008",
        name: "Terkena Air",
        estimatedDuration: "2-7 hari",
        priceRange: "Setelah diagnosis",
        active: true
      }
    ],
    parts: [
      {
        id: "PRT-001",
        sku: "LCD-IP11-BLK",
        name: "LCD iPhone 11 Black",
        category: "Display",
        compatibility: "iPhone 11",
        stock: 3,
        minStock: 2,
        costPrice: 750000,
        servicePrice: 950000,
        supplier: "Pemasok placeholder"
      },
      {
        id: "PRT-002",
        sku: "BAT-IP11",
        name: "Baterai iPhone 11",
        category: "Baterai",
        compatibility: "iPhone 11",
        stock: 1,
        minStock: 2,
        costPrice: 280000,
        servicePrice: 450000,
        supplier: "Pemasok placeholder"
      },
      {
        id: "PRT-003",
        sku: "USB-RN10",
        name: "Charging Flex Redmi Note 10",
        category: "Charging",
        compatibility: "Redmi Note 10",
        stock: 5,
        minStock: 2,
        costPrice: 90000,
        servicePrice: 220000,
        supplier: "Pemasok placeholder"
      },
      {
        id: "PRT-004",
        sku: "BAT-A52",
        name: "Baterai Samsung A52",
        category: "Baterai",
        compatibility: "Samsung A52",
        stock: 0,
        minStock: 1,
        costPrice: 230000,
        servicePrice: 390000,
        supplier: "Pemasok placeholder"
      },
      {
        id: "PRT-005",
        sku: "SPK-UNIV-01",
        name: "Speaker Universal Type A",
        category: "Audio",
        compatibility: "Universal",
        stock: 8,
        minStock: 3,
        costPrice: 65000,
        servicePrice: 160000,
        supplier: "Pemasok placeholder"
      },
      {
        id: "PRT-006",
        sku: "CAM-OPPO-A54",
        name: "Kamera Belakang Oppo A54",
        category: "Kamera",
        compatibility: "Oppo A54",
        stock: 2,
        minStock: 1,
        costPrice: 210000,
        servicePrice: 380000,
        supplier: "Pemasok placeholder"
      },
      {
        id: "PRT-007",
        sku: "ADH-WTR-01",
        name: "Adhesive Waterproof",
        category: "Consumable",
        compatibility: "Universal",
        stock: 20,
        minStock: 5,
        costPrice: 15000,
        servicePrice: 40000,
        supplier: "Pemasok placeholder"
      },
      {
        id: "PRT-008",
        sku: "IC-CHG-01",
        name: "IC Charging Type Q",
        category: "Charging",
        compatibility: "Multi-brand",
        stock: 1,
        minStock: 2,
        costPrice: 180000,
        servicePrice: 450000,
        supplier: "Pemasok placeholder"
      }
    ],
    serviceOrders: [
      {
        id: "SVC-001",
        receipt: "PMD-20260714-0001",
        customerId: "CUS-001",
        device: {
          brand: "iPhone",
          model: "11",
          color: "Black",
          imei: "356789104824821"
        },
        complaint: "Layar bergaris dan touch tidak responsif.",
        damageTypeId: "DMG-001",
        technicianId: "TEC-002",
        status: "PENGERJAAN",
        priority: "Normal",
        estimatedCost: 1250000,
        estimatedDoneAt: "2026-07-20T17:00:00",
        receivedAt: "2026-07-14T09:10:00",
        initialCondition: "Baret ringan pada frame kanan.",
        internalNote: "Konektor display perlu dibersihkan.",
        safeDiagnosis: "Modul display perlu penggantian.",
        partUsages: [{ partId: "PRT-001", qty: 1 }]
      },
      {
        id: "SVC-002",
        receipt: "PMD-20260715-0002",
        customerId: "CUS-002",
        device: {
          brand: "Samsung",
          model: "Galaxy A52",
          color: "Blue",
          imei: "352001118887761"
        },
        complaint: "Baterai cepat habis dan perangkat panas.",
        damageTypeId: "DMG-002",
        technicianId: "TEC-003",
        status: "MENUNGGU_SPAREPART",
        priority: "Normal",
        estimatedCost: 430000,
        estimatedDoneAt: null,
        receivedAt: "2026-07-15T10:25:00",
        initialCondition: "Unit menyala, suhu cepat naik.",
        internalNote: "Stok baterai A52 kosong.",
        safeDiagnosis: "Baterai perlu diganti setelah stok tersedia.",
        plannedParts: [{ partId: "PRT-004", qty: 1 }]
      },
      {
        id: "SVC-003",
        receipt: "PMD-20260716-0003",
        customerId: "CUS-003",
        device: {
          brand: "Redmi",
          model: "Note 10",
          color: "Gray",
          imei: ""
        },
        complaint: "Tidak dapat mengisi daya.",
        damageTypeId: "DMG-003",
        technicianId: "TEC-001",
        status: "DIAGNOSA",
        priority: "Tinggi",
        estimatedCost: 250000,
        estimatedDoneAt: null,
        receivedAt: "2026-07-16T13:30:00",
        initialCondition: "Port longgar, layar normal.",
        internalNote: "",
        safeDiagnosis: "Port charging sedang diperiksa.",
        partUsages: []
      },
      {
        id: "SVC-004",
        receipt: "PMD-20260710-0004",
        customerId: "CUS-004",
        device: {
          brand: "Oppo",
          model: "A54",
          color: "Crystal Black",
          imei: ""
        },
        complaint: "Kamera belakang buram.",
        damageTypeId: "DMG-005",
        technicianId: "TEC-003",
        status: "SIAP_DIAMBIL",
        priority: "Normal",
        estimatedCost: 420000,
        finalCost: 420000,
        estimatedDoneAt: "2026-07-18T15:00:00",
        receivedAt: "2026-07-10T11:00:00",
        readyAt: "2026-07-18T14:20:00",
        initialCondition: "Body normal, kamera buram.",
        internalNote: "",
        safeDiagnosis: "Kamera belakang sudah diganti.",
        partUsages: [{ partId: "PRT-006", qty: 1 }]
      },
      {
        id: "SVC-005",
        receipt: "PMD-20260708-0005",
        customerId: "CUS-005",
        device: {
          brand: "Vivo",
          model: "Y21",
          color: "Midnight Blue",
          imei: ""
        },
        complaint: "Bootloop setelah update.",
        damageTypeId: "DMG-004",
        technicianId: "TEC-001",
        status: "SELESAI",
        priority: "Normal",
        serviceFee: 250000,
        finalCost: 250000,
        estimatedDoneAt: "2026-07-09T17:00:00",
        receivedAt: "2026-07-08T09:40:00",
        completedAt: "2026-07-09T16:10:00",
        initialCondition: "Unit bootloop, casing normal.",
        internalNote: "",
        safeDiagnosis: "Software berhasil dipulihkan.",
        partUsages: []
      },
      {
        id: "SVC-006",
        receipt: "PMD-20260701-0006",
        customerId: "CUS-006",
        device: {
          brand: "iPhone",
          model: "XR",
          color: "White",
          imei: ""
        },
        complaint: "Speaker kecil.",
        damageTypeId: "DMG-006",
        technicianId: "TEC-002",
        status: "DIAMBIL",
        priority: "Normal",
        serviceFee: 150000,
        finalCost: 310000,
        estimatedDoneAt: "2026-07-04T15:00:00",
        receivedAt: "2026-07-01T10:00:00",
        completedAt: "2026-07-04T14:00:00",
        pickedUpAt: "2026-07-05T10:30:00",
        initialCondition: "Speaker lemah, fungsi lain normal.",
        internalNote: "",
        safeDiagnosis: "Speaker telah diganti dan diuji.",
        partUsages: [{ partId: "PRT-005", qty: 1 }]
      },
      {
        id: "SVC-007",
        receipt: "PMD-20260719-0007",
        customerId: "CUS-001",
        device: {
          brand: "Realme",
          model: "8",
          color: "Silver",
          imei: ""
        },
        complaint:
          "Mati setelah terkena air saat perjalanan. Pemilik sempat mencoba mengeringkan perangkat, tetapi layar tetap gelap dan perangkat tidak merespons tombol power maupun charger.",
        damageTypeId: "DMG-008",
        technicianId: null,
        status: "DITERIMA",
        priority: "Tinggi",
        estimatedCost: null,
        estimatedDoneAt: null,
        receivedAt: "2026-07-19T09:10:00",
        initialCondition:
          "Unit mati total, indikator lembap terlihat di area SIM tray, frame bawah sedikit baret, dan speaker grill perlu dibersihkan sebelum pemeriksaan lanjutan.",
        internalNote: "Perlu cek korosi board, jalur charging, dan kemungkinan short pada area power management.",
        safeDiagnosis:
          "Perangkat menunggu pemeriksaan awal menyeluruh karena riwayat terkena air. Estimasi biaya akan diperbarui setelah diagnosis teknisi.",
        partUsages: []
      }
    ],
    timelines: [
      {
        id: "TL-001",
        serviceId: "SVC-001",
        at: "2026-07-14T09:10:00",
        actor: "Admin",
        status: "DITERIMA",
        note: "Perangkat diterima dan kondisi awal didokumentasikan."
      },
      {
        id: "TL-002",
        serviceId: "SVC-001",
        at: "2026-07-14T11:20:00",
        actor: "Melky Mandagi",
        status: "DIAGNOSA",
        note: "Kerusakan ditemukan pada modul display."
      },
      {
        id: "TL-003",
        serviceId: "SVC-001",
        at: "2026-07-15T10:00:00",
        actor: "Admin",
        status: "MENUNGGU_SPAREPART",
        note: "Menunggu LCD kompatibel."
      },
      {
        id: "TL-004",
        serviceId: "SVC-001",
        at: "2026-07-18T14:30:00",
        actor: "Melky Mandagi",
        status: "PENGERJAAN",
        note: "Sparepart tersedia, penggantian dimulai."
      },
      {
        id: "TL-005",
        serviceId: "SVC-002",
        at: "2026-07-15T10:25:00",
        actor: "Admin",
        status: "DITERIMA",
        note: "Perangkat diterima untuk pemeriksaan baterai."
      },
      {
        id: "TL-006",
        serviceId: "SVC-002",
        at: "2026-07-15T15:15:00",
        actor: "Fadly Pratama",
        status: "MENUNGGU_SPAREPART",
        note: "Baterai pengganti belum tersedia."
      },
      {
        id: "TL-007",
        serviceId: "SVC-003",
        at: "2026-07-16T13:30:00",
        actor: "Admin",
        status: "DITERIMA",
        note: "Perangkat diterima tanpa IMEI."
      },
      {
        id: "TL-008",
        serviceId: "SVC-003",
        at: "2026-07-16T14:10:00",
        actor: "Rian Kambu",
        status: "DIAGNOSA",
        note: "Port charging sedang diperiksa."
      },
      {
        id: "TL-009",
        serviceId: "SVC-004",
        at: "2026-07-18T14:20:00",
        actor: "Fadly Pratama",
        status: "SIAP_DIAMBIL",
        note: "Kamera diganti dan perangkat siap diambil."
      },
      {
        id: "TL-010",
        serviceId: "SVC-005",
        at: "2026-07-09T16:10:00",
        actor: "Admin",
        status: "SELESAI",
        note: "Administrasi service selesai."
      },
      {
        id: "TL-011",
        serviceId: "SVC-006",
        at: "2026-07-05T10:30:00",
        actor: "Admin",
        status: "DIAMBIL",
        note: "Perangkat telah diambil pelanggan."
      },
      {
        id: "TL-012",
        serviceId: "SVC-007",
        at: "2026-07-19T09:10:00",
        actor: "Admin",
        status: "DITERIMA",
        note: "Perangkat diterima untuk diagnosis awal."
      }
    ],
    payments: [
      {
        id: "PAY-001",
        serviceId: "SVC-001",
        method: "Transfer manual",
        status: "DP",
        serviceFee: 300000,
        partsFee: 950000,
        discount: 0,
        paid: 300000,
        proofFileName: "bukti-transfer-dummy.jpg"
      },
      {
        id: "PAY-002",
        serviceId: "SVC-004",
        method: "Tunai",
        status: "Lunas",
        serviceFee: 40000,
        partsFee: 380000,
        discount: 0,
        paid: 420000,
        proofFileName: ""
      },
      {
        id: "PAY-003",
        serviceId: "SVC-005",
        method: "Transfer manual",
        status: "Lunas",
        serviceFee: 250000,
        partsFee: 0,
        discount: 0,
        paid: 250000,
        proofFileName: "transfer-vivo-dummy.jpg"
      },
      {
        id: "PAY-004",
        serviceId: "SVC-006",
        method: "Tunai",
        status: "Lunas",
        serviceFee: 150000,
        partsFee: 160000,
        discount: 0,
        paid: 310000,
        proofFileName: ""
      }
    ]
  };
})();
