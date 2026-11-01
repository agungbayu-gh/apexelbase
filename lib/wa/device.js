import { deviceIdFromJid } from './normalize.js'

// Deteksi perangkat dari awalan (prefix) ID pesan.
const DEVICE_BY_PREFIX = [
   ['3EB0', 'WhatsApp Web'],
   ['3A', 'iPhone'],
   ['AC', 'Android'],
   ['A5', 'WhatsApp Business']
]

export function platformFromPrefix(id) {
   if (typeof id !== 'string' || !id) return null
   const upper = id.toUpperCase()
   for (const [key, name] of DEVICE_BY_PREFIX)
      if (upper.startsWith(key)) return { prefix: key, name }
   return null
}

// Klasifikasi platform dari pola ID pesan — aturan yang sama dengan
// fungsi getDevice milik Baileys (lib/Utils/messages.js):
//   3A + total 20 char -> ios | 3E + total 22 -> web
//   total 21 / 32 -> android  | 3F / total 18 -> desktop | lain -> unknown
export function platformFromMessageId(id) {
   if (typeof id !== 'string' || !id) return 'unknown'
   if (/^3A.{18}$/.test(id)) return 'ios'
   // Ground truth 2026-10-25: WA iPhone juga menerbitkan ID hex 20 char
   // yang tidak diawali 3A (contoh 2AFF...) -> tetap iPhone.
   if (/^[0-9A-F]{20}$/.test(id)) return 'ios'
   if (/^3E.{20}$/.test(id)) return 'web'
   if (/^(.{21}|.{32})$/.test(id)) return 'android'
   if (/^(3F|.{18}$)/.test(id)) return 'desktop'
   return 'unknown'
}

const PLATFORM_LABEL = {
   ios: 'iPhone',
   web: 'WhatsApp Web',
   android: 'Android',
   desktop: 'Desktop',
   unknown: 'Tidak dikenal'
}

export function formatTimestampWIB(seconds) {
   if (!seconds) return '-'
   try {
      const parts = new Intl.DateTimeFormat('id-ID', {
         timeZone: 'Asia/Jakarta',
         day: '2-digit', month: '2-digit', year: 'numeric',
         hour: '2-digit', minute: '2-digit', second: '2-digit',
         hour12: false
      }).formatToParts(new Date(seconds * 1000))
      const p = {}
      for (const part of parts) p[part.type] = part.value
      return p.day + '/' + p.month + '/' + p.year + ' ' + p.hour + ':' + p.minute + ':' + p.second
   } catch {
      return '-'
   }
}

export function formatUptime(totalSeconds) {
   const s = Math.floor(totalSeconds || 0)
   const d = Math.floor(s / 86400)
   const h = Math.floor((s % 86400) / 3600)
   const m = Math.floor((s % 3600) / 60)
   const sec = s % 60
   if (d > 0) return d + ' hari ' + h + ' jam'
   if (h > 0) return h + ' jam ' + m + ' menit'
   if (m > 0) return m + ' menit ' + sec + ' detik'
   return sec + ' detik'
}

// Konversi messageTimestamp (number | Long proto) ke detik epoch / null.
export function timestampSeconds(raw) {
   try {
      const v = (typeof raw === 'object' && raw !== null && typeof raw.toNumber === 'function')
         ? raw.toNumber()
         : Number(raw)
      return (!v || Number.isNaN(v)) ? null : v
   } catch {
      return null
   }
}

// analyzeSender — analisis perangkat + heuristik bot dari satu pesan masuk.
// Argumen kedua (opsional): fungsi getDevice dari library terpasang.
// Urutan deteksi platform: prefix ID dulu, lalu pola getDevice.
// Hasil verdict bersifat probabilitas, bukan kepastian.
export function analyzeSender(message, platformOf) {
   const key = message?.key ?? {}
   const id = typeof key.id === 'string' ? key.id : ''
   const senderJid = key.participant ?? key.remoteJid ?? ''
   const deviceId = deviceIdFromJid(key.participant) ?? deviceIdFromJid(key.remoteJid)
   const signals = []
   let bot = 0
   let human = 0
   const push = (label, side, note, extra = 0) => {
      signals.push({ label, side, note })
      if (side === 'bot') bot += 1 + extra
      if (side === 'human') human += 1
   }

   // 1. Pola ID pesan
   if (!id) {
      push('Pola ID', 'netral', 'ID pesan tidak tersedia')
   } else if (id.includes('BAILEYS')) {
      push('Pola ID', 'bot', 'ID mengandung penanda library lama (BAILEYS)', 2)
   } else if (id.startsWith('3EB0')) {
      push('Pola ID', 'human', 'Awalan 3EB0 = pola ID klien resmi (juga ditiru sebagian library)')
   } else if (/^[0-9A-F]{16,}$/.test(id)) {
      push('Pola ID', 'human', 'ID heksadesimal huruf besar seperti klien resmi')
   } else if (/^[0-9a-f-]{32,}$/.test(id)) {
      push('Pola ID', 'bot', 'ID mirip UUID heksadesimal huruf kecil (pola generator library)', 1)
   } else {
      push('Pola ID', 'netral', 'Pola ID tidak umum')
   }

   // 2. Charset ID
   if (id && /^[0-9A-F]+$/.test(id)) {
      push('Charset ID', 'human', 'Hanya 0-9A-F (konsisten klien resmi)')
   } else if (id && /[a-z]/.test(id) && !id.includes('BAILEYS')) {
      push('Charset ID', 'bot', 'Mengandung huruf kecil (klien resmi memakai heks kapital)')
   } else if (id) {
      push('Charset ID', 'netral', 'Charset campuran')
   }

   // 3. Panjang ID (ukuran yang dikenal pola resmi: 18/20/21/22/32)
   if (id) {
      if ([18, 20, 21, 22, 32].includes(id.length))
         push('Panjang ID', 'human', id.length + ' karakter (ukuran ID yang dikenal pola resmi)')
      else
         push('Panjang ID', 'netral', id.length + ' karakter (di luar ukuran umum)')
   }

   // 4. Platform: prefix ID dulu, fallback pola getDevice
   const prefixHit = platformFromPrefix(id)
   let platformName = null
   if (prefixHit) {
      platformName = prefixHit.name
      push('Platform', 'netral', 'Dari prefix ' + prefixHit.prefix + ' -> ' + prefixHit.name)
   } else if (id) {
      let raw = 'unknown'
      try {
         raw = (typeof platformOf === 'function' ? platformOf(id) : null) || 'unknown'
      } catch {
         raw = 'unknown'
      }
      if (raw === 'unknown') raw = platformFromMessageId(id)
      if (raw !== 'unknown') {
         platformName = PLATFORM_LABEL[raw] ?? raw
         push('Platform', 'netral', 'Dari pola ID (getDevice) -> ' + platformName)
      } else {
         push('Platform', 'netral', 'Pola ID tidak terklasifikasi platform')
      }
   }

   // 5. Device ID dari JID
   if (deviceId !== null && deviceId !== undefined) {
      push('Device ID', 'netral', 'Terekspos: perangkat ke-' + deviceId + ' (perangkat tambahan)')
   } else {
      push('Device ID', 'netral', 'Tidak terekspos (normal untuk chat pribadi)')
   }

   // 6. Struktur JID pengirim
   if (typeof senderJid === 'string' && senderJid.endsWith('@lid')) {
      push('Struktur JID', 'netral', 'Memakai LID (nomor asli disembunyikan WhatsApp)')
   } else if (typeof senderJid === 'string' && senderJid.endsWith('@s.whatsapp.net')) {
      push('Struktur JID', 'human', 'JID nomor telepon standar')
   }

   const diff = bot - human
   const score = Math.max(0, Math.min(100, 50 + diff * 15))
   let verdict = 'Tidak cukup sinyal'
   if (diff >= 3) verdict = 'Kemungkinan besar bot'
   else if (diff >= 1) verdict = 'Kemungkinan bot'
   else if (diff <= -2) verdict = 'Kemungkinan manusia (klien resmi)'
   else if (diff === -1) verdict = 'Cenderung manusia'

   const platform = platformName
      ?? (deviceId !== null && deviceId !== undefined ? 'Perangkat tambahan' : PLATFORM_LABEL.unknown)
   const isCompanionPlatform = platformName === 'WhatsApp Web' || platformName === 'Desktop'
   const deviceStatus = (deviceId !== null && deviceId !== undefined) || isCompanionPlatform
      ? 'Perangkat tambahan'
      : 'Perangkat utama'

   const ts = timestampSeconds(message?.messageTimestamp)

   const remoteJid = typeof key.remoteJid === 'string' ? key.remoteJid : ''

   return {
      sender: senderJid || null,
      platform,
      prefix: prefixHit ? prefixHit.prefix : (id ? id.slice(0, 4).toUpperCase() : '-'),
      messageId: id ?? null,
      deviceId: deviceId ?? 0,
      deviceStatus,
      idLength: id ? id.length : null,
      chatType: remoteJid.endsWith('@g.us') ? 'Grup' : 'Private Chat',
      timestamp: ts,
      signals,
      botSignals: bot,
      humanSignals: human,
      score,
      verdict
   }
}

export function formatSenderReport(analysis, pushName) {
   const lines = []
   lines.push('Perangkat Pesan')
   lines.push('')
   lines.push('Nama : ' + (analysis.displayName || pushName || '-'))
   lines.push('Nomor : ' + (analysis.phone ? '+' + analysis.phone : 'Tidak diketahui'))
   lines.push('ID Device : ' + analysis.deviceId)
   lines.push('Status : ' + analysis.deviceStatus)
   lines.push('Platform : ' + analysis.platform)
   lines.push('Prefix ID : ' + analysis.prefix)
   lines.push('ID Pesan : ' + (analysis.messageId ? '`' + analysis.messageId + '`' : '-'))
   lines.push('Tipe Chat : ' + (analysis.chatType || '-'))
   lines.push('Waktu : ' + formatTimestampWIB(analysis.timestamp))
   lines.push('Uptime Bot : ' + (analysis.uptime || '-'))
   lines.push('')
   lines.push('Verdict : ' + analysis.verdict + ' (skor bot ' + analysis.score + '%)')
   return lines.join('\n')
}
