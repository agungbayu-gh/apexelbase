// plugins/logger.js
// Command untuk mengelola log pesan WhatsApp
import fs from 'fs/promises'
import path from 'path'

const LOG_FILE = path.resolve('./data/logs/wa-messages.json')

// Ambil log pesan
const getLogs = async (limit = 20) => {
   try {
      const data = await fs.readFile(LOG_FILE, 'utf-8')
      const logs = JSON.parse(data)
      return logs.slice(0, limit)
   } catch {
      return []
   }
}

// Hapus log
const deleteLog = async (messageId) => {
   try {
      let logs = []
      try {
         const data = await fs.readFile(LOG_FILE, 'utf-8')
         logs = JSON.parse(data)
      } catch {
         return { success: false, message: 'Log tidak ditemukan' }
      }

      const filtered = logs.filter(log => log.messageKey.id !== messageId)
      await fs.writeFile(LOG_FILE, JSON.stringify(filtered, null, 2))
      return { success: true, message: 'Log berhasil dihapus' }
   } catch (e) {
      return { success: false, message: e.message }
   }
}

// Kirim balasan ke pesan yang di-intercept
const replyToMessage = async (sock, messageKey, text) => {
   try {
      await sock.sendMessage(messageKey.remoteJid, {
         text: text,
         quoted: {
            key: messageKey,
            id: messageKey.id,
            remoteJid: messageKey.remoteJid
         }
      })
      return { success: true, message: 'Balasan terkirim' }
   } catch (e) {
      return { success: false, message: e.message }
   }
}

export default {
   command: ['logger', 'log', 'intercept'],
   hidden: ['lihatlog', 'logpesan', 'balaslog'],
   category: 'owner',

   async run(m, {
      sock,
      args
   }) {
      const subcommand = args[0]?.toLowerCase()

      // --- LIHAT LOG ---
      if (subcommand === 'lihat' || subcommand === 'list' || subcommand === 'daftar') {
         const limit = parseInt(args[1]) || 20
         const logs = await getLogs(limit)

         if (logs.length === 0) {
            return m.reply('📭 Belum ada pesan yang terekam.')
         }

         let msg = `📋 *Log Pesan Terakhir (${logs.length} terekam)*\n\n`
         for (let i = 0; i < logs.length; i++) {
            const log = logs[i]
            const time = new Date(log.timestamp).toLocaleString('id-ID', {
               hour: '2-digit',
               minute: '2-digit'
            })
            msg += `${i + 1}. [${time}] ${log.pushName || log.sender.split('@')[0]}\n`
            msg += `   Chat: ${log.isGroup ? 'Grup' : 'Private'}\n`
            msg += `   Tipe: ${log.messageType}\n`
            msg += `   Isi: ${log.content.substring(0, 100)}${log.content.length > 100 ? '...' : ''}\n`
            msg += `   Command: ${log.detectedCommand || 'none'}\n\n`
         }

         return m.reply(msg)
      }

      // --- BALAS PESAN ---
      if (subcommand === 'balas' || subcommand === 'reply') {
         const logIndex = parseInt(args[1])
         const replyText = args.slice(2).join(' ')

         if (isNaN(logIndex)) {
            return m.reply('❌ Format: .logger balas <nomor> <teks balasan>\nContoh: .logger balas 1 Halo, terima kasih!')
         }

         const logs = await getLogs(logIndex + 10) // Ambil lebih banyak untuk memastikan index ada
         const targetLog = logs[logIndex - 1] // Zero-based index

         if (!targetLog) {
            return m.reply(`❌ Log ke-${logIndex} tidak ditemukan. Cek .logger lihat untuk melihat daftar.`)
         }

         const result = await replyToMessage(sock, targetLog.messageKey, replyText)
         return m.reply(`📤 ${result.message}`)
      }

      // --- HAPUS LOG ---
      if (subcommand === 'hapus' || subcommand === 'delete' || subcommand === 'bersihkan') {
         const logIndex = parseInt(args[1])

         if (isNaN(logIndex)) {
            // Hapus semua log
            try {
               await fs.writeFile(LOG_FILE, JSON.stringify([], null, 2))
               return m.reply('🗑️ Semua log pesan berhasil dihapus.')
            } catch (e) {
               return m.reply(`❌ Gagal: ${e.message}`)
            }
         }

         const logs = await getLogs(logIndex + 1)
         const targetLog = logs[logIndex - 1]

         if (!targetLog) {
            return m.reply(`❌ Log ke-${logIndex} tidak ditemukan.`)
         }

         const result = await deleteLog(targetLog.messageKey.id)
         return m.reply(`🗑️ ${result.message}`)
      }

      // --- INFO ---
      return m.reply(`📥 *WhatsApp Message Logger*\n\n` +
         `Fitur:\n` +
         `• Semua pesan masuk otomatis terekam\n` +
         `• Komando:\n` +
         `  .logger lihat [nomor] - Lihat log pesan (default 20)\n` +
         `  .logger balas <nomor> <teks> - Balas pesan terpilih\n` +
         `  .logger hapus [nomor] - Hapus log (kosongkan untuk semua)\n\n` +
         `Contoh:\n` +
         `• .logger lihat 10\n` +
         `• .logger balas 1 Halo! Terima kasih atas pesannya.`)
   }
}
