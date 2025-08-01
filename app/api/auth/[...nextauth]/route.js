// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { authPrisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import { logAuditEvent } from "../../../../lib/auditMiddleware";
import { getUserPermissions, getUserRoles } from "../../../lib/permissions";

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
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await authPrisma.users.findUnique({
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

          if (!user || !user.password) {
            // Log failed login attempt - user not found
            await logAuditEvent({
              eventType: "LOGIN",
              category: "SECURITY",
              action: "Failed login attempt - user not found",
              description: `Failed login attempt for non-existent email: ${credentials.email}`,
              actorType: "user",
              actorName: credentials.email,
              severity: "warning",
              status: "failure",
              tags: ["authentication", "login", "failed", "user_not_found"]
            }).catch(console.error);
            return null;
          }

          if (!user.isActive) {
            // Log failed login attempt - account deactivated
            await logAuditEvent({
              eventType: "LOGIN",
              category: "SECURITY", 
              entityType: "user",
              entityId: user.id,
              entityName: credentials.email,
              actorId: user.id,
              actorType: "user",
              actorName: credentials.email,
              action: "Failed login attempt - account deactivated",
              description: `Login attempt blocked for deactivated account: ${credentials.email}`,
              relatedUserId: user.id,
              severity: "warning",
              status: "failure",
              tags: ["authentication", "login", "failed", "account_deactivated"]
            }).catch(console.error);
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            // Log failed login attempt - invalid password
            await logAuditEvent({
              eventType: "LOGIN",
              category: "SECURITY",
              entityType: "user", 
              entityId: user.id,
              entityName: credentials.email,
              actorId: user.id,
              actorType: "user",
              actorName: credentials.email,
              action: "Failed login attempt - invalid password",
              description: `Login failed due to invalid password for: ${credentials.email}`,
              relatedUserId: user.id,
              severity: "warning",
              status: "failure",
              tags: ["authentication", "login", "failed", "invalid_password"]
            }).catch(console.error);
            return null;
          }

          const returnUser = {
            id: user.id,
            email: user.email,
            name: user.firstName + (user.lastName ? " " + user.lastName : ""),
            role: user.role,
            privilegeLevel: user.privilegeLevel,
          };
          // Log successful login attempt
          await logAuditEvent({
            eventType: "LOGIN",
            category: "USER",
            entityType: "user",
            entityId: user.id,
            entityName: credentials.email,
            actorId: user.id,
            actorType: "user",
            actorName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || credentials.email,
            action: "User logged in successfully",
            description: `Successful login for user: ${credentials.email}`,
            relatedUserId: user.id,
            severity: "info",
            status: "success",
            tags: ["authentication", "login", "success"]
          }).catch(console.error);
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
    // Removed temporary short maxAge that was causing loops
  },

  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup",
  },

  callbacks: {
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.privilegeLevel = user.privilegeLevel;
      }

      // Refresh permissions and user data on token update or if data isn't cached
      const shouldRefresh = token.id && (!token.permissions || !token.roles || trigger === 'update');
      if (shouldRefresh) {
        try {
          // Fetch fresh user data to ensure role/privilegeLevel are current
          const freshUser = await authPrisma.users.findUnique({
            where: { id: token.id },
            select: {
              id: true,
              role: true,
              privilegeLevel: true,
              isActive: true,
            },
          });

          if (freshUser) {
            // Update token with fresh user data
            token.role = freshUser.role;
            token.privilegeLevel = freshUser.privilegeLevel;
            token.isActive = freshUser.isActive;
          }

          const [permissions, roles] = await Promise.all([
            getUserPermissions(token.id),
            getUserRoles(token.id)
          ]);

          // Store permissions as simple array for efficient client-side checking
          token.permissions = permissions.map(p => `${p.resource}:${p.action}`);
          token.roles = roles;
          token.permissionsLastUpdated = Date.now();
        } catch (error) {
          console.error("❌ Error fetching permissions for token:", error);
          token.permissions = [];
          token.roles = [];
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.privilegeLevel = token.privilegeLevel;
        session.user.permissions = token.permissions || [];
        session.user.roles = token.roles || [];
        session.user.permissionsLastUpdated = token.permissionsLastUpdated;
      }
      return session;
    },

    async signIn({ user, account, profile }) {
      if (account?.provider === "google" || account?.provider === "github") {
        try {
          const existingUser = await authPrisma.users.findUnique({
            where: { email: user.email },
          });

          // Account creation skipped - no account table in schema
        } catch (error) {
          console.error("SignIn callback error:", error);
          return false;
        }
      }
      return true;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
