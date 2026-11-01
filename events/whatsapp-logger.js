// events/whatsapp-logger.js
// WhatsApp Message Logger & Interceptor
// Menangkap semua pesan masuk, menyimpannya, dan memungkinkan balasan
import fs from 'fs'
import fsP from 'fs/promises'
import path from 'path'

const LOG_DIR = path.resolve('./data/logs')
const LOG_FILE = path.resolve('./data/logs/wa-messages.json')
const MAX_LOG_ENTRIES = 500

// Inisialisasi direktori log - SYNCHRONOUS agar siap sebelum pesan diproses
try {
   fs.mkdirSync(LOG_DIR, { recursive: true })
   console.log('[LOGGER] Direktori log siap:', LOG_DIR)
} catch (e) {
   console.error('[LOGGER] Gagal membuat direktori log:', e.message)
}

// Simpan log pesan
const saveLog = async (logEntry) => {
   try {
      let logs = []
      try {
         const data = await fsP.readFile(LOG_FILE, 'utf-8')
         logs = JSON.parse(data)
      } catch {
         logs = []
      }

      logs.unshift(logEntry)

      if (logs.length > MAX_LOG_ENTRIES) {
         logs = logs.slice(0, MAX_LOG_ENTRIES)
      }

      await fsP.writeFile(LOG_FILE, JSON.stringify(logs, null, 2))
      console.log('[LOGGER] Log tersimpan:', logEntry.pushName || logEntry.sender)
   } catch (e) {
      console.error('[LOGGER] Gagal menyimpan log:', e.message)
   }
}

// Ambil log terbaru
const getLogs = async (limit = 10) => {
   try {
      const data = await fsP.readFile(LOG_FILE, 'utf-8')
      const logs = JSON.parse(data)
      return logs.slice(0, limit)
   } catch {
      return []
   }
}

// Hapus log tertentu
const deleteLog = async (messageId) => {
   try {
      let logs = []
      try {
         const data = await fsP.readFile(LOG_FILE, 'utf-8')
         logs = JSON.parse(data)
      } catch {
         return false
      }

      const filtered = logs.filter(log => log.messageKey.id !== messageId)
      await fsP.writeFile(LOG_FILE, JSON.stringify(filtered, null, 2))
      return true
   } catch {
      return false
   }
}

export const handleMessageLog = async (sock, message, db, store, setting) => {
   try {
      if (message.fromMe) return

      const messageKey = message.key
      const sender = messageKey.remoteJid
      const isGroup = sender.includes('@g.us')
      const pushName = message.pushName || 'Unknown'
      const timestamp = messageKey.timestamp
      const messageType = message.message?.type || 'unknown'

      let content = ''
      if (message.message?.conversation) {
         content = message.message.conversation
      } else if (message.message?.extendedTextMessage?.text) {
         content = message.message.extendedTextMessage.text
      } else if (message.message?.imageMessage?.caption) {
         content = `[GAMBAR] ${message.message.imageMessage.caption || 'tanpa caption'}`
      } else if (message.message?.videoMessage?.caption) {
         content = `[VIDEO] ${message.message.videoMessage.caption || 'tanpa caption'}`
      } else if (message.message?.audioMessage) {
         content = `[AUDIO]`
      } else if (message.message?.documentMessage?.caption) {
         content = `[DOCUMENT] ${message.message.documentMessage.caption || 'tanpa caption'}`
      } else if (message.message?.stickerMessage) {
         content = `[STICKER]`
      } else if (message.message?.locationMessage) {
         content = `[LOCATION]`
      } else if (message.message?.contactMessage) {
         content = `[CONTACT]`
      }

      const logEntry = {
         messageKey: {
            id: messageKey.id,
            remoteJid: messageKey.remoteJid,
            fromMe: messageKey.fromMe
         },
         sender,
         pushName,
         chat: sender,
         isGroup,
         timestamp,
         messageType,
         content: content.substring(0, 1000),
         detectedCommand: null,
         prefix: null,
         body: null
      }

      await saveLog(logEntry)

      console.log(`[LOGGER] Pesan dicatat: ${pushName} - ${content.substring(0, 50)}`)

   } catch (error) {
      console.error('[LOGGER] Error:', error.message)
   }
}
