// plugins/apexel/katalog.js — Katalog foto asli Apexel Caruban
// Cara pakai: .katalog

export default {
   command: 'katalog',
   hidden: ['catalog', 'foto'],
   category: 'info',
   description: 'Katalog foto produk sewa',

   async run(m, { sock }) {
      const jid = m.key.remoteJid
      const pfx = '.'

      try {
         await sock.sendMessage(jid, {
            album: [
               {
                  image: { url: './media/Image/katalog-tripod.jpg' },
                  caption: 'Tripod 2 Meter — Rp10rb/hari\n\nBuat foto atau video biar stabil, sudah termasuk holder HP. Cocok buat konten, live, atau dokumentasi acara.',
               },
               {
                  image: { url: './media/Image/katalog-paket.jpg' },
                  caption: 'Paket Lengkap — Rp75rb/hari\n\nSatu paket isi tripod, kursi lipat, kompor portable, tikar, dan keranjang piknik. Tinggal bawa badan, piknik langsung jadi.',
               },
               {
                  image: { url: './media/Image/katalog-kompor.jpg' },
                  caption: 'Kompor Portable — Rp50rb/hari\n\nMerk Omicko, sudah termasuk gas dan grill pan. Buat masak di outdoor, camping, atau acara bakar-bakar.',
               },
               {
                  image: { url: './media/Image/katalog-kursi.jpg' },
                  caption: 'Kursi Lipat — Rp12rb/hari\n\nMerk Speeds, kokoh dan nyaman. Gampang dilipat, gampang dibawa.',
               },
            ],
         }, { quoted: m })
      } catch (e) {
         await sock.sendMessage(jid, {
            text: 'Foto katalog belum tersedia. Ketik .pricelist buat lihat daftar harga.',
         }, { quoted: m })
         return
      }

      await new Promise(r => setTimeout(r, 1000))

      await sock.sendMessage(jid, {
         text: 'Kalau tertarik sewa, langsung chat aja.',
         footer: 'Apexel Caruban',
         buttons: [
            { text: 'Pricelist', id: `${pfx}pricelist` },
            { text: 'Lokasi', id: `${pfx}location` },
         ],
      }, { quoted: m })
   },
}
