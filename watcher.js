#!/usr/bin/env node
// watcher.js - Auto restart bot saat file esensial berubah
import { spawn } from 'child_process'
import { watch, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const STARSEED_DIR = __dirname

// Hanya file-file yang krusial untuk restart bot (TERTENTU SAJA)
// Jangan pakai watch folder biar ga spam restart
const WATCH_FILES = [
   resolve(STARSEED_DIR, 'index.js'),
   resolve(STARSEED_DIR, 'config.js'),
   resolve(STARSEED_DIR, 'events/sapa.js'),
   resolve(STARSEED_DIR, 'events/whatsapp-logger.js'),
   resolve(STARSEED_DIR, 'plugins/apexel/peraturan.js'),
   resolve(STARSEED_DIR, 'plugins/apexel/pricelist.js'),
   resolve(STARSEED_DIR, 'plugins/apexel/lokasi.js'),
   resolve(STARSEED_DIR, 'plugins/apexel/pembayaran.js'),
]

let botProcess = null
let restartTimeout = null

function startBot() {
   console.log('[WATCHER] Starting bot...')
   
   if (botProcess) {
      botProcess.kill('SIGTERM')
      botProcess = null
   }

   botProcess = spawn('node', ['--max-old-space-size=256', '--expose-gc', 'index.js'], {
      cwd: STARSEED_DIR,
      env: { ...process.env, NODE_ENV: 'production', MALLOC_ARENA_MAX: '2' },
      stdio: 'inherit',
      shell: true
   })

   botProcess.on('close', (code) => {
      console.log(`[WATCHER] Bot exited with code ${code}`)
      botProcess = null
      if (!manualStop) {
         setTimeout(startBot, 2000)
      }
   })

   botProcess.on('error', (err) => {
      console.error('[WATCHER] Bot error:', err.message)
   })
}

function restartBot(filePath) {
   if (restartTimeout) clearTimeout(restartTimeout)
   restartTimeout = setTimeout(() => {
      console.log(`[WATCHER] File berubah: ${filePath.split('/').pop()}, restarting bot...`)
      startBot()
   }, 800) // Debounce 800ms agar ga spam restart
}

let manualStop = false

console.log('[WATCHER] Monitoring file-file spesifik...')
console.log('[WATCHER] Press Ctrl+C to stop')

// Watch hanya file-file spesifik (BUKAN FOLDER)
for (const filePath of WATCH_FILES) {
   if (existsSync(filePath)) {
      watch(filePath, (eventType, filename) => {
         if (!filename) return
         console.log(`[WATCHER] ${eventType}: ${filePath.split('/').pop()}`)
         restartBot(filePath)
      })
   } else {
      console.log(`[WATCHER] File tidak ada, skip: ${filePath.split('/').pop()}`)
   }
}

// Start bot
startBot()

// Handle Ctrl+C
process.on('SIGINT', () => {
   console.log('\n[WATCHER] Stopping...')
   manualStop = true
   if (botProcess) botProcess.kill('SIGTERM')
   process.exit(0)
})

process.on('SIGTERM', () => {
   console.log('\n[WATCHER] Stopping...')
   manualStop = true
   if (botProcess) botProcess.kill('SIGTERM')
   process.exit(0)
})
