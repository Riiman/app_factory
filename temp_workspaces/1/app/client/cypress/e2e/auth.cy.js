describe('User Registration and Login E2E', () => {
  it('should register a new user and log in', () => {
    cy.visit('http://localhost:3000/register');
    cy.get('input[name="username"]').type('e2euser');
    cy.get('input[name="email"]').type('e2euser@example.com');
    cy.get('input[name="password"]').type('password');
    cy.get('button[type="submit"]').click();
    cy.contains('Dashboard');
    cy.get('button').contains('Logout').click();
    cy.visit('http://localhost:3000/login');
    cy.get('input[name="username"]').type('e2euser');
    cy.get('input[name="password"]').type('password');
    cy.get('button[type="submit"]').click();
    cy.contains('Dashboard');
  });
});