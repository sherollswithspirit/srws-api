const { mergeConfig } = require('vite');

module.exports = (config) =>
  mergeConfig(config, {
    server: {
      allowedHosts: ['srws-admin.test'],
    },
  });