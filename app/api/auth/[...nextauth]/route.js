// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { authPrisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions = {
  adapter: PrismaAdapter(authPrisma),
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

          const user = await authPrisma.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              email: true,
              password: true,
              firstName: true,
              lastName: true,
              role: true,
              privilegeLevel: true,
              isActive: true,
            },
          });

          console.log("🔍 User found:", {
            found: !!user,
            hasPassword: !!user?.password,
            userId: user?.id,
            role: user?.role,
            privilegeLevel: user?.privilegeLevel,
            isActive: user?.isActive,
          });

          if (!user || !user.password) {
            console.log("❌ User not found or no password");
            return null;
          }

          if (!user.isActive) {
            console.log("❌ User account is deactivated");
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
            role: user.role,
            privilegeLevel: user.privilegeLevel,
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
        token.role = user.role;
        token.privilegeLevel = user.privilegeLevel;
        console.log("✅ Added user details to token:", {
          id: user.id,
          role: user.role,
          privilegeLevel: user.privilegeLevel,
        });
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
        session.user.role = token.role;
        session.user.privilegeLevel = token.privilegeLevel;
        console.log("✅ Added user details to session:", {
          id: token.id,
          role: token.role,
          privilegeLevel: token.privilegeLevel,
        });
      }
      return session;
    },

    // Add this callback to refresh user data from database
    async jwt({ token, user, trigger, session }) {
      console.log("🔍 JWT callback:", {
        hasUser: !!user,
        hasToken: !!token,
        trigger,
      });

      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.privilegeLevel = user.privilegeLevel;
        console.log("✅ Added user details to token:", {
          id: user.id,
          role: user.role,
          privilegeLevel: user.privilegeLevel,
        });
      }

      // Refresh user data from database when session is accessed
      if (trigger === "update" || (!token.role && token.id)) {
        try {
          const refreshedUser = await authPrisma.user.findUnique({
            where: { id: token.id },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              privilegeLevel: true,
              isActive: true,
            },
          });

          if (refreshedUser) {
            token.role = refreshedUser.role;
            token.privilegeLevel = refreshedUser.privilegeLevel;
            token.isActive = refreshedUser.isActive;
            console.log("🔄 Refreshed user data:", {
              role: refreshedUser.role,
              privilegeLevel: refreshedUser.privilegeLevel,
            });
          }
        } catch (error) {
          console.error("Error refreshing user data:", error);
        }
      }

      return token;
    },

    async signIn({ user, account, profile }) {
      if (account?.provider === "google" || account?.provider === "github") {
        try {
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

  debug: true,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
