// normalize.js — bentuk pesan internal yang stabil untuk lapisan adapter WA.
// Semua adapter library wajib memetakan pesan masuknya ke bentuk ini,
// supaya events/plugins tidak perlu tahu library apa yang terpasang.
export function extractText(message) {
   const m = message?.message ?? {}
   return (
      m.conversation ||
      m.extendedTextMessage?.text ||
      m.imageMessage?.caption ||
      m.videoMessage?.caption ||
      m.documentMessage?.caption ||
      ''
   )
}

// Device ID dari JID berbentuk 'user:device@server' (perangkat tertaut).
// Mengembalikan null bila tidak terekspos (normal untuk chat pribadi).
export function deviceIdFromJid(jid) {
   if (typeof jid !== 'string') return null
   const match = jid.match(/^[^:]+:(\d+)@/)
   return match ? Number(match[1]) : null
}

export function normalizeMessage(message) {
   try {
      const key = message?.key ?? {}
      const remoteJid = key.remoteJid ?? ''
      const participant = key.participant ?? key.participantAlt ?? null
      const type = Object.keys(message?.message ?? {})[0] ?? null
      return {
         id: key.id ?? null,
         chatJid: remoteJid,
         senderJid: participant ?? remoteJid,
         senderPn: key.senderPn ?? null,
         isGroup: typeof remoteJid === 'string' && remoteJid.endsWith('@g.us'),
         isNewsletter: typeof remoteJid === 'string' && remoteJid.endsWith('@newsletter'),
         isBroadcast: remoteJid === 'status@broadcast',
         fromMe: !!key.fromMe,
         deviceId: deviceIdFromJid(participant) ?? deviceIdFromJid(remoteJid),
         pushName: message?.pushName ?? null,
         timestamp: Number(message?.messageTimestamp ?? 0) || null,
         type,
         text: extractText(message)
      }
   } catch {
      return { id: message?.key?.id ?? null, chatJid: message?.key?.remoteJid ?? null }
   }
}
