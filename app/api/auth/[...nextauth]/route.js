// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { authPrisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import { getUserPermissions, getUserRoles } from "../../../lib/permissions";
import { authenticateLDAP, syncUserRoles, ensureLDAPUserRole } from "../../../lib/ldap";
import { processSAMLResponse, generateSAMLLoginURL } from "../../../lib/saml";
import { AuthAudit } from "../../../lib/audit";
import { performJITProvisioning, mapGroupsToRoles, syncUserRoles } from "../../../lib/jit-provisioning";

// Helper function for determining combined account types
function determineAccountType(existingType, newAuthMethod) {
  if (!existingType || existingType === 'local') {
    return newAuthMethod;
  }
  if (existingType === newAuthMethod) {
    return existingType;
  }
  // If user has both LDAP and SAML, mark as 'combined'
  if ((existingType === 'ldap' && newAuthMethod === 'saml') || 
      (existingType === 'saml' && newAuthMethod === 'ldap')) {
    return 'combined';
  }
  return existingType;
}

export const authOptions = {
  adapter: PrismaAdapter(authPrisma),
  providers: [
    // SAML Authentication Provider
    CredentialsProvider({
      id: "saml",
      name: "SAML SSO",
      credentials: {
        samlResponse: { label: "SAML Response", type: "text" },
      },
      async authorize(credentials) {
        console.log("🔐 SAML NextAuth authorize called");

        if (!credentials?.samlResponse) {
          console.log("❌ Missing SAML response");
          return null;
        }

        try {
          // Process SAML response
          const samlUser = await processSAMLResponse(credentials.samlResponse);
          console.log("✅ SAML authentication successful:", samlUser);

          // Log SAML response processing
          await AuthAudit.samlResponse(null, samlUser.email, samlUser.allAttributes);

          // Check if user exists in local database
          let localUser = await authPrisma.users.findUnique({
            where: { email: samlUser.email },
          });

          const now = new Date();

          // If user doesn't exist locally, use JIT provisioning
          if (!localUser) {
            console.log("🆕 JIT provisioning new user from SAML:", samlUser.email);
            
            const jitResult = await performJITProvisioning({
              userData: {
                email: samlUser.email,
                firstName: samlUser.firstName || samlUser.displayName?.split(' ')[0] || '',
                lastName: samlUser.lastName || samlUser.displayName?.split(' ').slice(1).join(' ') || '',
                phone: samlUser.phone || null,
                role: 'hr', // Default role for SAML users
                privilegeLevel: 1, // HR privilege level
                isActive: true,
                password: null, // SAML users don't have local passwords
                account_type: 'saml',
                ldap_dn: null, // SAML users don't have LDAP DN
                ldap_groups: [],
                ldap_synced_at: null,
              },
              groups: samlUser.groups || [],
              authMethod: 'saml',
              existingUser: null
            });
            
            if (!jitResult.success) {
              console.error("❌ JIT provisioning failed:", jitResult.error);
              throw new Error(`JIT provisioning failed: ${jitResult.error}`);
            }
            
            localUser = jitResult.user;
            console.log("✅ SAML user provisioned via JIT:", samlUser.email);
          } else {
            // Determine the new account type (existing user linking SAML)
            const newAccountType = determineAccountType(localUser.account_type, 'saml');
            console.log(`🔗 Linking SAML to existing account. Type: ${localUser.account_type} -> ${newAccountType}`);
            
            // Log account linking if account type changed
            if (localUser.account_type !== newAccountType) {
              await AuthAudit.accountLinked(
                localUser.id,
                localUser.email,
                localUser.account_type,
                newAccountType
              );
            }
            
            // Update existing user with SAML data, preserving LDAP data if present
            const updateData = {
              // Only update name/phone from SAML if not an LDAP account or if it's empty
              firstName: (localUser.account_type !== 'ldap' && localUser.account_type !== 'combined') 
                ? (samlUser.firstName || samlUser.displayName?.split(' ')[0] || localUser.firstName)
                : localUser.firstName,
              lastName: (localUser.account_type !== 'ldap' && localUser.account_type !== 'combined')
                ? (samlUser.lastName || samlUser.displayName?.split(' ').slice(1).join(' ') || localUser.lastName)
                : localUser.lastName,
              phone: localUser.phone || samlUser.phone, // Keep existing phone if present
              account_type: newAccountType,
              updatedAt: now,
            };

            // Don't overwrite LDAP data if this is a combined account
            if (localUser.account_type !== 'ldap' && localUser.account_type !== 'combined') {
              updateData.ldap_dn = null;
              updateData.ldap_groups = [];
              updateData.ldap_synced_at = null;
            }

            localUser = await authPrisma.users.update({
              where: { id: localUser.id },
              data: updateData,
            });
            
            // Sync roles from SAML groups for existing users
            if (samlUser.groups && samlUser.groups.length > 0) {
              try {
                await syncUserRoles(localUser.id, samlUser.groups, 'saml');
                console.log("✅ SAML roles synced for existing user:", samlUser.email);
              } catch (roleError) {
                console.warn("⚠️ Failed to sync SAML roles:", roleError);
              }
            }
          }

          // Ensure SAML user has the basic "User" system role
          try {
            await ensureLDAPUserRole(localUser.id); // Reuse LDAP role function
            console.log("✅ SAML user role assigned:", samlUser.email);
          } catch (roleError) {
            console.warn("⚠️ Failed to assign SAML user role:", roleError);
          }

          const returnUser = {
            id: localUser.id,
            email: localUser.email,
            name: localUser.firstName + (localUser.lastName ? " " + localUser.lastName : ""),
            role: localUser.role,
            privilegeLevel: localUser.privilegeLevel,
            authMethod: 'saml',
          };

          // Log successful login
          await AuthAudit.loginSuccess(
            localUser.id,
            localUser.email,
            'saml',
            null,
            { saml_attributes: Object.keys(samlUser.allAttributes || {}) }
          );

          console.log("✅ SAML user authenticated:", returnUser);
          return returnUser;
        } catch (error) {
          console.error("❌ SAML authentication error:", error);
          
          // Log failed login attempt
          await AuthAudit.loginFailure(
            credentials?.samlResponse ? 'unknown' : 'missing-response',
            'saml',
            error.message
          );
          
          return null;
        }
      },
    }),

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
          
          // Log failed login attempt
          await AuthAudit.loginFailure(
            credentials?.username || 'unknown',
            'ldap',
            'Missing credentials'
          );
          
          return null;
        }

        try {
          // Authenticate against LDAP
          const ldapUser = await authenticateLDAP(credentials.username, credentials.password);
          console.log("✅ LDAP authentication successful:", ldapUser);

          // Log LDAP sync
          await AuthAudit.ldapSync(
            null, 
            ldapUser.email, 
            ldapUser.groups?.map(g => g.name) || []
          );

          // Check if user exists in local database
          let localUser = await authPrisma.users.findUnique({
            where: { email: ldapUser.email },
          });

          const now = new Date();

          // If user doesn't exist locally, use JIT provisioning
          if (!localUser) {
            console.log("🆕 JIT provisioning new user from LDAP:", ldapUser.email);
            
            const jitResult = await performJITProvisioning({
              userData: {
                email: ldapUser.email,
                firstName: ldapUser.firstName || ldapUser.name,
                lastName: ldapUser.lastName || '',
                phone: ldapUser.phone || null,
                role: 'hr', // Default role for LDAP users
                privilegeLevel: 1, // HR privilege level for testing
                isActive: true,
                password: null, // LDAP users don't have local passwords
                account_type: 'ldap',
                ldap_dn: ldapUser.dn,
                ldap_groups: ldapUser.groups?.map(g => g.name) || [],
                ldap_synced_at: now,
              },
              groups: ldapUser.groups || [],
              authMethod: 'ldap',
              existingUser: null
            });
            
            if (!jitResult.success) {
              console.error("❌ JIT provisioning failed:", jitResult.error);
              throw new Error(`JIT provisioning failed: ${jitResult.error}`);
            }
            
            localUser = jitResult.user;
            console.log("✅ LDAP user provisioned via JIT:", ldapUser.email);
          } else {
            // Determine the new account type (existing user linking LDAP)
            const newAccountType = determineAccountType(localUser.account_type, 'ldap');
            console.log(`🔗 Linking LDAP to existing account. Type: ${localUser.account_type} -> ${newAccountType}`);
            
            // Log account linking if account type changed
            if (localUser.account_type !== newAccountType) {
              await AuthAudit.accountLinked(
                localUser.id,
                localUser.email,
                localUser.account_type,
                newAccountType
              );
            }
            
            // Update existing user's LDAP data on each login
            localUser = await authPrisma.users.update({
              where: { id: localUser.id },
              data: {
                // Always update name/phone from LDAP (LDAP is authoritative)
                firstName: ldapUser.firstName || ldapUser.name,
                lastName: ldapUser.lastName || '',
                phone: ldapUser.phone || localUser.phone,
                account_type: newAccountType,
                ldap_dn: ldapUser.dn,
                ldap_groups: ldapUser.groups?.map(g => g.name) || [],
                ldap_synced_at: now,
                updatedAt: now,
              },
            });
          }


          // Ensure LDAP user has the basic "User" system role
          try {
            await ensureLDAPUserRole(localUser.id);
            console.log("✅ LDAP user role assigned:", ldapUser.email);
          } catch (roleError) {
            console.warn("⚠️ Failed to assign LDAP user role:", roleError);
          }

          // Sync user roles based on LDAP groups
          if (ldapUser.groups && ldapUser.groups.length > 0) {
            try {
              await syncUserRoles(localUser.id, ldapUser.groups);
              console.log("✅ LDAP roles synced for user:", ldapUser.email);
            } catch (roleError) {
              console.warn("⚠️ Failed to sync LDAP roles:", roleError);
            }
          }

          const returnUser = {
            id: localUser.id,
            email: localUser.email,
            name: localUser.firstName + (localUser.lastName ? " " + localUser.lastName : ""),
            role: localUser.role,
            privilegeLevel: localUser.privilegeLevel,
            authMethod: 'ldap',
          };

          // Log successful login
          await AuthAudit.loginSuccess(
            localUser.id,
            localUser.email,
            'ldap',
            null,
            { 
              ldap_groups: ldapUser.groups?.map(g => g.name) || [],
              ldap_dn: ldapUser.dn
            }
          );

          console.log("✅ LDAP user authenticated:", returnUser);
          return returnUser;
        } catch (error) {
          console.error("❌ LDAP authentication error:", error);
          
          // Log failed login attempt
          await AuthAudit.loginFailure(
            credentials?.username || 'unknown',
            'ldap',
            error.message
          );
          
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
        // Check if local auth is enabled
        try {
          const localAuthSetting = await authPrisma.settings.findFirst({
            where: {
              key: 'local_auth_enabled',
              userId: null
            }
          });
          
          const isLocalAuthEnabled = localAuthSetting?.value === 'true' || true; // Default to true
          
          if (!isLocalAuthEnabled) {
            console.log("❌ Local authentication is disabled");
            
            // Log blocked login attempt
            await AuthAudit.loginFailure(
              credentials?.email || 'unknown',
              'local',
              'Local authentication disabled'
            );
            
            return null;
          }
        } catch (error) {
          console.warn("⚠️ Could not check local auth status, allowing login:", error);
        }
        console.log("🔐 NextAuth authorize called with:", {
          hasEmail: !!credentials?.email,
          hasPassword: !!credentials?.password,
          environment: process.env.NODE_ENV,
          nextAuthUrl: process.env.NEXTAUTH_URL
        });

        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Missing credentials");
          
          // Log failed login attempt
          await AuthAudit.loginFailure(
            credentials?.email || 'unknown',
            'local',
            'Missing credentials'
          );
          
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
            console.log("Failed login attempt - user not found:", credentials.email);
            
            // Log failed login attempt
            await AuthAudit.loginFailure(
              credentials.email,
              'local',
              'User not found or no password set'
            );
            
            return null;
          }

          if (!user.isActive) {
            console.log("Failed login attempt - account deactivated:", credentials.email);
            
            // Log failed login attempt
            await AuthAudit.loginFailure(
              credentials.email,
              'local',
              'Account deactivated'
            );
            
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            console.log("Failed login attempt - invalid password:", credentials.email);
            
            // Log failed login attempt
            await AuthAudit.loginFailure(
              credentials.email,
              'local',
              'Invalid password'
            );
            
            return null;
          }

          const returnUser = {
            id: user.id,
            email: user.email,
            name: user.firstName + (user.lastName ? " " + user.lastName : ""),
            role: user.role,
            privilegeLevel: user.privilegeLevel,
          };
          // Log successful login
          await AuthAudit.loginSuccess(
            user.id,
            user.email,
            'local',
            null,
            { account_type: 'local' }
          );
          
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
