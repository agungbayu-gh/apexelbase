import fs from 'fs'
import path from 'path'

const QRIS_PATH = path.resolve('./media/Image/qris.jpg')
const prefix ='.'

// Global buttons yang muncul setelah QRIS
const globalButtons = [
   { buttonId: `${prefix}pricelist`, buttonText: { displayText: 'Pricelist' }, type: 1 },
   { buttonId: `${prefix}location`, buttonText: { displayText: 'Lokasi' }, type: 1 },
   { buttonId: `${prefix}rules`, buttonText: { displayText: 'Peraturan' }, type: 1 }
]

export default {
   command: 'payment',
   hidden: ['qris', 'transfer', 'pay'],
   category: 'info',
   async run(m, { sock }) {
      const jid = m.key.remoteJid

      if (!fs.existsSync(QRIS_PATH)) {
         return sock.sendMessage(jid, {
            text: '❌ File QRIS tidak ditemukan di `media/qris.jpg`.'
         }, { quoted: m })
      }

      // Kirim gambar QRIS
      await sock.sendMessage(jid, {
         image: fs.readFileSync(QRIS_PATH),
         caption: `*PEMBAYARAN APEXEL CARUBAN*\n\nScan QRIS di atas untuk melakukan pembayaran.\n\n_Mohon kirimkan bukti transfer setelah melakukan pembayaran agar segera kami proses._ ✅`,
         footer: `${footer}`
      }, { quoted: m })

      // Kirim global button setelah QRIS
      await sock.sendMessage(jid, {
         text: `Ada yang bisa kami bantu lagi?`,
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
