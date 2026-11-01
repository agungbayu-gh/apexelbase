// pm2.config.cjs — konfigurasi pm2 untuk bot Apexel Caruban
module.exports = {
   apps: [{
      name: 'apexel-bot',
      script: './index.js',
      cwd: '/root/starseed',
      interpreter: 'node',
      // Pakai argumen yang sama dengan npm start, tapi tanpa shell npm
      node_args: [
         '--max-old-space-size=300',
         '--expose-gc'
      ],
      env: {
         NODE_ENV: 'production',
         MALLOC_ARENA_MAX: '2'
      },
      autorestart: true,
      max_restarts: 10,
      min_uptime: '20s',
      // Delay sebelum restart
      restart_delay: 5000,
      // Restart otomatis kalau RAM bot lewat 280MB
      max_memory_restart: '280M',
      // Log rotation
      max_log_size: '20M',
      retain_logs: 3,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: '/root/starseed/logs/pm2-out.log',
      error_file: '/root/starseed/logs/pm2-error.log',
      kill_timeout: 5000
   }]
}