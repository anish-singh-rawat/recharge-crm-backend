export default {
  apps: [
    {
      name: 'recharge-crm-backend',
      script: 'src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      interpreter: 'node',
      interpreter_args: '--experimental-vm-modules',
      watch: false,
      max_memory_restart: '500M',
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'development',
        PORT: 8080,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2/error.log',
      out_file: './logs/pm2/out.log',
      combine_logs: true,
      merge_logs: true,
    },
  ],
};
