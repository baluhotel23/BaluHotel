// Custom commands for setting localStorage
Cypress.Commands.add('setUser', (user) => {
  window.localStorage.setItem('user', JSON.stringify(user));
});

Cypress.Commands.add('setToken', (token) => {
  window.localStorage.setItem('token', token);
});
