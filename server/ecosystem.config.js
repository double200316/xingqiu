module.exports = {
  apps: [{
    name: 'xingqiu-api',
    script: 'server.js',
    cwd: '/var/www/xingqiu-api',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production',
      JWT_SECRET: 'xingqiu-2026-secret-key-please-change'
    },
    error_file: '/var/log/xingqiu-api-error.log',
    out_file: '/var/log/xingqiu-api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
