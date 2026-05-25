export function getJwtSecret() {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV !== 'production') {
    return 'slideengage-local-development-secret';
  }

  throw new Error('JWT_SECRET is required in production. Add JWT_SECRET in Vercel Environment Variables, then redeploy.');
}
