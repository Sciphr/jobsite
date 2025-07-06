// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { authPrisma } from "../../../lib/prisma"; // Use direct connection for auth
import bcrypt from "bcryptjs";

export const authOptions = {
  adapter: PrismaAdapter(authPrisma), // Use authPrisma for adapter
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("🔍 Authorize called with:", {
          email: credentials?.email,
          hasPassword: !!credentials?.password,
        });

        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Missing credentials");
          return null;
        }

        try {
          console.log("🔍 Looking up user with email:", credentials.email);

          // Fixed: Use authPrisma consistently
          const user = await authPrisma.user.findUnique({
            where: { email: credentials.email },
          });

          console.log("🔍 User found:", {
            found: !!user,
            hasPassword: !!user?.password,
            userId: user?.id,
          });

          if (!user || !user.password) {
            console.log("❌ User not found or no password");
            return null;
          }

          console.log("🔍 Comparing passwords...");
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          console.log("🔍 Password valid:", isPasswordValid);

          if (!isPasswordValid) {
            console.log("❌ Invalid password");
            return null;
          }

          const returnUser = {
            id: user.id,
            email: user.email,
            name: user.firstName + (user.lastName ? " " + user.lastName : ""),
          };

          console.log("✅ Authorization successful:", returnUser);
          return returnUser;
        } catch (error) {
          console.error("❌ Auth error:", error);
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup",
  },

  callbacks: {
    async jwt({ token, user, account }) {
      console.log("🔍 JWT callback:", { hasUser: !!user, hasToken: !!token });
      if (user) {
        token.id = user.id;
        console.log("✅ Added user ID to token:", user.id);
      }
      return token;
    },

    async session({ session, token }) {
      console.log("🔍 Session callback:", {
        hasSession: !!session,
        hasToken: !!token,
      });
      if (token) {
        session.user.id = token.id;
        console.log("✅ Added user ID to session:", token.id);
      }
      return session;
    },

    async signIn({ user, account, profile }) {
      if (account?.provider === "google" || account?.provider === "github") {
        try {
          // Fixed: Use authPrisma consistently
          const existingUser = await authPrisma.user.findUnique({
            where: { email: user.email },
          });

          if (existingUser) {
            await authPrisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state,
              },
            });
          }
        } catch (error) {
          console.error("SignIn callback error:", error);
          return false;
        }
      }
      return true;
    },
  },

  // Add debug logging for development
  debug: true,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
