import { test, expect } from '@playwright/test';
require('dotenv').config();
const EmailHelper = require('../helpers/emailHelper');

test.describe('Customer verificqation', () => {

  
test('Check customer verification', async ({ request }) => {
let token;

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
  // console.log('token:', token);
  // console.log('sessionId:', sessionId);
});

await test.step('Check verification', async () => {
  const response = await request.get('/api/v1/customers/auth/verification/email/check', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  expect(response.status()).toBe(200);
  const body = await response.json();

  console.log(body.verified);
  expect(body.verified).toBe(false);
});
});

test('Send verification code for customer', async ({ request }) => {
let token;

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
  // console.log('token:', token);
  // console.log('sessionId:', sessionId);
});

await test.step('Send verification code', async () => {
  const response = await request.get('/api/v1/customers/auth/verification/email/code', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Fingerprint': 'playwright'
    }
  });

  expect(response.status()).toBe(200);
  const body = await response.json();

  //console.log(body);
  expect(body.status).toBe(true);
});
});

test('Accept code for verification customer with email Helper', async ({ request }) => {
  let token;
  const emailHelper = new EmailHelper();
  const testEmail = "211dontstoptolearn@gmail.com";

  try {
    await emailHelper.connect();

    await test.step('Sign in', async () => {
      const response = await request.post('/api/v1/customers/auth/sign-in', {
        headers: { 'X-Fingerprint': 'playwright' },
        data: {
          email: testEmail,
          password: "Password123!"
        }
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      token = body.token;
    });

    await test.step('Send verification code', async () => {
      const response = await request.get('/api/v1/customers/auth/verification/email/code', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      expect(response.status()).toBe(200);
      const body = await response.json();

      //console.log(body);
      expect(body.status).toBe(true);
      console.log('Waiting 2 seconds for email to arrive...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    await test.step('Get verification code from email', async () => {
      const verificationCode = await emailHelper.getVerificationCode(testEmail, 60000);
      console.log('Verification code from email:', verificationCode);
      
      expect(verificationCode).toBeTruthy();
      test.info().annotations.push({ type: 'verification_code', description: verificationCode });
      
      return verificationCode;
    });

    await test.step('Accept verification code', async () => {
      const verificationCode = test.info().annotations.find(a => a.type === 'verification_code')?.description;
      
      const response = await request.post('/api/v1/customers/auth/verification/email/code/check', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        data: {
          code: verificationCode
        }
      });

      expect(response.status()).toBe(200);
    });

    await test.step('Check verification', async () => {
  const response = await request.get('/api/v1/customers/auth/verification/email/check', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const body = await response.json();

  // Проверяем статус
  if (response.status() !== 200) {
    console.error(`❌ ${testEmail}: verification check failed with status ${response.status()}`);
    console.error('Response:', JSON.stringify(body, null, 2));
    expect(response.status()).toBe(200);
  }

  // Проверяем verified
  if (body.verified === true) {
    console.log(`✅ ${testEmail}: is verified!`);
  } else {
    console.error(`❌ ${testEmail}: is NOT verified`);
    console.error('Response:', JSON.stringify(body, null, 2));
  }

  expect(body.verified).toBe(true);
});

  } finally {
    await emailHelper.disconnect();
  }
});

  
});