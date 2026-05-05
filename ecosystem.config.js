// PM2 Ecosystem Config — Lanka Print Billing System
module.exports = {
  apps: [
    {
      name: 'billing-backend',
      script: './backend/server.js',
      cwd: '/var/www/billing-system',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/var/log/pm2/billing-backend-error.log',
      out_file: '/var/log/pm2/billing-backend-out.log',
      merge_logs: true,
    },
  ],
};
