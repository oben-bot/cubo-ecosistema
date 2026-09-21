import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

/** Lista de correos autorizados a usar la app (dueño + hasta 2 de respaldo).
 *  Se configura en .env.local como ALLOWED_ADMIN_EMAILS, separados por coma.
 *  Cualquier otra cuenta de Google que intente entrar es rechazada aquí mismo,
 *  antes de que se cree sesión alguna. */
function getAllowedEmails(): string[] {
  const raw = process.env.ALLOWED_ADMIN_EMAILS || '';
  return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const allowed = getAllowedEmails();
      // Si no se configuró la lista, por seguridad NO se permite ningún login
      // (evita que la app quede abierta a cualquiera por un .env.local vacío).
      if (allowed.length === 0) return false;
      const email = (user.email || '').toLowerCase();
      return allowed.includes(email);
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    // Cuando alguien fuera de la lista intenta entrar, lo mandamos a una
    // pantalla clara en vez del error genérico de NextAuth.
    error: '/acceso-denegado',
  },
  session: { strategy: 'jwt' },
};
