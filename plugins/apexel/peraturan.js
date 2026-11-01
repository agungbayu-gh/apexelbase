// plugins/apexel/peraturan.js
// Peraturan Sewa - pesan biasa tanpa table, tanpa emoji, profesional

export default {
   command: 'rules',
   aliases: ['peraturan', 'aturan'],
   category: 'apexel',

   async run(m, { sock, prefix, footer }) {
      const jid = m.key.remoteJid
      const pfx = prefix ?? '.'

      const text = [
         'Syarat & Ketentuan Sewa Apexel Caruban',
         '',
         'Ketentuan Umum',
         '',
         '1. Kesepakatan: Proses penyewaan dilakukan berdasarkan kesepakatan antara kedua belah pihak sebelum barang diserahkan.',
         '',
         '2. Identitas: Penyewa wajib menyerahkan identitas diri yang valid (KTP, KTA, atau SIM) sebagai jaminan selama masa sewa.',
         '',
         '3. Pembayaran: Pembayaran dilakukan di awal (lunas) sebelum barang dapat digunakan. Tidak ada sistem bayar belakang.',
         '',
         'Ketentuan Tambahan',
         '',
         '4. Durasi Sewa: Durasi sewa dihitung per 24 jam sejak barang diserahkan kepada penyewa.',
         '',
         '5. Keterlambatan: Pengembalian melebihi waktu yang disepakati dikenakan denda sebesar Rp3.000 per jam keterlambatan.',
         '',
         'Tanggung Jawab & Pembatalan',
         '',
         '6. Kondisi Barang: Barang wajib dikembalikan dalam kondisi baik, bersih, dan lengkap seperti saat pertama kali diserahkan.',
         '',
         '7. Kerusakan: Kerusakan sebagian maupun total yang terjadi selama masa sewa menjadi tanggung jawab penuh penyewa.',
         '',
         '8. Kehilangan: Kehilangan barang selama masa sewa wajib diganti sesuai harga barang yang berlaku saat ini.',
         '',
         'Ketentuan Akhir',
         '',
         '9. Pembatalan: Pembatalan sewa wajib dikonfirmasi minimal 24 jam sebelum jadwal pengambilan agar biaya tidak hangus.',
         '',
         '10. Komunikasi: Segala komunikasi terkait sewa dilakukan melalui kontak resmi Apexel Caruban.',
         '',
         '11. Persetujuan: Dengan menyewa, penyewa dianggap telah membaca, memahami, dan menyetujui seluruh syarat & ketentuan ini.',
         '',
         'Terima kasih telah mempercayai Apexel Caruban. Semoga pengalaman sewa Anda menyenangkan.',
         '',
         `Ketik ${pfx}pricelist untuk melihat harga.`
      ].join('\n')

      await sock.sendMessage(jid, {
         text,
         footer: footer ?? 'Apexel Caruban'
      })
   },

   group: false,
   private: false,
   owner: false,
   partner: false,
   admin: false,
   botAdmin: false,
   limit: 1
}
