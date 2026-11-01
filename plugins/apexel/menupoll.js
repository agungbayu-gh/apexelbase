// plugins/apexel/menupoll.js
// Menu interaktif via Poll — vote otomatis dibalas.
// Pakai: .menupoll

import { createHash, randomBytes } from 'crypto'
import { readFile, writeFile } from 'fs/promises'
import { decryptPollVote } from '@itsliaaa/baileys/lib/Utils/process-message.js'
import { getKeyAuthor } from '@itsliaaa/baileys/lib/Utils/generics.js'
import { jidNormalizedUser } from '@itsliaaa/baileys/lib/WABinary/index.js'

const STORE = './lib/pollmenu.json'

const PRICELIST_TEXT = `*Pricelist Apexel Caruban* ✅

• *PAKET A* — Rp30.000/hari  
  - Lensa Apexel, Remote Bluetooth  

• *PAKET B* — Rp50.000/hari  
  - Lensa Apexel, Remote Bluetooth, Tripod 2 Meter  

• *PAKET C* — Rp70.000/hari  
  - Lensa Apexel, Remote Bluetooth, Tripod 2 Meter, Kursi Lipat 2 pcs  

• *PAKET LENGKAP* — Rp75.000/hari  
  - Lensa Apexel, Remote Bluetooth, Tripod 2 Meter, Kursi Lipat 2 pcs, Meja Lipat  

• *PAKET 1* — Rp20.000/hari  
  - Kursi Lipat 2 pcs  

• *PAKET 2* — Rp25.000/hari  
  - Kursi Lipat 2 pcs, Meja Lipat  

• *PAKET 3* — Rp30.000/hari  
  - Kursi Lipat 2 pcs, Meja Lipat, Tripod 2 Meter  

• *TIKAR PIKNIK* — Rp15.000/hari  
  - Ukuran 200x200cm, muat 6–8 orang  

• *KOMPOR PORTABLE* — Rp50.000/hari  
  - Include gas, koper, wajan anti lengket, capit, & sumpit  

• *SEWA SATUAN* (per hari)  
  - Quadpod Mixio — Rp20.000  
  - Tripod 2m — Rp10.000  
  - Kursi Lipat — Rp12.000  
  - Meja Lipat — Rp8.000  
  - Kacamata — Rp5.000  
  - Topi Bucket — Rp5.000  
  - Keranjang Piknik — Rp10.000

_Piknik Jadi Makin Aesthetic✨_`

const PAYMENT_TEXT = `💳 *Pembayaran Apexel Caruban*

Transfer ke:
• BCA 1234567890 a/n Apexel (CONTOH — ganti dengan rekening kamu)

Setelah transfer, kirim bukti ke sini ya kak.`

const LOCATION = {
   degreesLatitude: -7.504476,
   degreesLongitude: 111.703752,
   name: 'Apexel Caruban',
   address: 'Rumah di pertigaan a/n Riska, RT.03/RW.01, Tulung, Kec. Saradan, Kab. Madiun, Jawa Timur',
   url: 'https://maps.google.com/?cid=691112769252454610'
}

const OPTIONS = ['Pricelist', 'Pembayaran', 'Lokasi']

async function loadStore() {
   try { return JSON.parse(await readFile(STORE, 'utf8')) }
   catch { return {} }
}

// Dipanggil dari socket.js saat ada pollUpdateMessage
export async function handlePollVote(sock, msg) {
   try {
      const upd = msg.message?.pollUpdateMessage
      if (!upd?.vote) return false
      const pollKey = upd.pollCreationMessageKey
      const pollId = pollKey?.id
      if (!pollId) return false

      const store = await loadStore()
      const entry = store[pollId]
      if (!entry?.encKey) return false

      // Dekripsi vote (pakai normalisasi JID ala Baileys)
      const meId = jidNormalizedUser(sock.user?.id || '')
      const _pcj = getKeyAuthor(pollKey, meId)
      const _vj = getKeyAuthor(msg.key, meId)
      console.log('[POLLMENU] dbg:', JSON.stringify({ meId, sockUserId: sock.user?.id, pollCreatorJid: _pcj, voterJid: _vj, pollId, encKeyLen: Buffer.from(entry.encKey, 'base64').length }))
      const dec = decryptPollVote(
         { encPayload: upd.vote.encPayload, encIv: upd.vote.encIv },
         {
            pollCreatorJid: getKeyAuthor(pollKey, meId),
            pollMsgId: pollId,
            pollEncKey: Buffer.from(entry.encKey, 'base64'),
            voterJid: getKeyAuthor(msg.key, meId),
         }
      )
      const votedHashes = (dec.selectedOptions || []).map(b =>
         Buffer.isBuffer(b) ? b.toString('hex') : Buffer.from(b).toString('hex')
      )
      const jid = msg.key.remoteJid

      for (const h of votedHashes) {
         const optName = entry.hashes[h]
         if (!optName) continue

         if (optName === 'Pricelist') {
            await sock.sendMessage(jid, { text: PRICELIST_TEXT }, { quoted: msg })
         } else if (optName === 'Pembayaran') {
            await sock.sendMessage(jid, { text: PAYMENT_TEXT }, { quoted: msg })
         } else if (optName === 'Lokasi') {
            await sock.sendMessage(jid, { location: LOCATION }, { quoted: msg })
         } else continue
         return true
      }
      return false
   } catch (e) {
      console.log('[POLLMENU] vote error:', e.message)
      return false
   }
}

export default {
   command: 'menupoll',
   category: 'apexel',
   description: 'Menu interaktif via polling',

   async run(m, { sock }) {
      const jid = m.key.remoteJid
      const encKey = randomBytes(32)

      const sent = await sock.sendMessage(jid, {
         poll: {
            name: 'Mau info apa kak? Pilih salah satu 👇',
            values: OPTIONS,
            selectableCount: 1,
            messageSecret: encKey,
         }
      }, { quoted: m })

      const store = await loadStore()
      const hashes = {}
      for (const n of OPTIONS) {
         hashes[createHash('sha256').update(n).digest('hex')] = n
      }
      store[sent.key.id] = {
         hashes,
         encKey: encKey.toString('base64'),
         created: Date.now(),
         chat: jid,
      }
      await writeFile(STORE, JSON.stringify(store)).catch(() => {})
      await sock.sendMessage(jid, { text: '_Silakan vote salah satu opsi di atas ya kak 👆_' })
   },
}
