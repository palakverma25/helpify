import "server-only";
import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        const officer = await prisma.officer.findUnique({ where: { email } });
        if (!officer) return null;
        const matches = await compare(password, officer.passwordHash);
        if (!matches) return null;

        return { id: officer.id, email: officer.email, name: officer.name };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/hi/login" },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id;
      return session;
    },
  },
};
