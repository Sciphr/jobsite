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
            'ldap_use_ssl'
          ]
        },
        userId: null // System-wide settings
      }
    });

    const config = {};
    settings.forEach(setting => {
      if (setting.key === 'ldap_enabled' || setting.key === 'ldap_use_ssl') {
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
      useSSL: config.ldap_use_ssl || false
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
      useSSL: false
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

      // Search for the user
      const searchFilter = `(uid=${username})`;
      const searchOptions = {
        scope: 'sub',
        filter: searchFilter,
        attributes: ['dn', 'uid', 'cn', 'mail', 'sn', 'givenName', 'displayName']
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
          userData = {
            dn: userDN,
            uid: entry.attributes.find(attr => attr.type === 'uid')?.values[0],
            email: entry.attributes.find(attr => attr.type === 'mail')?.values[0],
            name: entry.attributes.find(attr => attr.type === 'cn')?.values[0],
            firstName: entry.attributes.find(attr => attr.type === 'givenName')?.values[0],
            lastName: entry.attributes.find(attr => attr.type === 'sn')?.values[0],
            displayName: entry.attributes.find(attr => attr.type === 'displayName')?.values[0],
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

            resolve(userData);
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