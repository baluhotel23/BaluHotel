/* eslint-env mocha, cypress */
/* global cy, describe, it, beforeEach */

describe('Admin unauthorized behavior', () => {
  beforeEach(() => {
    // Reset localStorage and set tokens/user for admin or owner
    cy.clearLocalStorage();
  });

  it('Admin sees disabled NUEVA COMPRA button', () => {
    cy.visit('/purchaseForm');
    // Mock the user as admin in localStorage
    cy.window().then((win) => {
      win.localStorage.setItem('user', JSON.stringify({ role: 'admin' }));
      // Simulate token too so app thinks authenticated
      win.localStorage.setItem('token', 'test-token');
    });
    cy.reload();

    cy.contains('NUEVA COMPRA').should('exist').and('be.disabled');
    // Or if label shows NO AUTORIZADO instead of button text
    cy.contains('NO AUTORIZADO').should('exist');
  });

  it('Owner submitting purchase sees toast on 403 returned from server', () => {
    // We will stub the POST request to return 403 so we can test global handling
    cy.intercept('POST', '/inventory/purchase', {
      statusCode: 403,
      body: { message: 'No tienes permisos para crear compras' }
    }).as('mockPurchase');

    cy.window().then((win) => {
      win.localStorage.setItem('user', JSON.stringify({ role: 'owner' }));
      win.localStorage.setItem('token', 'test-owner-token');
    });

    cy.visit('/purchaseForm');

    // Fill minimal required fields for the form to be submittable
    cy.get('input[name="supplier"]').type('Test Supplier');
    cy.get('input[name="invoiceNumber"]').type('INV-0001');

    // Add one item
    cy.get('button').contains('Agregar Item').click();
    cy.get('input[placeholder="Descripción del producto o servicio"]').first().type('Item A');
    cy.get('input[type="number"]').first().clear().type('1');
    cy.get('input[placeholder="Precio Unitario"]').first().type('10');

    cy.contains('Revisar Factura').click();

    // Submit, expecting the POST to be stubbed with 403 and toast to appear
    cy.contains('Enviar factura').click();

    cy.wait('@mockPurchase');

    // Assert toast is visible with the message
    cy.get('.Toastify__toast').should('contain.text', 'No tienes permisos para crear compras');
  });

  it('Admin can view Balance Financiero page but should not see edit-only controls', () => {
    // Setup admin user
    cy.window().then((win) => {
      win.localStorage.setItem('user', JSON.stringify({ role: 'admin' }));
      win.localStorage.setItem('token', 'test-token-admin');
    });
    cy.visit('/balance');

    // Should see main header
    cy.contains('Balance Financiero').should('exist');

    // Download button should exist and be enabled (read-only action)
    cy.get('button').contains(/Descargar Excel|Descargar/).should('exist').and('not.be.disabled');

    // There should be no owner-only edit buttons (example: 'Guardar' or 'Editar' labels)
    cy.contains('Guardar').should('not.exist');
    cy.contains('Editar').should('not.exist');
  });
});
