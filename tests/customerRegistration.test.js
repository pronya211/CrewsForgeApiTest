import { test, expect } from '@playwright/test';

test.describe('Customer Registration', () => {
  
  test('Success registratiuon', async ({ request}) => {
    const response = await request.post('/api/v1/customers/auth/sign-up', {
      data: {
        password: "Password123!",
        confirmPassword: "Password123!",
        email: "211dontstoptolearn@gmail.com"
      }
    });

    expect(response.status()).toBe(201);
    const body = await response.json();

    console.log(body);

    expect(body).toHaveProperty('user');
    expect(body.user.email).toBe(user.email);
  });

  test('Registration with empty email field', async ({ request}) => {
   
    const response = await request.post('/api/v1/customers/auth/sign-up', {
      data: {
        password: "Password123!",
        confirmPassword: "Password123!",
        email: ""
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();

    console.log(body);

    expect(body.message).toContain('email must be an email');
    expect(body.error).toBe('Bad Request');
  });

  test('Registration with empty password field', async ({ request }) => {
    
    const response = await request.post('/api/v1/customers/auth/sign-up', {
      data: {
        password: "",
        confirmPassword: "Password123!",
        email: "211dontstoptolearn@gmail.com"
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();

    console.log(body);


    expect(body.message).toContain('Password must contain at least one digit', 
      'Password must be at least 8 characters long', 
      'Password confirmation does not match the passwor');
    expect(body.error).toBe('Bad Request');

  });

  test('Registration with empty confirm password field', async ({ request }) => {
    
    const response = await request.post('/api/v1/customers/auth/sign-up', {
      data: {
        password: "Password123!",
        confirmPassword: "",
        email: "211dontstoptolearn@gmail.com"
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();

    console.log(body);

    expect(body.message).toContain('Password confirmation does not match the password');
    expect(body.error).toBe('Bad Request');

  });

  test('Registration with empty fields', async ({ request }) => {
    
    const response = await request.post('/api/v1/customers/auth/sign-up', {
      data: {
        password: "",
        confirmPassword: "",
        email: ""
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();

    console.log(body);


    expect(body.message).toContain('email must be an email', 
      'Password must contain at least one digit', 
      'Password must be at least 8 characters long');
    expect(body.error).toBe('Bad Request');

  });

  test('Registration without an uppercase letter in the password field', async ({ request}) => {
    const response = await request.post('/api/v1/customers/auth/sign-up', {
      data: {
        password: "password123!",
        confirmPassword: "password123!",
        email: "211dontstoptolearn@gmail.com"
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();

    console.log(body);

    expect(body.message).toContain('Password must contain at least one uppercase letter');
    expect(body.error).toBe('Bad Request');
  });

  test('Registration without a special character in the password field', async ({ request}) => {
    const response = await request.post('/api/v1/customers/auth/sign-up', {
      data: {
        password: "Password123",
        confirmPassword: "Password123",
        email: "211dontstoptolearn@gmail.com"
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();

    console.log(body);

    expect(body.message).toContain('Password must contain at least one special character');
    expect(body.error).toBe('Bad Request');
  });

  test('Registration without a digits in the password field', async ({ request}) => {
    const response = await request.post('/api/v1/customers/auth/sign-up', {
      data: {
        password: "Password",
        confirmPassword: "Password",
        email: "211dontstoptolearn@gmail.com"
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();

    console.log(body);

    expect(body.message).toContain('Password must contain at least one digit');
    expect(body.error).toBe('Bad Request');
  });

  test('Registration with less than 8 characters long in the password field', async ({ request}) => {
    const response = await request.post('/api/v1/customers/auth/sign-up', {
      data: {
        password: "Passwor",
        confirmPassword: "Passwor",
        email: "211dontstoptolearn@gmail.com"
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();

    console.log(body);

    expect(body.message).toContain('Password must contain at least one digit',
      'Password must be at least 8 characters long');
    expect(body.error).toBe('Bad Request');
  });

  test('Registration with an incorrect password in the confirm password field', async ({ request }) => {
    
    const response = await request.post('/api/v1/customers/auth/sign-up', {
      data: {
        password: "Password123!",
        confirmPassword: "",
        email: "211dontstoptolearn@gmail.com"
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();

    console.log(body);

    expect(body.message).toContain('Password confirmation does not match the password');
    expect(body.error).toBe('Bad Request');

  });

  
});