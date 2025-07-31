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
        "🔍 Authorize called with:",
          {
            email: credentials?.email,
            hasPassword: !!credentials?.password,
          };

        if (!credentials?.email || !credentials?.password) {
          ("❌ Missing credentials");
          return null;
        }

        try {
          "🔍 Looking up user with email:", credentials.email;

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

          "🔍 User found:",
            {
              found: !!user,
              hasPassword: !!user?.password,
              userId: user?.id,
              role: user?.role,
              privilegeLevel: user?.privilegeLevel,
              isActive: user?.isActive,
            };

          if (!user || !user.password) {
            ("❌ User not found or no password");
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
            ("❌ User account is deactivated");
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

          ("🔍 Comparing passwords...");
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          "🔍 Password valid:", isPasswordValid;

          if (!isPasswordValid) {
            ("❌ Invalid password");
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

          "✅ Authorization successful:", returnUser;
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
  },

  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup",
  },

  callbacks: {
    async jwt({ token, user, account, trigger }) {
      console.log("🔍 JWT callback:", { hasUser: !!user, hasToken: !!token, trigger });
      
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.privilegeLevel = user.privilegeLevel;
        console.log("✅ Added user details to token:",
          {
            id: user.id,
            role: user.role,
            privilegeLevel: user.privilegeLevel,
          });
      }

      // Refresh permissions on token update or if permissions aren't cached
      if (token.id && (!token.permissions || !token.roles || trigger === 'update')) {
        try {
          const [permissions, roles] = await Promise.all([
            getUserPermissions(token.id),
            getUserRoles(token.id)
          ]);

          // Store permissions as simple array for efficient client-side checking
          token.permissions = permissions.map(p => `${p.resource}:${p.action}`);
          token.roles = roles;
          token.permissionsLastUpdated = Date.now();

          console.log("✅ Updated token with permissions:", {
            userId: token.id,
            permissionCount: token.permissions.length,
            roleCount: token.roles.length
          });
        } catch (error) {
          console.error("❌ Error fetching permissions for token:", error);
          token.permissions = [];
          token.roles = [];
        }
      }

      return token;
    },

    async session({ session, token }) {
      console.log("🔍 Session callback:",
        {
          hasSession: !!session,
          hasToken: !!token,
        });
      
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.privilegeLevel = token.privilegeLevel;
        session.user.permissions = token.permissions || [];
        session.user.roles = token.roles || [];
        session.user.permissionsLastUpdated = token.permissionsLastUpdated;

        console.log("✅ Added user details to session:",
          {
            id: token.id,
            role: token.role,
            privilegeLevel: token.privilegeLevel,
            permissionCount: session.user.permissions.length,
            roleCount: session.user.roles.length
          });
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

  debug: true,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
