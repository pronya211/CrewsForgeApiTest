import { test, expect } from '@playwright/test';

test.describe('Customer authorizatiuon', () => {
  
  const user = { email: '211dontstoptolearn@gmail.com' };

test('Success authorizatiuon', async ({ request}) => {
const response = await request.post('/api/v1/customers/auth/sign-in', {
  headers: {
    'X-Fingerprint': 'playwright'
  },
  data: {
    email: "211dontstoptolearn@gmail.com",
    password: "Password123!"
  }
});

expect(response.status()).toBe(200);
const body = await response.json();

console.log(body);

expect(body).toHaveProperty('user');
expect(body).toHaveProperty('token');
expect(body.user.email).toBe(user.email);
expect(body.user.userOnRole[0].role.type).toBe('CUSTOMER');
});
  
test('Get customer', async ({ request }) => {
let token, userId, sessionId;

await test.step('Sign in', async () => {
  const response = await request.post('/api/v1/customers/auth/sign-in', {
    headers: { 'X-Fingerprint': 'playwright' },
    data: {
      email: "211dontstoptolearn@gmail.com",
      password: "Password123!"
    }
  });

  expect(response.status()).toBe(200);
  const body = await response.json();
  token = body.token;
  sessionId = body.session.id;
  userId = body.user.id;
  // console.log('token:', token);
  // console.log('sessionId:', sessionId);
});

await test.step('Get customer', async () => {
  const response = await request.get('/api/v1/customers/auth/me', {
    headers: {
      'X-Fingerprint': 'playwright',
      'Authorization': `Bearer ${token}`
    }
  });

  expect(response.status()).toBe(200);
  const body = await response.json();

  console.log(body);

  expect(body.user.email).toBe(user.email);
  expect(body.user.id).toBe(userId);


});
});

test('Authorizatiuon with empty email field', async ({ request}) => {
   
    const response = await request.post('/api/v1/customers/auth/sign-in', {
      headers: { 'X-Fingerprint': 'playwright' },
      data: {
        email: "",
        password: "Password123!"
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();

    console.log(body);

    expect(body.message).toContain('email must be an email');
    expect(body.error).toBe('Bad Request');
  });

test('Authorizatiuon with empty password field', async ({ request}) => {
   
    const response = await request.post('/api/v1/customers/auth/sign-in', {
      headers: { 'X-Fingerprint': 'playwright' },
      data: {
        email: "211dontstoptolearn@gmail.com",
        password: ""
      }
    });

    expect(response.status()).toBe(403);
    const body = await response.json();

    console.log(body);

    expect(body.message).toContain('Forbidden! Check authentication credentials.');
    expect(body.error).toBe('Forbidden');
  });

test('Authorizatiuon with incorrect email', async ({ request}) => {
   
    const response = await request.post('/api/v1/customers/auth/sign-in', {
      headers: { 'X-Fingerprint': 'playwright' },
      data: {
        email: "11dontstoptolearn@gmail.com",
        password: "Password123!"
      }
    });

    expect(response.status()).toBe(403);
    const body = await response.json();

    console.log(body);

    expect(body.message).toContain('Forbidden! Check authentication credentials.');
    expect(body.error).toBe('Forbidden');
  });

test('Authorizatiuon with incorrect password', async ({ request}) => {
   
    const response = await request.post('/api/v1/customers/auth/sign-in', {
      headers: { 'X-Fingerprint': 'playwright' },
      data: {
        email: "11dontstoptolearn@gmail.com",
        password: "Password12"
      }
    });

    expect(response.status()).toBe(403);
    const body = await response.json();

    console.log(body);

    expect(body.message).toContain('Forbidden! Check authentication credentials.');
    expect(body.error).toBe('Forbidden');
  });

test('Success sigh out', async ({ request }) => {
let token, sessionId;

await test.step('Sign in', async () => {
  const response = await request.post('/api/v1/customers/auth/sign-in', {
    headers: { 'X-Fingerprint': 'playwright' },
    data: {
      email: "211dontstoptolearn@gmail.com",
      password: "Password123!"
    }
  });

  expect(response.status()).toBe(200);
  const body = await response.json();
  token = body.token;
  sessionId = body.session.id;
  console.log('token:', token);
  console.log('sessionId:', sessionId);
});

await test.step('Sign out', async () => {
  const response = await request.get('/api/v1/customers/auth/sign-out', {
    headers: {
      'X-Fingerprint': 'playwright',
      'Authorization': `Bearer ${token}`,
      'X-Session-Id': `${sessionId}`
    }
  });

  // 204 No Content typically has no body — don't call .json() on 204
  expect(response.status()).toBe(204);

});
});

  
});