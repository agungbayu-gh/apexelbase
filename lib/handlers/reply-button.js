// lib/handlers/reply-button.js
// Handler tombol reply (Pricelist / Lokasi / Booking) dari kartu sapa.
// Dipanggil socket.js saat ada respons tombol dari pelanggan.

const RESPONSES = {
   'btn_pricelist': `*Pricelist Apexel Caruban* ✅\n\n• Tripod 2m — Rp10rb/hari\n• Kursi Lipat — Rp12rb/hari\n• Kompor Portable — Rp50rb/hari\n• Paket Lengkap — Rp75rb/hari\n\n_Ketik .pricelist buat lengkapnya_`,
   'btn_lokasi': null, // lokasi dikirim terpisah
   'btn_booking': `Siap kak! Mau sewa apa? Tulis nama barangnya ya, misal: tripod, kursi, kompor, paket lengkap.`,
}

const LOCATION = {
   degreesLatitude: -7.504476,
   degreesLongitude: 111.703752,
   name: 'Apexel Caruban',
   address: 'Rumah di pertigaan a/n Riska, RT.03/RW.01, Tulung, Kec. Saradan, Kab. Madiun, Jawa Timur',
   url: 'https://maps.google.com/?cid=691112769252454610'
}

// Dipanggil dari socket.js saat ada button response
export async function handleReplyButton(sock, msg) {
   try {
      const resp = msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage
         || msg.message?.buttonsResponseMessage
      if (!resp) return false

      // Ambil ID button yang ditekan
      let btnId = null
      if (resp.paramsJson) {
         try {
            const p = JSON.parse(resp.paramsJson)
            btnId = p.id || null
         } catch {}
      }
      if (!btnId && resp.selectedButtonId) btnId = resp.selectedButtonId
      if (!btnId) return false

      const jid = msg.key.remoteJid
      if (btnId === 'btn_lokasi') {
         await sock.sendMessage(jid, { location: LOCATION }, { quoted: msg })
         return true
      }
      const text = RESPONSES[btnId]
      if (text) {
         await sock.sendMessage(jid, { text }, { quoted: msg })
         return true
      }
      return false
   } catch (e) {
      console.log('[REPLYBTN] err:', e.message)
      return false
   }
}

export default {
   command: 'testreply',
   category: 'apexel',
   description: 'Tes reply button',

   async run(m, { sock, footer }) {
      const jid = m.key.remoteJid
      await sock.sendMessage(jid, {
         text: 'Halo kak! Ada yang bisa mimin bantu? Pilih salah satu 👇',
         footer: footer || 'Apexel Caruban',
         nativeFlow: [
            { text: 'Pricelist', id: 'btn_pricelist' },
            { text: 'Lokasi', id: 'btn_lokasi' },
            { text: 'Booking', id: 'btn_booking' },
         ]
      }, { quoted: m })
   },
}
