const APEXEL_LOCATION = {
   degreesLatitude: -7.504476,
   degreesLongitude: 111.703752,
   name: 'Apexel Caruban',
   address: 'Rumah di pertigaan a/n Riska, RT.03/RW.01, Tulung, Kec. Saradan, Kab. Madiun, Jawa Timur',
   url: 'https://maps.google.com/?cid=691112769252454610'
}

// Global buttons yang tampil setelah kirim lokasi
const globalButtons = [
   { buttonId: `${prefix}pricelist`, buttonText: { displayText: 'Pricelist' }, type: 1 },
   { buttonId: `${prefix}payment`, buttonText: { displayText: 'Pembayaran' }, type: 1 },
   { buttonId: `${prefix}rules`, buttonText: { displayText: 'Peraturan' }, type: 1 }
]

export default {
   command: 'location',
   hidden: ['maps', 'address', 'directions'],
   category: 'info',
   async run(m, { sock }) {
      const jid = m.key.remoteJid

      // Kirim pin lokasi
      await sock.sendMessage(jid, {
         location: APEXEL_LOCATION,
         contextInfo: {
            caption: `📍 *Lokasi Apexel Caruban*\n${APEXEL_LOCATION.address}\n\n[Klik di atas untuk navigasi]`
         }
      }, { quoted: m })

      // Kirim global button setelah lokasi
      await sock.sendMessage(jid, {
         text: `Butuh info lain? Pilih menu di bawah ini:`,
         footer: `${footer}`,
         buttons: globalButtons,
         headerType: 1
      }, { quoted: m })
   },
   group: false,
   private: false,
   owner: false,
   partner: false,
   admin: false,
   botAdmin: false,
   limit: 1
}
