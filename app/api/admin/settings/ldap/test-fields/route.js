import { withAdminAuth } from "../../../../../lib/auth";
import { appPrisma } from "../../../../../lib/prisma";
import ldap from "ldapjs";

export const POST = withAdminAuth(async (request) => {
  try {
    const { testUsername, fieldMappings } = await request.json();
    
    if (!testUsername) {
      return Response.json({ error: 'Test username is required' }, { status: 400 });
    }

    // Get LDAP connection settings
    const settings = await appPrisma.settings.findMany({
      where: {
        key: {
          in: ['ldap_server', 'ldap_port', 'ldap_base_dn', 'ldap_bind_dn', 'ldap_bind_password', 'ldap_user_search_base', 'ldap_use_ssl']
        },
        userId: null
      }
    });

    const config = {};
    settings.forEach(setting => {
      const key = setting.key.replace('ldap_', '');
      if (key === 'use_ssl') {
        config[key] = setting.value === 'true';
      } else {
        config[key] = setting.value;
      }
    });

    if (!config.server || !config.base_dn || !config.bind_dn || !config.bind_password) {
      return Response.json({ error: 'LDAP connection settings incomplete' }, { status: 400 });
    }

    // Create LDAP client
    const client = ldap.createClient({
      url: `${config.use_ssl ? 'ldaps' : 'ldap'}://${config.server}:${config.port || 389}`,
      reconnect: false,
      timeout: 10000,
      connectTimeout: 10000,
    });

    // Test field mapping
    const testResult = await new Promise((resolve, reject) => {
      client.bind(config.bind_dn, config.bind_password, (err) => {
        if (err) {
          client.destroy();
          return reject(new Error('LDAP connection failed'));
        }

        // Get all field mapping values for search attributes
        const searchAttributes = Object.values(fieldMappings).filter(attr => attr && attr.trim());
        
        // Add default fallbacks if enabled
        const allAttributes = [...new Set([
          ...searchAttributes,
          'mail', 'givenName', 'sn', 'telephoneNumber', 'displayName', 'uid', 'cn'
        ])];

        const searchFilter = `(${fieldMappings.user_id || 'uid'}=${testUsername})`;
        const searchOptions = {
          scope: 'sub',
          filter: searchFilter,
          attributes: allAttributes
        };

        client.search(config.user_search_base || config.base_dn, searchOptions, (err, res) => {
          if (err) {
            client.destroy();
            return reject(new Error('User search failed'));
          }

          let userData = null;

          res.on('searchEntry', (entry) => {
            const mappedData = {};
            const allAttributes = {};

            // Get all available attributes
            entry.attributes.forEach(attr => {
              allAttributes[attr.type] = attr.values;
            });

            // Map fields based on custom mappings
            Object.keys(fieldMappings).forEach(field => {
              const ldapAttr = fieldMappings[field];
              if (ldapAttr && allAttributes[ldapAttr]) {
                mappedData[field] = allAttributes[ldapAttr][0];
              }
            });

            userData = {
              found: true,
              mappedData,
              allAttributes,
              dn: entry.dn.toString()
            };
          });

          res.on('error', (err) => {
            client.destroy();
            reject(new Error('Search failed'));
          });

          res.on('end', () => {
            client.destroy();
            if (!userData) {
              resolve({ found: false, message: 'User not found' });
            } else {
              resolve(userData);
            }
          });
        });
      });
    });

    return Response.json(testResult);
  } catch (error) {
    console.error('LDAP field test error:', error);
    return Response.json({ error: error.message || 'Field mapping test failed' }, { status: 500 });
  }
});