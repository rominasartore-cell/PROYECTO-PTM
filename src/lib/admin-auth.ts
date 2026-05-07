import crypto from 'crypto';

export function generatePasswordHash(password: string): string {
  // Simple SHA256 hash for this demo. In production, use bcrypt properly
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  const computed = generatePasswordHash(password);
  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(hash)
  );
}

export function getAdminCredentials(): { username: string; passwordHash: string } {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const passwordHash = process.env.ADMIN_PASSWORD_HASH ||
    generatePasswordHash('admin');

  return { username, passwordHash };
}

export function validateAdminLogin(username: string, password: string): boolean {
  const { username: envUsername, passwordHash } = getAdminCredentials();

  if (username !== envUsername) {
    return false;
  }

  return verifyPassword(password, passwordHash);
}

export const ADMIN_SESSION_TOKEN_KEY = 'ptm-admin-session';

export function createAdminSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
