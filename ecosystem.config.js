module.exports = {
  apps: [
    {
      name: "recharge-crm-backend",
      script: "./src/server.js",

      instances: 1,
      exec_mode: "fork",

      interpreter: "node",

      watch: false,

      max_memory_restart: "400M",
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: "10s",

      env: {
        NODE_ENV: "production",
        PORT: 8080
      },

      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      error_file: "./logs/pm2/error.log",
      out_file: "./logs/pm2/out.log",

      merge_logs: true
    }
  ]
};