// events/sapa.js
import fs from 'fs/promises'
import path from 'path'
import chalk from 'chalk'
import { tokenizeCode } from '@itsliaaa/baileys'

const JID_DIR = path.resolve('./lib/chat')
const WELCOME_PHOTO_PATH = path.resolve('./media/story-daily.jpg')
const SAPA_INTERVAL_MS = 6 * 60 * 60 * 1000
const LID_SUFFIX = '@lid'
const S_WHATSAPP_NET = '@s.whatsapp.net'

// GANTI dengan nomor owner kamu (format: 62xxxxxxxxxx@s.whatsapp.net)
// Nomor owner tidak menerima kartu sapa.
const TARGET_OWNERS = [
   '6280000000000@s.whatsapp.net'
]

async function ensureDir() {
   try {
      await fs.mkdir(JID_DIR, { recursive: true })
   } catch (e) {
      console.error(chalk.red('[SAPA] Gagal membuat direktori chat:'), e.message)
   }
}
ensureDir()

function getJidFilePath(jid) {
   const cleanId = jid.split('@')[0].split(':')[0]
   return path.join(JID_DIR, `${cleanId}.json`)
}

/**
 * Normalisasi JID/LID ke format yang benar
 */
async function normalizeJid(sock, rawJid) {
   if (!rawJid.endsWith(LID_SUFFIX)) {
      const cleanNumber = rawJid.split('@')[0].split(':')[0].replace(/\s/g, '').replace(/^\+/, '')
      return cleanNumber + S_WHATSAPP_NET
   }
   try {
      const result = await sock.findUserId(rawJid)
      const phone = result?.phoneNumber
      if (phone) {
         return phone.endsWith(S_WHATSAPP_NET) ? phone : phone + S_WHATSAPP_NET
      }
   } catch (e) {
      console.error('[SAPA] Gagal resolve LID:', e.message)
   }
   const cleanNumber = rawJid.split('@')[0].split(':')[0].replace(/\s/g, '').replace(/^\+/, '')
   return cleanNumber + S_WHATSAPP_NET
}

export async function handleFirstTimeChat(sock, message, config) {
   const rawJid = message?.key?.remoteJid
   if (!rawJid) return false

   const isPrivateChat = rawJid.endsWith(S_WHATSAPP_NET) || rawJid.endsWith(LID_SUFFIX)
   if (!isPrivateChat) return false

   if (message?.key?.fromMe) return false
   if (!message?.message) return false

   // Hanya sapa untuk pesan chat sungguhan. Event non-chat (reaksi,
   // protokol edit/hapus, vote poll, distribusi kunci) tidak boleh
   // memicu sapaan — pemicu kasus 2026-10-26 adalah pesan tanpa teks.
   const mKeys = Object.keys(message.message).filter(k => k !== 'messageContextInfo')
   if (mKeys.length === 0) return false
   if (mKeys.length === 1 && ['protocolMessage', 'reactionMessage', 'pollUpdateMessage', 'senderKeyDistributionMessage', 'keepInChatMessage'].includes(mKeys[0])) return false

   // Normalisasi JID/LID
   const cleanJid = await normalizeJid(sock, rawJid)
   const tagNumber = cleanJid.split('@')[0]

   // Owner tidak pernah disapa (fix 2026-10-30: sapa berulang ke nomor owner,
   // termasuk saat owner mengirim perintah seperti .aion/.aioff)
   if (TARGET_OWNERS.includes(cleanJid)) return false

   const pfx = config.prefix ?? '.'
   const ft = config.footer ?? 'Starseed'

   // Teks sapaan
   const introText = `Halo kak @${tagNumber}!

Selamat datang di Apexel Caruban.

*Kami menyediakan layanan sewa:*
• Lensa Apexel
• Remote Bluetooth
• Tripod 2 Meter
• Quadpod Mixio
• Kursi Lipat & Meja Lipat
• Tikar Piknik & Keranjang Piknik
• Kompor Grill Set
• Kacamata & Topi Bucket

*Cara sewa:*
1. Pilih barang, tanggal & durasi di chat ini
2. Admin cek stok & kirim ringkasan booking
3. Ambil barang di Tulung, Saradan setelah dikonfirmasi

Jangan datang dulu sebelum ada konfirmasi ya kak.`

   // Pattern nativeFlow — identik dengan .menu style 3 (menu.js)
   const OFFER_EXPIRATION = Date.now() * 2
   const HIGHLIGHT_LABEL = { highlight_label: 'Most Used' }

   const sapaNativeFlow = [
      {
         text: 'Pricelist',
         sections: [
            {
               title: 'Paket Fotografi',
               ...HIGHLIGHT_LABEL,
               rows: [
                  { title: 'Paket A', description: 'Rp30rb - Lensa + Remote', id: `${pfx}bayar 30000 Paket_A` },
                  { title: 'Paket B', description: 'Rp50rb - Lensa + Remote + Tripod', id: `${pfx}bayar 50000 Paket_B` },
                  { title: 'Paket C', description: 'Rp70rb - Lensa + Tripod + 2 Kursi', id: `${pfx}bayar 70000 Paket_C` },
                  { title: 'Paket Lengkap', description: 'Rp75rb - Full Set Aesthetic', id: `${pfx}bayar 75000 Paket_Lengkap` }
               ]
            },
            {
               title: 'Paket Camping',
               rows: [
                  { title: 'Paket 1', description: 'Rp20rb - 2 Kursi Lipat', id: `${pfx}bayar 20000 Paket_1` },
                  { title: 'Paket 2', description: 'Rp25rb - 2 Kursi + Meja', id: `${pfx}bayar 25000 Paket_2` },
                  { title: 'Paket 3', description: 'Rp30rb - 2 Kursi + Meja + Tripod', id: `${pfx}bayar 30000 Paket_3` }
               ]
            },
            {
               title: 'Masak & Alas',
               rows: [
                  { title: 'Kompor Portable', description: 'Rp50rb - Set Lengkap + Gas', id: `${pfx}bayar 50000 Kompor_Portable` },
                  { title: 'Tikar Piknik', description: 'Rp15rb - 200x200cm', id: `${pfx}bayar 15000 Tikar_Piknik` }
               ]
            },
            {
               title: 'Sewa Satuan',
               rows: [
                  { title: 'Quadpod Mixio', description: 'Rp20.000', id: `${pfx}bayar 20000 Quadpod_Mixio` },
                  { title: 'Kursi Lipat', description: 'Rp12.000', id: `${pfx}bayar 12000 Kursi_Lipat` },
                  { title: 'Tripod 2m', description: 'Rp10.000', id: `${pfx}bayar 10000 Tripod_2m` },
                  { title: 'Meja Lipat', description: 'Rp8.000', id: `${pfx}bayar 8000 Meja_Lipat` }
               ]
            },
            {
               title: 'Informasi',
               rows: [
                  { title: 'Peraturan Sewa', description: 'Syarat & ketentuan', id: `${pfx}rules` },
                  { title: 'Lokasi Kami', description: 'Alamat & peta', id: `${pfx}location` },
                  { title: 'Cara Pembayaran', description: 'QRIS & transfer', id: `${pfx}payment` }
               ]
            }
         ]
      }
   ]

   const jidFilePath = getJidFilePath(cleanJid)
   const currentTime = Date.now()
   let lastSapaTime = 0
   let isFirstTimeEver = true

   try {
      const data = await fs.readFile(jidFilePath, 'utf-8')
      const userData = JSON.parse(data)
      lastSapaTime = userData.last_sapa_time || 0
      isFirstTimeEver = false
   } catch {
      // File tidak ada = user baru
   }

   // Cek interval: hanya kirim sapa sekali dalam 6 jam
   if (!isFirstTimeEver && (currentTime - lastSapaTime) < SAPA_INTERVAL_MS) return false

   // Kirim greeting: gambar + button reply biasa (kompatibel iOS & Android)
   const sapaButtons = [
      { text: 'Pricelist', id: `${pfx}pricelist` },
      { text: 'Lokasi', id: `${pfx}location` },
      { text: 'Peraturan', id: `${pfx}rules` }
   ]

   try {
      await fs.access(WELCOME_PHOTO_PATH)
      await sock.sendMessage(cleanJid, {
         image: { url: WELCOME_PHOTO_PATH },
         caption: introText,
         footer: ft,
         buttons: sapaButtons,
         mentions: [cleanJid]
      })
   } catch {
      await sock.sendMessage(cleanJid, {
         text: introText,
         footer: ft,
         buttons: sapaButtons,
         mentions: [cleanJid]
      })
   }

   // Flow fix 2026-10-24: kartu sapa adalah SATU-SATUNYA balasan pesan pertama.
   // Tidak ada pesan lanjutan di sini — AI baru aktif mulai pesan berikutnya.

   // Simpan data user/owner ke JSON (pertahankan penanda owner_notified dll)
   let existingData = {}
   try {
      existingData = JSON.parse(await fs.readFile(jidFilePath, 'utf-8'))
   } catch { }

   await fs.writeFile(jidFilePath, JSON.stringify({
      ...existingData,
      jid: cleanJid,
      push_name: message.pushName || (TARGET_OWNERS.includes(cleanJid) ? 'Owner' : 'User'),
      last_sapa_time: currentTime,
      ai: existingData.ai ?? 'false'
   }, null, 2))

   console.log(chalk.blue(`[SAPA] Sent greeting to ${tagNumber}`))
   return true
}
