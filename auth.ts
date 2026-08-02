import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { ensureIndexes, isDatabaseConfigured, users } from "@/lib/db";
import { signInSchema } from "@/lib/validation";

declare module "next-auth" {
  interface Session {
    user: { id: string; belt?: string | null } & DefaultSession["user"];
  }
  interface User {
    belt?: string | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Credentials sign-in requires JWT sessions; there is no DB session to look up.
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  trustHost: true,
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        if (!isDatabaseConfigured()) return null;

        const parsed = signInSchema.safeParse(raw);
        if (!parsed.success) return null;

        await ensureIndexes();
        const collection = await users();
        const user = await collection.findOne({ email: parsed.data.email });

        // Compare against a dummy hash when the user is missing so that the
        // response time does not reveal whether an account exists.
        const hash = user?.passwordHash ?? DUMMY_HASH;
        const ok = await bcrypt.compare(parsed.data.password, hash);
        if (!user || !ok) return null;

        return {
          id: user._id!.toHexString(),
          name: user.name,
          email: user.email,
          belt: user.belt ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.belt = user.belt ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.belt = (token.belt as string | null) ?? null;
      }
      return session;
    },
  },
});

/** bcrypt hash of a value no user can produce — used purely for timing parity. */
const DUMMY_HASH = "$2b$12$Cn3S0mQ1uZ3nJ8fFhZQ9UO0Zq5Xq0y8w3H7q9m1n2o3p4q5r6s7t8";
