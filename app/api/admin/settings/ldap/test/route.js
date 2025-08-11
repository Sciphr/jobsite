import { withAdminAuth } from "../../../../../lib/auth";
import { testLDAPConnection } from "../../../../../lib/ldap";

export const POST = withAdminAuth(async (request) => {
  try {
    const ldapConfig = await request.json();
    
    // Validate required fields
    const required = ['ldap_server', 'ldap_base_dn', 'ldap_bind_dn', 'ldap_bind_password'];
    const missing = required.filter(field => !ldapConfig[field] || ldapConfig[field].trim() === '');
    
    if (missing.length > 0) {
      return Response.json({
        success: false,
        message: `Missing required configuration: ${missing.join(', ')}`,
        details: 'Please fill in all required LDAP settings before testing.'
      }, { status: 400 });
    }

    // Create temporary LDAP configuration for testing
    const tempConfig = {
      server: ldapConfig.ldap_server,
      port: parseInt(ldapConfig.ldap_port) || 389,
      baseDN: ldapConfig.ldap_base_dn,
      bindDN: ldapConfig.ldap_bind_dn,
      bindPassword: ldapConfig.ldap_bind_password,
      userSearchBase: ldapConfig.ldap_user_search_base || ldapConfig.ldap_base_dn,
      groupSearchBase: ldapConfig.ldap_group_search_base || ldapConfig.ldap_base_dn,
      useSSL: ldapConfig.ldap_use_ssl || false
    };

    // Test the connection
    const result = await testLDAPConnectionWithConfig(tempConfig);
    
    if (result.success) {
      return Response.json({
        success: true,
        message: 'LDAP connection successful!',
        details: `Connected to ${tempConfig.server}:${tempConfig.port} and successfully authenticated with bind DN.`
      });
    } else {
      return Response.json({
        success: false,
        message: 'LDAP connection failed',
        details: result.error || 'Unable to connect to LDAP server with provided credentials.'
      });
    }
  } catch (error) {
    console.error('LDAP test error:', error);
    return Response.json({
      success: false,
      message: 'LDAP test failed',
      details: error.message || 'An unexpected error occurred while testing LDAP connection.'
    }, { status: 500 });
  }
});

// Test LDAP connection with custom configuration
async function testLDAPConnectionWithConfig(config) {
  const ldap = await import('ldapjs');
  
  return new Promise((resolve) => {
    const protocol = config.useSSL ? 'ldaps' : 'ldap';
    const client = ldap.createClient({
      url: `${protocol}://${config.server}:${config.port}`,
      timeout: 5000,
      connectTimeout: 10000,
    });

    // Set up error handler
    client.on('error', (err) => {
      console.error('LDAP test connection error:', err);
      client.destroy();
      resolve({
        success: false,
        error: `Connection error: ${err.message}`
      });
    });

    // Test bind with provided credentials
    client.bind(config.bindDN, config.bindPassword, (err) => {
      client.destroy();
      
      if (err) {
        console.error('LDAP test bind error:', err);
        resolve({
          success: false,
          error: `Authentication failed: ${err.message}`
        });
      } else {
        resolve({
          success: true
        });
      }
    });
  });
}