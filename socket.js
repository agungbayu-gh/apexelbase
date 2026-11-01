/**
 * This file is part of the Starseed Bot WhatsApp project, solely developed and maintained by Lia Wynn.
 * https://github.com/itsliaaa/starseed
 *
 * All rights reserved.
 *
 * - You are NOT allowed to copy, rewrite, modify, redistribute, or reuse this file in any form.
 * - You are NOT allowed to claim this file or any part of this project as your own.
 * - This credit notice must NOT be removed or altered.
 * - This file may ONLY be used within the Starseed project.
 */

import './lib/Components/ErrorHandler.js'
import './lib/Components/Dispatcher.js'
import './config.js'

import { Boom } from '@hapi/boom'
import dotenv from 'dotenv'
import { delay, DisconnectReason, jidNormalizedUser, makeCacheableSignalKeyStore, makeWASocket, useMultiFileAuthState } from '@itsliaaa/baileys'
import { mkdir, unlink, readdir, stat, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import pino from 'pino'

import { BOT, INACTIVE_THRESHOLD, TEMP_THRESHOLD } from './lib/Constants.js'
import { Database, Store } from './lib/Database.js'
import { cleanUpFolder, getNextMidnight, toTime } from './lib/Utilities.js'
import { CommandIndex, ModuleCache, scanDirectory } from './lib/Watcher.js'
import Listener from './lib/Listener.js'
import { handleFirstTimeChat } from './events/sapa.js'
import { handleMessageLog } from './events/whatsapp-logger.js'
import { isIndonesianNumber } from './events/indonesia-only.js'


import { timestampSeconds } from './lib/wa/device.js'
import { handlePollVote } from "./plugins/apexel/menupoll.js"
import { handleReplyButton } from "./lib/handlers/reply-button.js"

dotenv.config()

const DATABASE_PATH = join(process.cwd(), databaseFilename)
const STORE_PATH = join(process.cwd(), storeFilename)
const TEMPORARY_FOLDER_PATH = join(process.cwd(), temporaryFolder)
const CHAT_FOLDER_PATH = join(process.cwd(), 'lib/chat')

// ── Daftar owner (dari .env) untuk notifikasi chat baru ──────────────────────
const OWNER_JIDS = (process.env.OWNER_JIDS ?? '')
   .split(',')
   .map(j => j.trim())
   .filter(Boolean)
const OWNER_JID_SET = new Set(OWNER_JIDS)

/**
 * Batasi pertumbuhan folder session.
 *
 * Baileys memakai multi-file auth state: satu file per key. Tipe 'lid-mapping'
 * di-persist satu file per kontak ( ribuan file, masing-masing ~15 byte tapi
 * makan 1 blok disk 4KB). Bot ini hanya dipakai chat private, jadi mapping
 * LID tidak perlu disimpan permanen — mapping tetap jalan selama proses hidup
 * karena tetap disimpan di memory cache signal store.
 *
 * HANYA 'lid-mapping' yang ditahan. 'pre-key', 'session', dan 'creds' tetap
 * ditulis normal — menghapus salah satunya bisa memicu logout / handshake ulang.
 */
const SKIP_PERSIST_TYPES = new Set(['lid-mapping'])

function limitSessionGrowth(keysStore) {
   const origSet = keysStore.set.bind(keysStore)
   const origGet = keysStore.get.bind(keysStore)

   keysStore.set = async (data) => {
      const filtered = {}
      for (const type in data) {
         if (SKIP_PERSIST_TYPES.has(type)) {
            // Buang dari persist, tapi tetap biarkan consumer membacanya dari cache
            continue
         }
         filtered[type] = data[type]
      }
      if (Object.keys(filtered).length) return origSet(filtered)
   }

   keysStore.get = async (type, ids) => {
      if (SKIP_PERSIST_TYPES.has(type)) return {}
      return origGet(type, ids)
   }

   return keysStore
}

const db = Database(DATABASE_PATH)
const store = Store(STORE_PATH)

const logger = pino({ level: 'silent' })

const listener = Listener(db, store)

// ── Reconnect state ──────────────────────────────────────────────────────────
let isRestarting = false
let reconnectAttempts = 0
const MAX_RECONNECT_DELAY = 30000   // 30 detik maksimum delay
const BASE_RECONNECT_DELAY = 1000   // 1 detik delay awal

// Disconnect reason yang FATAL — hapus session, jangan auto reconnect
const FATAL_REASONS = new Set([
   DisconnectReason.loggedOut,
   DisconnectReason.badSession,
   DisconnectReason.forbidden,
   DisconnectReason.multideviceMismatch,
])

// Disconnect reason yang butuh hapus session sebelum reconnect
const CLEAR_SESSION_REASONS = new Set([
   DisconnectReason.badSession,
   DisconnectReason.loggedOut,
   DisconnectReason.forbidden,
   DisconnectReason.multideviceMismatch,
])
// ────────────────────────────────────────────────────────────────────────────

const Socket = async () => {
   const { state, saveCreds } = await useMultiFileAuthState(authFolder)

   const sock = listener.bind(
      makeWASocket({
         version: [2, 3000, 1043857760],
         markOnlineOnConnect: true, // CS: tampil online selama bot nyambung
         logger,
         // ── Tambahan config untuk stabilitas koneksi ──
         keepAliveIntervalMs: 25000,       // ping ke WA server setiap 25 detik
         connectTimeoutMs: 60000,          // timeout koneksi awal 60 detik
         defaultQueryTimeoutMs: 60000,     // timeout tiap query 60 detik
         retryRequestDelayMs: 250,         // delay retry request
         syncFullHistory: false,           // hemat resource, koneksi lebih stabil
         // ─────────────────────────────────────────────
         shouldIgnoreJid: (jid) =>
            typeof jid === 'string' && jid.endsWith(BOT),
         cachedGroupMetadata: async (jid) => {
            let metadata = store.getGroup(jid)
            if (metadata)
               return metadata
            try {
               metadata = await sock.groupMetadata(jid)
               store.setGroup(jid, metadata)
               return metadata
            }
            catch { }
         },
         getMessage: (key) =>
            store.getMessage({
               chat: key.remoteJid,
               id: key.id
            }),
         appStateMacVerification: {
            patch: true,
            snapshot: true
         },
         auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(limitSessionGrowth(state.keys), logger)
         }
      })
   )

   sock.ev.on('creds.update', saveCreds)

   sock.ev.on('connection.update', async (update) => {
      if (update.connection === 'connecting' && pairingCode === true && !sock.authState.creds.registered) {
         const { default: PhoneNumber } = await import('awesome-phonenumber')

         const phoneNumber = PhoneNumber(
            '+' + (botNumber?.toString() || '')
               .replace(/\D/g, '')
         )

         if (!phoneNumber.isValid()) {
            console.error('❌ Invalid phone number for pairing. Please re-check the number in config.js')
            process.exit(0)
         }

         await delay(1500)

         const code = await sock.requestPairingCode(
            phoneNumber.getNumber('e164')
               .replace(/\D/g, '')
         )

         const prettyCode = code.substring(0, 4) + '-' + code.substring(4)
         console.log('🔗 Pairing code', ':', prettyCode, '\n')

         let printStep = '📑 How to Login\n'
         printStep += `1. On the WhatsApp home screen, tap (⋮) and select "Linked Devices".\n`
         printStep += `2. Tap "Link with phone number instead".\n`
         printStep += `3. Enter this code: ${prettyCode}.\n`
         printStep += `4. This code will expire in 60 seconds.\n`
         console.log(printStep)
      }

      if (update.qr && !pairingCode) {
         const { default: QRCode } = await import('qrcode')

         QRCode.toString(update.qr, {
            type: 'terminal',
            small: true
         }, (error, string) => {
            if (error || !string?.length || typeof string !== 'string')
               throw new Error('❌ There was a problem creating the QR code', {
                  cause: error
               })

            console.log(string)

            let printStep = '📑 How to Login\n'
            printStep += `1. On the WhatsApp home screen, tap (⋮) and select "Linked Devices".\n`
            printStep += `2. Scan the QR code below.\n`
            printStep += `3. This QR code will expire in 60 seconds.\n`
            console.log(printStep)
         })
      }

      if (update.connection === 'close' && !isRestarting) {
         isRestarting = true

         const reason = new Boom(update.lastDisconnect?.error)?.output?.statusCode

         // ── Tangani disconnect fatal — stop reconnect, minta pairing ulang ──
         if (FATAL_REASONS.has(reason)) {
            if (CLEAR_SESSION_REASONS.has(reason))
               await cleanUpFolder(authFolder)

            switch (reason) {
               case DisconnectReason.loggedOut:
                  console.error('❌ Device logged out, please re-pair')
                  break
               case DisconnectReason.badSession:
                  console.error('❌ Invalid session, please re-pair')
                  break
               case DisconnectReason.forbidden:
                  console.error('❌ Connection forbidden, please re-pair')
                  break
               case DisconnectReason.multideviceMismatch:
                  console.error('❌ Multi-device mismatch, please re-pair')
                  break
            }

            listener.unbind()
            isRestarting = false
            reconnectAttempts = 0
            return // STOP — tidak reconnect otomatis
         }

         // ── Tangani disconnect recoverable — reconnect dengan exponential backoff ──
         switch (reason) {
            case DisconnectReason.connectionLost:
               console.error('❌ Connection to WhatsApp lost, reconnecting...')
               break
            case DisconnectReason.connectionClosed:
               console.error('❌ Connection to WhatsApp closed, reconnecting...')
               break
            case DisconnectReason.timedOut:
               console.error('❌ Connection timed out, reconnecting...')
               break
            case DisconnectReason.connectionReplaced:
               console.error('❌ Connection replaced, reconnecting...')
               break
            case DisconnectReason.restartRequired:
               console.log('✅ Restart required by server, reconnecting...')
               break
            default:
               console.error('❌ Connection lost with unknown reason:', reason, '— reconnecting...')
         }

         listener.unbind()

         // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
         const backoffDelay = Math.min(BASE_RECONNECT_DELAY * 2 ** reconnectAttempts, MAX_RECONNECT_DELAY)
         reconnectAttempts++

         console.log(`🔃 Reconnecting in ${backoffDelay / 1000}s... (attempt ${reconnectAttempts})`)

         setTimeout(() => {
            isRestarting = false
            Socket()
         }, backoffDelay)
      }

      if (update.connection === 'open') {
         // Reset counter setelah berhasil connect
         reconnectAttempts = 0

         console.log('✅ Connected to WhatsApp as', sock.user?.name || botName)
         console.log(`🔗 Successfully loaded ${ModuleCache.size} plugins and ${CommandIndex.size} commands`)
         Object.assign(sock.user, { decodedId: jidNormalizedUser(sock.user.id), decodedLid: jidNormalizedUser(sock.user.lid) })
         await delay(3000)
      }

      if (update.receivedPendingNotifications) {
         console.log(`🕒 Loading message, please wait a moment...`)
         sock.ev.flush()
      }
   })

   sock.ev.on('groups.upsert', (groups) => {
      for (const group of groups)
         store.setGroup(group.id, group)
   })

   sock.ev.on('groups.update', (groups) => {
      for (const group of groups)
         if (store.hasGroup(group.id))
            store.setGroup(
               group.id,
               Object.assign(
                  store.getGroup(group.id) || {},
                  group
               )
            )
         else
            store.setGroup(group.id, group)
   })

   sock.ev.on('call', async (calls) => {
      for (const call of calls)
         listener.call(call)
   })

   sock.ev.on('group-participants.update', async ({ id, author, participants, action }) => {
      for (const participant of participants)
         listener.participant({ id, author, participant, action })
   })

   sock.ev.on('presence.update', async ({ id, presences }) => {
      for (const presence in presences)
         listener.presence({ id, presence, presences })
   })

   sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const message of messages) {
         // Gerbang anti-replay (2026-10-26): saat reconnect, WA mengirim
         // ulang pesan/event lama (history sync). Tanpa cek umur ini bot
         // menyapa & membalas seolah ada chat baru padahal tidak ada
         // (kasus sapaan nyasar ke chat lama 2026-10-26 15:48).
         // Pesan asli yang masuk saat bot mati tetap diproses bila
         // umurnya <= 10 menit.
         const _ts = timestampSeconds(message?.messageTimestamp)
         if (_ts && (Date.now() / 1000 - _ts) > 600) continue
         // Poll menu: tangkap vote sebelum diproses listener
         if (message.message?.interactiveResponseMessage || message.message?.buttonsResponseMessage) {
            try {
               const _rb = await handleReplyButton(sock, message)
               if (_rb) continue
            } catch (e) { console.log('[REPLYBTN] err:', e.message) }
         }
         if (message.message?.pollUpdateMessage) {
            try {
               const _pv = await handlePollVote(sock, message)
               if (_pv) continue
            } catch (e) { console.log('[POLLMENU] err:', e.message) }
         }
         listener.message(message)

         // Log semua pesan masuk
         await handleMessageLog(sock, message, db, store, db.getSetting()).catch(() => {})

         // Tampilkan "mengetik..." saat bot memproses pesan (khusus chat pribadi)
         {
            const _jid = message.key.remoteJid
            const _isPrivate = _jid?.endsWith("@s.whatsapp.net") || _jid?.endsWith("@lid")
            if (_isPrivate && !message?.key?.fromMe) {
               try {
                  await sock.presenceSubscribe(_jid).catch(() => {})
                  await sock.sendPresenceUpdate("composing", _jid)
               } catch {}
               // Berhenti otomatis setelah 8 detik (fallback kalau proses lebih cepat)
               setTimeout(() => sock.sendPresenceUpdate("paused", _jid).catch(() => {}), 8000)
            }
         }

         // Skip handleFirstTimeChat untuk pesan yang di-trigger sistem
         // Biarkan listener.message() di atas yang handle eksekusi command-nya
         if (message?._aiTriggered) continue

         // Hanya respon nomor +62 (Indonesia) — nomor luar / layanan di-skip
         if (!(await isIndonesianNumber(sock, message).catch(() => true))) continue


         // Buat m minimal dengan method yang mungkin dipakai plugin
         const mWrapped = {
            ...message,
            key: message.key,
            chat: message.key.remoteJid,
            sender: message.key.remoteJid,
            reply: (text) => sock.sendMessage(message.key.remoteJid, { text }, { quoted: message }),
            react: (emoji) => sock.sendMessage(message.key.remoteJid, { react: { key: message.key, text: emoji } }),
         }

         const handled = await handleFirstTimeChat(sock, message, {
            prefix: '.',
            footer: footer,
            botName: botName
         }).catch(() => false)

         // Sapaan di pesan pertama ditangani handleFirstTimeChat di atas.
         // Perintah (command) ditangani listener di jalur lain.
      }
   })
}

const Setup = async () => {
   await db.readFromFile()
   await store.readFromFile()

   await scanDirectory(pluginsFolder)

   await mkdir(TEMPORARY_FOLDER_PATH, { recursive: true })
   await mkdir(CHAT_FOLDER_PATH, { recursive: true })

   Socket()

   const scheduleDailyTasks = () => {
      const resetTimeout = getNextMidnight()

      setTimeout(async () => {
         const timestampMs = Date.now()
         const threshold = timestampMs - INACTIVE_THRESHOLD

         const setting = db.getSetting()

         for (const [id, user] of db.users) {
            const isProtected =
               user.banned ||
               user.premiumExpiry > 0 ||
               user.limit >= 200

            if (!isProtected && user.lastSeen < threshold)
               db.deleteUser(id)
         }

         for (const [id, group] of db.groups)
            if (group.lastActivity < threshold) {
               store.deleteGroup(id)
               db.deleteGroup(id)
            }

         for (const user of db.users.values()) {
            if (user.limit < defaultLimit)
               user.limit = defaultLimit
            user.energy = 100
         }

         setting.lastReset = timestampMs
         db.writeToFile()

         // ── Hapus otomatis semua file di lib/chat setiap hari ────────────────
         try {
            const chatFiles = await readdir(CHAT_FOLDER_PATH)
            let removedChat = 0
            for (const fileName of chatFiles) {
               const filePath = join(CHAT_FOLDER_PATH, fileName)
               await unlink(filePath).catch(() => {})
               removedChat++
            }
            console.log('🗑️ Daily chat cleanup :', removedChat, 'files removed from lib/chat')
         } catch (err) {
            console.error('❌ Failed to clean lib/chat :', err.message)
         }
         // ─────────────────────────────────────────────────────────────────────

         scheduleDailyTasks()
      }, resetTimeout)

      console.log('🔃 Daily tasks scheduled in', ':', toTime(resetTimeout))
   }

   scheduleDailyTasks()

   if (global.gc)
      setInterval(() => {
         global.gc()
         console.log('🧹 Garbage collector called, heap cleaned')
      }, gcInterval)

   const check = setInterval(async () => {
      await db.writeToFile()
      await store.writeToFile()

      console.log('📦 Database autosaved successfully')

      if (process.memoryUsage().rss >= rssLimit) {
         clearInterval(check)
         process.send('reset')
      }
   }, dataInterval)

   setInterval(async () => {
      try {
         const timestampMs = Date.now()
         const temporaryFiles = await readdir(TEMPORARY_FOLDER_PATH)

         let removedFiles = 0

         if (temporaryFiles.length)
            for (const fileName of temporaryFiles) {
               const filePath = join(TEMPORARY_FOLDER_PATH, fileName)

               const fileStatistic = await stat(filePath)
               const fileAge = timestampMs - fileStatistic.mtimeMs

               if (fileAge > TEMP_THRESHOLD) {
                  await unlink(filePath)
                  removedFiles++
               }
            }

         console.log('🗑️ Cleaned up temp folder', ':', removedFiles, 'files removed')
      }
      catch (error) {
         console.error('❌ Failed to clean temp folder', ':', error)
      }
   }, temporaryFileInterval)
}

Setup()



