/**
 * PM2: под управлением держим ТОЛЬКО бэкенд.
 *
 * Фронтенд (unispace-front) — это статическая сборка Vite в dist/, а не
 * процесс: держать его «живым» нечему. Его раздаёт Apache (или сам этот
 * сервер, см. STATIC_DIR в server.js). В PM2 фронт добавлять не нужно.
 *
 * Запуск:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 save
 *
 * На Windows `pm2 startup` не поддерживается — автозапуск настраивается
 * отдельно, см. docs/deploy-windows.md.
 */
module.exports = {
  apps: [
    {
      name: 'unispace-back',
      script: 'src/server.js',
      cwd: __dirname,

      // Кластер не используем: сессии лежат в PostgreSQL и переживут рестарт,
      // но модуль загрузки тестов пишет временные файлы и дёргает LibreOffice —
      // несколько воркеров будут мешать друг другу. Один процесс.
      instances: 1,
      exec_mode: 'fork',

      // .env читает сам server.js через dotenv, поэтому здесь только то,
      // что должно быть известно до старта.
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },

      // Перезапуск при падении, но без бесконечного цикла: если процесс
      // падает 10 раз подряд, PM2 останавливается и это видно в pm2 list.
      autorestart: true,
      max_restarts: 10,
      min_uptime: '20s',
      restart_delay: 3000,

      // Память: sharp и конвертация RTF дают всплески, 600M — запас.
      max_memory_restart: '600M',

      // Логи с временными метками, иначе в проде невозможно сопоставить
      // ошибку с обращением пользователя.
      time: true,
      merge_logs: true,
      out_file: 'logs/out.log',
      error_file: 'logs/error.log',

      // Файлы в проде не меняются — слежение только мешает.
      watch: false,
    },
  ],
}
