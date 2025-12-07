const request = require('supertest');
const jwt = require('jsonwebtoken');

// Set a stable test secret for verifying tokens in test environment
process.env.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'test_secret_key';

const app = require('../src/app');

// Helper to build token for a role
function tokenFor(role = 'admin') {
  return jwt.sign({ n_document: '000', role, email: `${role}@test` }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
}

describe('Role restrictions - admin write operations', () => {
  test('Admin cannot create a purchase (POST /inventory/purchase)', async () => {
    const token = tokenFor('admin');
    const res = await request(app)
      .post('/inventory/purchase')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(403);
  }, 15000);

  test('Admin cannot check-in a booking (POST /reception/checkin/:bookingId)', async () => {
    const token = tokenFor('admin');
    const res = await request(app)
      .post('/reception/checkin/123')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(403);
  }, 15000);

  test('Admin cannot create services (POST /admin/services)', async () => {
    const token = tokenFor('admin');
    const res = await request(app)
      .post('/admin/services')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Prueba Servicio' });
    expect(res.status).toBe(403);
  }, 15000);
});
