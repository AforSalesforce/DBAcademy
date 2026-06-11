import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

// In production, replace with a real database
const users: Array<{
  id: string;
  email: string;
  name: string;
  password: string;
  role: 'student' | 'teacher' | 'admin';
  institution?: string;
  plan: 'free' | 'pro' | 'institution';
}> = [];

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        name: { label: 'Name', type: 'text' },
        action: { label: 'Action', type: 'text' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;
        const name = credentials?.name as string;
        const action = credentials?.action as string;

        if (!email || !password) {
          throw new Error('Email and password are required');
        }

        if (action === 'register') {
          const exists = users.find(u => u.email === email);
          if (exists) throw new Error('User already exists');

          const hashedPassword = await bcrypt.hash(password, 12);
          const newUser = {
            id: crypto.randomUUID(),
            email,
            name: name || email.split('@')[0],
            password: hashedPassword,
            role: 'student' as const,
            plan: 'free' as const,
          };
          users.push(newUser);
          return { id: newUser.id, email: newUser.email, name: newUser.name };
        }

        // Login
        const user = users.find(u => u.email === email);
        if (!user) throw new Error('No account found with this email');

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) throw new Error('Invalid password');

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth/signin',
  },
  // Dev-only fallback; in production NEXTAUTH_SECRET must be set (NextAuth will throw if missing)
  secret: process.env.NEXTAUTH_SECRET ?? (process.env.NODE_ENV === 'production' ? undefined : 'dbacademy-dev-secret'),
});
