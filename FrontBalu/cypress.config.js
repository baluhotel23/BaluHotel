const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.spec.js',
    supportFile: 'cypress/support/e2e.js',
    video: false,
    setupNodeEvents(on, config) {
      // implement node event listeners here if needed
      return config;
    }
  }
});
