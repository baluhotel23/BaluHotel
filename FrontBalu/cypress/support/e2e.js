// ***********************************************************
// This example support/e2e.js is processed and loaded automatically
// before your test files.
//
// You can use this file to set global configuration and behavior that
// modifies Cypress.
//
// You can change the location of this file or turn off automatic
// loading by modifying cypress.config.js.
//
// ***********************************************************

import './commands'

Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  return false
})
