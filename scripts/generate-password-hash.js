#!/usr/bin/env node

const crypto = require('crypto');

const password = process.argv[2] || 'admin';

function generatePasswordHash(pwd) {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

const hash = generatePasswordHash(password);

console.log(`Password: ${password}`);
console.log(`Hash: ${hash}`);
console.log('\nADD THIS TO YOUR .env.local:');
console.log(`ADMIN_PASSWORD_HASH=${hash}`);
