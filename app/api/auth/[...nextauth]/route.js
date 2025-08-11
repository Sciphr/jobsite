// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { authPrisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import { getUserPermissions, getUserRoles } from "../../../lib/permissions";
import { authenticateLDAP, getUserGroups } from "../../../lib/ldap";

export const authOptions = {
  adapter: PrismaAdapter(authPrisma),
  providers: [
    // LDAP Authentication Provider
    CredentialsProvider({
      id: "ldap",
      name: "LDAP",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "Enter your LDAP username" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("🔐 LDAP NextAuth authorize called with:", {
          hasUsername: !!credentials?.username,
          hasPassword: !!credentials?.password,
        });

        if (!credentials?.username || !credentials?.password) {
          console.log("❌ Missing LDAP credentials");
          return null;
        }

        try {
          // Authenticate against LDAP
          const ldapUser = await authenticateLDAP(credentials.username, credentials.password);
          console.log("✅ LDAP authentication successful:", ldapUser);

          // Check if user exists in local database
          let localUser = await authPrisma.users.findUnique({
            where: { email: ldapUser.email },
          });

          // If user doesn't exist locally, create them
          if (!localUser) {
            console.log("🆕 Creating new user from LDAP:", ldapUser.email);
            localUser = await authPrisma.users.create({
              data: {
                email: ldapUser.email,
                firstName: ldapUser.firstName || ldapUser.name,
                lastName: ldapUser.lastName || '',
                role: 'hr', // Default role for LDAP users
                privilegeLevel: 1, // HR privilege level for testing
                isActive: true,
                password: null, // LDAP users don't have local passwords
                updatedAt: new Date(), // Required field
              },
            });
          }

          const returnUser = {
            id: localUser.id,
            email: localUser.email,
            name: localUser.firstName + (localUser.lastName ? " " + localUser.lastName : ""),
            role: localUser.role,
            privilegeLevel: localUser.privilegeLevel,
            authMethod: 'ldap',
          };

          console.log("✅ LDAP user authenticated:", returnUser);
          return returnUser;
        } catch (error) {
          console.error("❌ LDAP authentication error:", error);
          return null;
        }
      },
    }),
    
    // Local Database Authentication Provider  
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("🔐 NextAuth authorize called with:", {
          hasEmail: !!credentials?.email,
          hasPassword: !!credentials?.password,
          environment: process.env.NODE_ENV,
          nextAuthUrl: process.env.NEXTAUTH_URL
        });

        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Missing credentials");
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
            // TODO: Re-enable audit logging after fixing import issues
            console.log("Failed login attempt - user not found:", credentials.email);
            return null;
          }

          if (!user.isActive) {
            // TODO: Re-enable audit logging after fixing import issues
            console.log("Failed login attempt - account deactivated:", credentials.email);
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            // TODO: Re-enable audit logging after fixing import issues
            console.log("Failed login attempt - invalid password:", credentials.email);
            return null;
          }

          const returnUser = {
            id: user.id,
            email: user.email,
            name: user.firstName + (user.lastName ? " " + user.lastName : ""),
            role: user.role,
            privilegeLevel: user.privilegeLevel,
          };
          // TODO: Re-enable audit logging after fixing import issues
          console.log("✅ Successful login:", credentials.email, "User ID:", user.id);
          return returnUser;
        } catch (error) {
          console.error("❌ Auth error in authorize function:", error);
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
    // Removed temporary short maxAge that was causing loops
  },

  // Simple configuration for ngrok compatibility  
  trustHost: true,
  debug: true, // Always enable debug for troubleshooting
  
  // Minimal secure configuration for ngrok
  useSecureCookies: false, // Let NextAuth auto-detect
  
  // Add explicit secret (sometimes needed for ngrok)
  secret: process.env.NEXTAUTH_SECRET,

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

// Add request debugging before NextAuth handles it
async function debuggedHandler(req, context) {
  console.log("🌐 NextAuth request:", {
    method: req.method,
    url: req.url,
    headers: {
      host: req.headers.get('host'),
      'x-forwarded-proto': req.headers.get('x-forwarded-proto'),
      'x-forwarded-for': req.headers.get('x-forwarded-for'),
      origin: req.headers.get('origin'),
      referer: req.headers.get('referer')
    },
    nextAuthUrl: process.env.NEXTAUTH_URL
  });

  const handler = NextAuth(authOptions);
  return handler(req, context);
}

export { debuggedHandler as GET, debuggedHandler as POST };
