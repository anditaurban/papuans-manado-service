# Service Handphone Papuans Manado Frontend

Status: `AWAITING_PHASE_11_APPROVAL`.

Frontend ini adalah prototype operasional service handphone berbasis HTML,
Tailwind CSS Play CDN, JavaScript vanilla, data dummy lokal, dan simulasi
persistensi browser melalui `localStorage`.

Phase 11 menambahkan identitas brand dari `assets/img/papuans-manado.jpg`,
kontak bisnis final, navigasi admin per modul, login/register admin demo, dan
restyle landing berbasis ilustrasi lokal.

Tidak ada npm, build tool, backend, database, API server, payment gateway,
checkout, e-commerce, upload server, WhatsApp API nyata, atau autentikasi nyata
di tahap ini.

## Open Locally

Buka file berikut langsung di browser modern:

- `index.html`
- `tracking.html`
- `login.html`
- `register.html`
- `admin.html`
- `teknisi.html`

Urutan script setiap halaman tetap:

1. Tailwind CSS Play CDN
2. `assets/js/config.js`
3. `assets/js/auth.js` pada login, register, dan admin
4. `assets/js/data.js`
5. `assets/js/store.js`
6. `assets/js/components.js`
7. Script halaman terkait

## Page Map

### `index.html`

Halaman publik untuk pelanggan dan calon pelanggan.

Modul UI:

- Navbar publik dari `PMD_CONFIG.menus.public`
- Hero dengan form cek resi
- Layanan service handphone
- Alur service empat langkah
- Keunggulan operasional
- Status flow canonical yang dapat digeser pada viewport sempit
- Testimoni dummy dalam carousel tiga slide
- FAQ
- Kontak dan footer
- Floating WhatsApp ke `+62 821-9008-7876`

Script: `assets/js/landing.js`

Action utama:

- Validasi format resi
- Lookup resi dari state frontend
- Redirect ke `tracking.html?resi=...`
- Isi contoh resi demo
- Navigasi testimoni melalui tombol, indikator, dan keyboard kiri/kanan

Ilustrasi landing:

- `assets/img/service-inspection.jpg`
- `assets/img/process-diagnostics.jpg`
- `assets/img/service-handoff.jpg`

Ketiga ilustrasi dibuat dengan image generation bawaan, disimpan lokal sebagai
JPEG teroptimasi, dan tidak memerlukan layanan gambar eksternal saat runtime.

### `tracking.html`

Halaman tracking pelanggan tanpa login.

Modul UI:

- Search state
- Loading simulation
- Error/not-found state
- Detail status service
- Progress canonical service
- Timeline
- Detail perangkat aman
- Estimasi biaya dan pembayaran
- Tindakan berikutnya
- Print ringkas

Script: `assets/js/tracking.js`

Privacy:

- Nama pelanggan dimasking
- Nomor WhatsApp dimasking
- IMEI dimasking
- `internalNote` tidak dirender
- Harga modal sparepart tidak dirender

### `login.html` dan `register.html`

Halaman akses admin demo berbasis state browser lokal.

Script: `assets/js/auth.js`

Action utama:

- Seed akun demo `admin@papuansmanado.id`
- Login dan validasi form
- Register akun admin demo di browser
- Membuat dan menghapus sesi demo
- Mengarahkan guest dari `admin.html` ke login
- Handoff query satu kali untuk demo yang dibuka langsung melalui `file://`

Password demo tidak aman untuk produksi dan tidak menggantikan autentikasi
server.

### `admin.html`

Dashboard dan modul operasional admin/pemilik.

Modul UI:

- Dashboard KPI
- Panel perlu tindakan
- Ringkasan status
- Service Masuk
- Pelanggan
- Perangkat
- Jenis Kerusakan
- Teknisi
- Sparepart
- Pembayaran
- Laporan
- Pengaturan demo
- Coverage data demo Phase 8
- Satu modul aktif per menu/hash
- Sidebar tetap pada desktop dan off-canvas pada mobile
- Logout sesi admin demo

Script: `assets/js/auth.js`, `assets/js/admin.js`

Action utama:

- CRUD simulatif service, pelanggan, jenis kerusakan, teknisi, sparepart,
  pembayaran, dan perangkat via service
- Assign teknisi
- Ubah status service dan append timeline
- Catat pemakaian sparepart dan kurangi stok
- Hapus data dengan confirmation modal
- Filter/search setiap modul
- Print laporan
- Export CSV frontend
- Reset data dummy ke seed deterministik

### `teknisi.html`

Dashboard kerja teknisi dengan role switch demo.

Modul UI:

- Selector teknisi aktif
- KPI teknisi
- Assignment aktif
- Filter tugas
- Tiket menunggu sparepart
- Tabel stok komponen
- Riwayat update
- Profil demo teknisi

Script: `assets/js/teknisi.js`

Action utama:

- Pilih teknisi demo aktif
- Lihat hanya service assigned ke teknisi aktif
- Buka detail assignment
- Update diagnosis, tindakan, estimasi selesai, biaya rekomendasi, dan status
- Catat sparepart dan kurangi stok
- Tandai service siap diambil
- Konfirmasi bila status melompati alur normal

## Module And Data Map

### Configuration

File: `assets/js/config.js`

Kontrak UI:

- `PMD_CONFIG.app`: nama aplikasi, kota, alamat, jam, label WhatsApp
- `PMD_CONFIG.locale`: `id-ID`
- `PMD_CONFIG.currency`: `IDR`
- `PMD_CONFIG.storage`: key data, akun auth demo, dan sesi auth demo
- `PMD_CONFIG.colors`: token warna Tailwind
- `PMD_CONFIG.roles`: admin, technician, customer
- `PMD_CONFIG.routes`: public, tracking, login, register, admin, technician
- `PMD_CONFIG.menus`: public, admin, technician
- `PMD_CONFIG.serviceStatuses`: status canonical service

Status canonical:

1. `DITERIMA`
2. `DIAGNOSA`
3. `MENUNGGU_SPAREPART`
4. `PENGERJAAN`
5. `SIAP_DIAMBIL`
6. `SELESAI`
7. `DIAMBIL`

### Seed Data

File: `assets/js/data.js`

Koleksi:

- `customers`
- `technicians`
- `damageTypes`
- `parts`
- `serviceOrders`
- `timelines`
- `payments`

Edge state yang sengaja ada di seed:

- Semua status canonical terwakili
- Tiket tanpa IMEI
- Tiket belum assigned
- Stok sparepart habis
- Pembayaran DP
- Tiket tanpa sparepart
- Prioritas tinggi
- Tiket menunggu sparepart
- Tiket sudah diambil
- Long content
- Resi invalid demo untuk not-found flow

### Store

File: `assets/js/store.js`

Kontrak state:

- `getState()`
- `setState(nextState)`
- `update(mutator)`
- `reset()`
- `subscribe(listener)`
- `findServiceByReceipt(receipt)`
- `getCustomer(id)`
- `getTechnician(id)`
- `getDamageType(id)`
- `getPart(id)`
- `getPaymentForService(serviceId)`
- `getTimelineForService(serviceId)`
- `getStatusCounts()`
- `getAssignmentsForTechnician(technicianId)`

`reset()` mengembalikan state ke `PMD_DATA` secara deterministik. Jika
`localStorage` rusak atau format lama, store fallback ke seed.

### Components

File: `assets/js/components.js`

Kontrak shared UI:

- Escape HTML
- Format Rupiah
- Format tanggal dan tanggal-jam Indonesia
- Masking nama, WhatsApp, IMEI
- Icon inline SVG
- Button
- Status badge
- Empty state
- Loading state
- Toast
- Confirmation modal
- Public nav/footer
- Internal app shell dengan sidebar role-based

### Demo Auth

File: `assets/js/auth.js`

Kontrak UI:

- `getUsers()`
- `getSession()`
- `requireAdmin()`
- `login(email, password)`
- `register(payload)`
- `logout()`
- `initAuthPage()`

## Future API Event Map

Belum ada API pada frontend ini. Daftar berikut adalah kandidat endpoint/event
untuk tahap backend/API setelah frontend fixed.

### Public Tracking

- Validate receipt format
- Lookup service by receipt
- Read customer-safe service detail
- Read timeline by service
- Read payment summary by service

### Admin Operations

- Authenticate admin in a future real auth layer
- Create admin accounts through an owner-approved flow
- End authenticated session
- Create service order
- Update service order
- Delete service order
- Assign technician
- Update service status
- Append service timeline
- Read service detail
- Read and update customer
- Read and update device data through service order
- Read and update damage type
- Read and update technician
- Read and update sparepart
- Create part usage and decrement stock
- Create, update, delete payment
- Reset seed only for demo environments

### Technician Workflow

- Authenticate technician in a future real auth layer
- Read assignments for authenticated technician
- Read assignment detail
- Update diagnosis and action note
- Update estimated completion date
- Update recommended cost
- Update status with server-side transition rules
- Create part usage and decrement stock
- Mark service ready for pickup

### Reports

- Query report summary by period
- Query status breakdown by period
- Query technician performance
- Query part usage
- Query revenue transactions
- Generate export server-side if required later

## Final Decisions

- Phase 11 membuka kembali frontend fixed untuk review brand dan alur akses.
- Stack remains HTML, Tailwind Play CDN, and JavaScript vanilla.
- Brand memakai palet hitam/navy, putih/perak, dan merah dari logo.
- Alamat final berada di Jl. Teluk Bayur, Kelurahan Kleak, Malalayang, Manado.
- Kontak bisnis adalah `+62 821-9008-7876`.
- Data source remains `assets/js/data.js`; runtime state remains `store.js`.
- `localStorage` is only a browser simulation layer.
- Login/register/logout admin disimulasikan melalui localStorage, bukan real auth.
- Payment is manual cash or transfer record only.
- Reports are operational summaries, not accounting.
- Sparepart is only a repair component inventory, not a retail catalog.
- Public tracking must keep masking WhatsApp and IMEI.
- Public tracking must not expose `internalNote` or part cost price.
- Print and CSV remain browser/frontend simulations.
- API/database work must wait for a new SOT after `FRONTEND_FIXED`.

## QA Summary

Phase 11 finished with `PASS_WITH_NOTES`.

Validated:

- Logo dan palet brand pada navbar, landing, tracking, auth, dan sidebar
- Alamat final dan tautan WhatsApp
- Tailwind Play CDN dimuat sebelum custom config pada seluruh halaman
- Login demo valid/invalid dan fallback auth storage rusak
- Register demo, duplicate email, session, guest guard, dan logout
- Handoff sesi demo untuk navigasi langsung antar-file lokal
- Sepuluh menu admin merender tepat satu modul aktif
- Sidebar desktop dan struktur off-canvas mobile
- JS syntax for all frontend scripts
- Local asset references
- Main menu hash targets
- Dynamic duplicate ID audit
- Data relation consistency
- Reset determinism
- Broken/corrupt localStorage fallback
- Role menu scope
- Status flow confirmation
- Tujuh status canonical pada rail landing
- Carousel tiga testimoni: tombol, dots, keyboard, autoplay, pause, dan reduced motion
- Lima FAQ dengan state buka/tutup native
- Tiga ilustrasi landing termuat dari aset lokal
- Stock cannot go negative through part usage forms
- Public masking and internal note privacy
- Report revenue rule for completed/picked-up services
- Accessibility dan responsive structure
- Visual browser checks pada mobile 360 px, tablet 768 px, dan desktop 1440 px
- DOM overflow checks pada 360 px, 768 px, dan 1280 px
- Print CSS and frontend CSV flow
- Scope guard against backend/database/API/payment gateway/e-commerce code

Note:

- Rail status menggunakan scroll horizontal terisolasi pada mobile dan tablet
  agar tujuh tahap tetap terbaca tanpa mengecilkan teks.
- `git status` is not reliable in this folder because Git CLI reports this
  checkout is not a valid repository.
