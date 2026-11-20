// Content for the footer info pages (/info/<slug>), in both languages.
// Each page is a title, an intro and sections of paragraphs. Edit freely: it's plain text.

import type { Locale } from "./config"

export type InfoPage = { title: string; intro: string; sections: { heading: string; body: string[] }[] }

export const INFO_SLUGS = ["shipping", "returns", "payment", "contact", "about", "careers", "stores", "business", "terms", "privacy"] as const
export type InfoSlug = (typeof INFO_SLUGS)[number]

export const isInfoSlug = (s: string): s is InfoSlug => (INFO_SLUGS as readonly string[]).includes(s)

const en: Record<InfoSlug, InfoPage> = {
  shipping: {
    title: "Shipping information",
    intro: "We ship from our Jakarta warehouse to every province in Indonesia.",
    sections: [
      { heading: "Couriers and delivery times", body: ["JNE, SiCepat, J&T and GoSend are available at checkout with live prices for your address.", "Jabodetabek: usually next day. Java: 2–3 days. Other islands: 3–5 days. Same-day GoSend is available in Jakarta for orders up to 20 kg."] },
      { heading: "Free shipping", body: ["JNE REG is free for orders of Rp 1 jt or more. Vouchers such as GRATISONGKIR can cover other couriers."] },
      { heading: "Dispatch", body: ["Paid orders placed before 15:00 WIB leave the warehouse the same day. You'll get an email with the waybill (resi) once your parcel is handed to the courier."] },
    ],
  },
  returns: {
    title: "Returns & warranty",
    intro: "Changed your mind or received a faulty item? We'll sort it out.",
    sections: [
      { heading: "7-day returns", body: ["Return unused items in their original packaging within 7 days of delivery. Contact support with your order number and we'll arrange the pickup."] },
      { heading: "Official warranty", body: ["Every product carries the official Indonesian warranty from its brand (usually 1–3 years). Keep the warranty card and your invoice; you can download the invoice from your order page."] },
      { heading: "Refunds", body: ["Approved refunds go back to the original payment method. Card and e-wallet refunds arrive in 3–14 days; bank transfer refunds are sent manually."] },
    ],
  },
  payment: {
    title: "Payment methods",
    intro: "All payments are processed securely by Midtrans.",
    sections: [
      { heading: "Available methods", body: ["QRIS (any e-wallet or mobile banking), virtual accounts (BCA, Mandiri, BNI, BRI, Permata), credit and debit cards (Visa, Mastercard, JCB) and e-wallets (GoPay, ShopeePay)."] },
      { heading: "Payment windows", body: ["QRIS and cards: 1 hour. E-wallets: 15 minutes. Virtual accounts: 24 hours. We hold your items until the window ends; unpaid orders are cancelled automatically."] },
    ],
  },
  contact: {
    title: "Contact us",
    intro: "Our PC specialists are happy to help with orders, builds and warranty questions.",
    sections: [
      { heading: "Customer support", body: ["Email: support@tokotech.example", "WhatsApp: +62 812 0000 0000", "Monday–Saturday, 09:00–21:00 WIB"] },
      { heading: "Visit us", body: ["Jl. Gatot Subroto Kav. 18, Jakarta Selatan"] },
    ],
  },
  about: {
    title: "About TokoTech",
    intro: "Indonesia's home for PCs, monitors and peripherals.",
    sections: [
      { heading: "What we do", body: ["We sell genuine computer hardware from official distributors, test every order before it ships, and give honest advice to gamers, creators and offices."] },
      { heading: "Why genuine matters", body: ["Official stock means full local warranty, real support and no grey-market surprises."] },
    ],
  },
  careers: {
    title: "Careers",
    intro: "We're a small team that loves hardware.",
    sections: [{ heading: "Open roles", body: ["There are no open roles right now. Send your CV to careers@tokotech.example and we'll keep it on file."] }],
  },
  stores: {
    title: "Store locations",
    intro: "See products in person before you buy.",
    sections: [
      { heading: "Jakarta (flagship)", body: ["Jl. Gatot Subroto Kav. 18, Jakarta Selatan · Monday–Saturday, 10:00–21:00 WIB"] },
      { heading: "Pickup", body: ["Choose pickup at checkout (coming soon) and collect your order from the flagship store."] },
    ],
  },
  business: {
    title: "Business & bulk orders",
    intro: "Equipping an office, school or esports team?",
    sections: [{ heading: "Volume pricing", body: ["We offer volume pricing, staged deliveries and setup support for orders of 10 units or more. Email business@tokotech.example with your list and we'll reply within one working day."] }],
  },
  terms: {
    title: "Terms of service",
    intro: "These terms apply when you use TokoTech and place orders.",
    sections: [
      { heading: "Orders and prices", body: ["Prices are in Rupiah and include PPN 11%. An order is confirmed once payment is received; we may cancel orders with pricing errors and refund in full."] },
      { heading: "Your account", body: ["Keep your password safe. You're responsible for orders placed from your account."] },
      { heading: "Liability", body: ["Products are covered by their brand's warranty. Our liability is limited to the value of the order, as far as the law allows."] },
    ],
  },
  privacy: {
    title: "Privacy policy",
    intro: "We only collect what we need to run your orders and account.",
    sections: [
      { heading: "What we collect", body: ["Your name, email, phone, delivery addresses and order history. Payments are handled by Midtrans; we never see or store card numbers."] },
      { heading: "How we use it", body: ["To process and deliver orders, send order emails, and improve the store. We share delivery details with couriers and payment details with Midtrans only as needed."] },
      { heading: "Your choices", body: ["You can edit your addresses in your account and unsubscribe from newsletters at any time. Contact support to delete your account."] },
    ],
  },
}

const id: Record<InfoSlug, InfoPage> = {
  shipping: {
    title: "Info pengiriman",
    intro: "Kami mengirim dari gudang Jakarta ke seluruh provinsi di Indonesia.",
    sections: [
      { heading: "Kurir dan waktu pengiriman", body: ["JNE, SiCepat, J&T, dan GoSend tersedia saat checkout dengan tarif langsung sesuai alamat Anda.", "Jabodetabek: biasanya besok. Jawa: 2–3 hari. Luar Jawa: 3–5 hari. GoSend di hari yang sama tersedia di Jakarta untuk pesanan hingga 20 kg."] },
      { heading: "Gratis ongkir", body: ["JNE REG gratis untuk pesanan Rp 1 jt ke atas. Voucher seperti GRATISONGKIR bisa menanggung ongkir kurir lain."] },
      { heading: "Pengiriman pesanan", body: ["Pesanan yang dibayar sebelum 15.00 WIB dikirim hari yang sama. Anda akan menerima email berisi nomor resi saat paket diserahkan ke kurir."] },
    ],
  },
  returns: {
    title: "Retur & garansi",
    intro: "Berubah pikiran atau barang bermasalah? Kami bantu selesaikan.",
    sections: [
      { heading: "Retur 7 hari", body: ["Kembalikan barang yang belum dipakai dalam kemasan asli maksimal 7 hari setelah diterima. Hubungi customer service dengan nomor pesanan dan kami atur penjemputannya."] },
      { heading: "Garansi resmi", body: ["Setiap produk bergaransi resmi Indonesia dari mereknya (umumnya 1–3 tahun). Simpan kartu garansi dan invoice; invoice bisa diunduh di halaman pesanan."] },
      { heading: "Pengembalian dana", body: ["Dana yang disetujui dikembalikan ke metode pembayaran semula. Kartu dan e-wallet: 3–14 hari; transfer bank dikirim manual."] },
    ],
  },
  payment: {
    title: "Metode pembayaran",
    intro: "Semua pembayaran diproses dengan aman oleh Midtrans.",
    sections: [
      { heading: "Metode yang tersedia", body: ["QRIS (e-wallet atau mobile banking apa pun), virtual account (BCA, Mandiri, BNI, BRI, Permata), kartu kredit dan debit (Visa, Mastercard, JCB), serta e-wallet (GoPay, ShopeePay)."] },
      { heading: "Batas waktu pembayaran", body: ["QRIS dan kartu: 1 jam. E-wallet: 15 menit. Virtual account: 24 jam. Barang Anda kami simpan sampai batas waktu berakhir; pesanan yang tidak dibayar dibatalkan otomatis."] },
    ],
  },
  contact: {
    title: "Hubungi kami",
    intro: "Spesialis PC kami siap membantu soal pesanan, rakitan, dan garansi.",
    sections: [
      { heading: "Customer service", body: ["Email: support@tokotech.example", "WhatsApp: +62 812 0000 0000", "Senin–Sabtu, 09.00–21.00 WIB"] },
      { heading: "Kunjungi kami", body: ["Jl. Gatot Subroto Kav. 18, Jakarta Selatan"] },
    ],
  },
  about: {
    title: "Tentang TokoTech",
    intro: "Rumahnya PC, monitor, dan periferal di Indonesia.",
    sections: [
      { heading: "Apa yang kami lakukan", body: ["Kami menjual perangkat komputer original dari distributor resmi, mengecek setiap pesanan sebelum dikirim, dan memberi saran jujur untuk gamer, kreator, dan kantor."] },
      { heading: "Kenapa harus original", body: ["Stok resmi berarti garansi lokal penuh, dukungan nyata, dan tanpa kejutan barang black market."] },
    ],
  },
  careers: {
    title: "Karier",
    intro: "Kami tim kecil yang cinta hardware.",
    sections: [{ heading: "Lowongan", body: ["Saat ini belum ada lowongan. Kirim CV ke careers@tokotech.example dan akan kami simpan."] }],
  },
  stores: {
    title: "Lokasi toko",
    intro: "Lihat produk langsung sebelum membeli.",
    sections: [
      { heading: "Jakarta (flagship)", body: ["Jl. Gatot Subroto Kav. 18, Jakarta Selatan · Senin–Sabtu, 10.00–21.00 WIB"] },
      { heading: "Ambil di toko", body: ["Pilih ambil di toko saat checkout (segera hadir) dan ambil pesanan di toko flagship."] },
    ],
  },
  business: {
    title: "Bisnis & pembelian grosir",
    intro: "Melengkapi kantor, sekolah, atau tim esports?",
    sections: [{ heading: "Harga grosir", body: ["Kami menyediakan harga grosir, pengiriman bertahap, dan bantuan setup untuk pesanan 10 unit atau lebih. Kirim daftar kebutuhan ke business@tokotech.example dan kami balas dalam satu hari kerja."] }],
  },
  terms: {
    title: "Ketentuan layanan",
    intro: "Ketentuan ini berlaku saat Anda memakai TokoTech dan membuat pesanan.",
    sections: [
      { heading: "Pesanan dan harga", body: ["Harga dalam Rupiah dan sudah termasuk PPN 11%. Pesanan dikonfirmasi setelah pembayaran diterima; pesanan dengan kesalahan harga dapat kami batalkan dengan pengembalian dana penuh."] },
      { heading: "Akun Anda", body: ["Jaga kerahasiaan kata sandi. Anda bertanggung jawab atas pesanan yang dibuat dari akun Anda."] },
      { heading: "Tanggung jawab", body: ["Produk dilindungi garansi mereknya. Tanggung jawab kami terbatas pada nilai pesanan, sejauh diizinkan hukum."] },
    ],
  },
  privacy: {
    title: "Kebijakan privasi",
    intro: "Kami hanya mengumpulkan data yang dibutuhkan untuk pesanan dan akun Anda.",
    sections: [
      { heading: "Data yang kami kumpulkan", body: ["Nama, email, telepon, alamat pengiriman, dan riwayat pesanan. Pembayaran ditangani Midtrans; kami tidak pernah melihat atau menyimpan nomor kartu."] },
      { heading: "Cara kami memakainya", body: ["Untuk memproses dan mengirim pesanan, mengirim email pesanan, dan meningkatkan toko. Data pengiriman dibagikan ke kurir dan data pembayaran ke Midtrans hanya seperlunya."] },
      { heading: "Pilihan Anda", body: ["Anda bisa mengubah alamat di akun dan berhenti berlangganan newsletter kapan saja. Hubungi customer service untuk menghapus akun."] },
    ],
  },
}

export const infoPage = (locale: Locale, slug: InfoSlug) => (locale === "id" ? id : en)[slug]
