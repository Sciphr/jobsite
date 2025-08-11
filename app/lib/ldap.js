import ldap from 'ldapjs';
import { appPrisma } from './prisma';

// Get LDAP configuration from database
async function getLDAPConfig() {
  try {
    const settings = await appPrisma.settings.findMany({
      where: {
        key: {
          in: [
            'ldap_enabled',
            'ldap_server',
            'ldap_port',
            'ldap_base_dn',
            'ldap_bind_dn',
            'ldap_bind_password',
            'ldap_user_search_base',
            'ldap_group_search_base',
            'ldap_use_ssl',
            // Field mappings
            'ldap_field_email',
            'ldap_field_first_name',
            'ldap_field_last_name',
            'ldap_field_phone',
            'ldap_field_display_name',
            'ldap_field_user_id',
            'ldap_use_default_fallbacks'
          ]
        },
        userId: null // System-wide settings
      }
    });

    const config = {};
    settings.forEach(setting => {
      if (setting.key === 'ldap_enabled' || setting.key === 'ldap_use_ssl' || setting.key === 'ldap_use_default_fallbacks') {
        config[setting.key] = setting.value === 'true';
      } else {
        config[setting.key] = setting.value;
      }
    });

    return {
      enabled: config.ldap_enabled || false,
      server: config.ldap_server || '',
      port: parseInt(config.ldap_port) || 389,
      baseDN: config.ldap_base_dn || '',
      bindDN: config.ldap_bind_dn || '',
      bindPassword: config.ldap_bind_password || '',
      userSearchBase: config.ldap_user_search_base || config.ldap_base_dn || '',
      groupSearchBase: config.ldap_group_search_base || config.ldap_base_dn || '',
      useSSL: config.ldap_use_ssl || false,
      // Field mappings with defaults
      fieldMappings: {
        email: config.ldap_field_email || 'mail',
        firstName: config.ldap_field_first_name || 'givenName',
        lastName: config.ldap_field_last_name || 'sn',
        phone: config.ldap_field_phone || 'telephoneNumber',
        displayName: config.ldap_field_display_name || 'displayName',
        userId: config.ldap_field_user_id || 'uid'
      },
      useDefaultFallbacks: config.ldap_use_default_fallbacks !== false // Default to true
    };
  } catch (error) {
    console.error('Failed to load LDAP configuration:', error);
    return {
      enabled: false,
      server: '',
      port: 389,
      baseDN: '',
      bindDN: '',
      bindPassword: '',
      userSearchBase: '',
      groupSearchBase: '',
      useSSL: false,
      fieldMappings: {
        email: 'mail',
        firstName: 'givenName',
        lastName: 'sn',
        phone: 'telephoneNumber',
        displayName: 'displayName',
        userId: 'uid'
      },
      useDefaultFallbacks: true
    };
  }
}

/**
 * Create LDAP client connection
 */
function createLDAPClient(config) {
  const protocol = config.useSSL ? 'ldaps' : 'ldap';
  const client = ldap.createClient({
    url: `${protocol}://${config.server}:${config.port}`,
    timeout: 5000,
    connectTimeout: 10000,
  });

  return client;
}

/**
 * Authenticate user against LDAP
 */
export async function authenticateLDAP(username, password) {
  const config = await getLDAPConfig();
  
  if (!config.enabled) {
    throw new Error('LDAP authentication is disabled');
  }

  if (!config.server || !config.baseDN || !config.bindDN || !config.bindPassword) {
    throw new Error('LDAP configuration is incomplete');
  }

  return new Promise((resolve, reject) => {
    const client = createLDAPClient(config);
    
    // First, bind with admin credentials to search for user
    client.bind(config.bindDN, config.bindPassword, (err) => {
      if (err) {
        console.error('LDAP bind error:', err);
        client.destroy();
        return reject(new Error('LDAP connection failed'));
      }

      // Search for the user using custom field mappings
      const searchFilter = `(${config.fieldMappings.userId}=${username})`;
      
      // Build attributes list from field mappings
      const searchAttributes = ['dn', 'cn']; // Always include these
      Object.values(config.fieldMappings).forEach(attr => {
        if (attr && !searchAttributes.includes(attr)) {
          searchAttributes.push(attr);
        }
      });
      
      // Add default fallback attributes if enabled
      if (config.useDefaultFallbacks) {
        const fallbackAttrs = ['mail', 'givenName', 'sn', 'telephoneNumber', 'mobile', 'homePhone', 'displayName', 'uid'];
        fallbackAttrs.forEach(attr => {
          if (!searchAttributes.includes(attr)) {
            searchAttributes.push(attr);
          }
        });
      }
      
      const searchOptions = {
        scope: 'sub',
        filter: searchFilter,
        attributes: searchAttributes
      };

      client.search(config.userSearchBase, searchOptions, (err, res) => {
        if (err) {
          console.error('LDAP search error:', err);
          client.destroy();
          return reject(new Error('User search failed'));
        }

        let userDN = null;
        let userData = null;

        res.on('searchEntry', (entry) => {
          userDN = entry.dn.toString();
          // Helper function to get attribute value with fallbacks
          const getAttribute = (entry, primaryAttr, fallbackAttrs = []) => {
            // Try primary attribute first
            let value = entry.attributes.find(attr => attr.type === primaryAttr)?.values[0];
            
            // Try fallbacks if enabled and primary didn't work
            if (!value && config.useDefaultFallbacks && fallbackAttrs.length > 0) {
              for (const fallback of fallbackAttrs) {
                value = entry.attributes.find(attr => attr.type === fallback)?.values[0];
                if (value) break;
              }
            }
            
            return value || null;
          };

          userData = {
            dn: userDN,
            uid: getAttribute(entry, config.fieldMappings.userId, ['uid', 'sAMAccountName']),
            email: getAttribute(entry, config.fieldMappings.email, ['mail', 'email', 'userPrincipalName']),
            name: getAttribute(entry, 'cn', ['cn', 'displayName']),
            firstName: getAttribute(entry, config.fieldMappings.firstName, ['givenName', 'firstName', 'fname']),
            lastName: getAttribute(entry, config.fieldMappings.lastName, ['sn', 'surname', 'lastName', 'lname']),
            displayName: getAttribute(entry, config.fieldMappings.displayName, ['displayName', 'cn', 'fullName']),
            phone: getAttribute(entry, config.fieldMappings.phone, ['telephoneNumber', 'mobile', 'homePhone', 'phone']),
          };
        });

        res.on('error', (err) => {
          console.error('LDAP search error:', err);
          client.destroy();
          reject(new Error('User search failed'));
        });

        res.on('end', () => {
          client.destroy();

          if (!userDN) {
            return reject(new Error('User not found'));
          }

          // Now try to authenticate with the found user's credentials
          const authClient = createLDAPClient(config);
          authClient.bind(userDN, password, (err) => {
            authClient.destroy();
            
            if (err) {
              console.error('LDAP authentication failed:', err);
              return reject(new Error('Invalid credentials'));
            }

            // Get user groups and resolve with both user data and groups
            getUserGroups(userDN)
              .then(groups => {
                resolve({
                  ...userData,
                  groups
                });
              })
              .catch(error => {
                console.warn('Failed to get user groups, continuing without them:', error);
                resolve({
                  ...userData,
                  groups: []
                });
              });
          });
        });
      });
    });
  });
}

/**
 * Get user groups from LDAP
 */
export async function getUserGroups(userDN) {
  const config = await getLDAPConfig();
  
  if (!config.enabled) {
    return [];
  }

  return new Promise((resolve, reject) => {
    const client = createLDAPClient(config);
    
    client.bind(config.bindDN, config.bindPassword, (err) => {
      if (err) {
        client.destroy();
        return reject(new Error('LDAP connection failed'));
      }

      const searchFilter = `(member=${userDN})`;
      const searchOptions = {
        scope: 'sub',
        filter: searchFilter,
        attributes: ['cn', 'description']
      };

      const groups = [];

      client.search(config.groupSearchBase, searchOptions, (err, res) => {
        if (err) {
          console.error('❌ Group search error:', err);
          client.destroy();
          return reject(new Error('Group search failed'));
        }

        res.on('searchEntry', (entry) => {
          groups.push({
            name: entry.attributes.find(attr => attr.type === 'cn')?.values[0],
            description: entry.attributes.find(attr => attr.type === 'description')?.values[0],
          });
        });

        res.on('error', (err) => {
          console.error('LDAP group search error:', err);
          client.destroy();
          reject(new Error('Group search failed'));
        });

        res.on('end', () => {
          client.destroy();
          resolve(groups);
        });
      });
    });
  });
}

/**
 * Create or find role for LDAP group
 */
export async function createOrFindLDAPRole(groupName, description) {
  try {
    // First check if role already exists by LDAP group name
    let role = await appPrisma.roles.findFirst({
      where: {
        ldap_group_name: groupName,
        is_ldap_role: true
      }
    });

    if (role) {
      return role;
    }

    // Create new LDAP role
    const roleName = `LDAP-${groupName}`;
    role = await appPrisma.roles.create({
      data: {
        name: roleName,
        description: description || `Role automatically created from LDAP group: ${groupName}`,
        color: '#3b82f6', // Blue color for LDAP roles
        is_system_role: false,
        is_active: true,
        is_ldap_role: true,
        ldap_group_name: groupName,
        is_editable: false
      }
    });

    return role;
  } catch (error) {
    console.error('Error creating/finding LDAP role:', error);
    throw error;
  }
}

/**
 * Ensure LDAP user has the basic "User" system role
 */
export async function ensureLDAPUserRole(userId) {
  try {
    // Find or create the "User" system role
    let userRole = await appPrisma.roles.findFirst({
      where: {
        name: 'User',
        is_system_role: true
      }
    });

    if (!userRole) {
      console.log('📋 Creating User system role...');
      userRole = await appPrisma.roles.create({
        data: {
          name: 'User',
          description: 'Basic system role with dashboard access',
          color: '#6b7280', // Gray color for system roles
          is_system_role: true,
          is_active: true,
          is_ldap_role: false,
          is_editable: false // System roles shouldn't be editable
        }
      });
    }

    // Check if user already has this role
    const existingUserRole = await appPrisma.user_roles.findFirst({
      where: {
        user_id: userId,
        role_id: userRole.id,
        is_active: true
      }
    });

    if (!existingUserRole) {
      console.log('👤 Assigning User role to LDAP user:', userId);
      await appPrisma.user_roles.create({
        data: {
          user_id: userId,
          role_id: userRole.id,
          is_active: true
        }
      });
    }

    return userRole;
  } catch (error) {
    console.error('Error ensuring LDAP user role:', error);
    throw error;
  }
}

/**
 * Sync user roles based on LDAP groups
 */
export async function syncUserRoles(userId, ldapGroups) {
  try {
    // Get current user roles that are LDAP-based
    const currentLDAPRoles = await appPrisma.user_roles.findMany({
      where: {
        user_id: userId,
        roles: {
          is_ldap_role: true
        }
      },
      include: {
        roles: true
      }
    });

    // Create roles for new LDAP groups
    const newRoles = [];
    for (const group of ldapGroups) {
      const role = await createOrFindLDAPRole(group.name, group.description);
      newRoles.push(role);
    }

    // Remove user from LDAP roles that are no longer in their groups
    const groupNames = ldapGroups.map(g => g.name);
    const rolesToRemove = currentLDAPRoles.filter(
      userRole => !groupNames.includes(userRole.roles.ldap_group_name)
    );

    if (rolesToRemove.length > 0) {
      await appPrisma.user_roles.deleteMany({
        where: {
          id: {
            in: rolesToRemove.map(r => r.id)
          }
        }
      });
    }

    // Add user to new LDAP roles
    for (const role of newRoles) {
      const existingUserRole = currentLDAPRoles.find(
        ur => ur.roles.ldap_group_name === role.ldap_group_name
      );

      if (!existingUserRole) {
        await appPrisma.user_roles.create({
          data: {
            user_id: userId,
            role_id: role.id,
            is_active: true
          }
        });
      }
    }

    return newRoles;
  } catch (error) {
    console.error('Error syncing user roles:', error);
    throw error;
  }
}

/**
 * Test LDAP connection
 */
export async function testLDAPConnection() {
  const config = await getLDAPConfig();
  
  if (!config.enabled) {
    throw new Error('LDAP authentication is disabled');
  }

  return new Promise((resolve, reject) => {
    const client = createLDAPClient(config);
    
    client.bind(config.bindDN, config.bindPassword, (err) => {
      client.destroy();
      
      if (err) {
        console.error('LDAP connection test failed:', err);
        return reject(new Error('LDAP connection failed'));
      }

      resolve(true);
    });
  });
}