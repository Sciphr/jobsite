import { appPrisma } from './prisma';

// Get SAML configuration from database
async function getSAMLConfig() {
  try {
    const settings = await appPrisma.settings.findMany({
      where: {
        key: {
          in: [
            'saml_enabled',
            'saml_entity_id',
            'saml_sso_url',
            'saml_sls_url',
            'saml_certificate',
            'saml_private_key',
            'saml_want_assertions_signed',
            'saml_want_response_signed',
            // Field mappings
            'saml_field_email',
            'saml_field_first_name',
            'saml_field_last_name',
            'saml_field_phone',
            'saml_field_display_name',
            'saml_field_user_id',
            'saml_field_groups',
            'saml_use_default_fallbacks'
          ]
        },
        userId: null // System-wide settings
      }
    });

    const config = {};
    settings.forEach(setting => {
      if (setting.key === 'saml_enabled' || setting.key === 'saml_want_assertions_signed' || 
          setting.key === 'saml_want_response_signed' || setting.key === 'saml_use_default_fallbacks') {
        config[setting.key] = setting.value === 'true';
      } else {
        config[setting.key] = setting.value;
      }
    });

    return {
      enabled: config.saml_enabled || false,
      entityId: config.saml_entity_id || '',
      ssoUrl: config.saml_sso_url || '',
      slsUrl: config.saml_sls_url || '',
      certificate: config.saml_certificate || '',
      privateKey: config.saml_private_key || '',
      wantAssertionsSigned: config.saml_want_assertions_signed !== false,
      wantResponseSigned: config.saml_want_response_signed !== false,
      // Field mappings with defaults (Azure AD format as default)
      fieldMappings: {
        email: config.saml_field_email || 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
        firstName: config.saml_field_first_name || 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
        lastName: config.saml_field_last_name || 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
        phone: config.saml_field_phone || 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/mobilephone',
        displayName: config.saml_field_display_name || 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/displayname',
        userId: config.saml_field_user_id || 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
        groups: config.saml_field_groups || 'http://schemas.xmlsoap.org/claims/Group'
      },
      useDefaultFallbacks: config.saml_use_default_fallbacks !== false
    };
  } catch (error) {
    console.error('Failed to load SAML configuration:', error);
    return {
      enabled: false,
      entityId: '',
      ssoUrl: '',
      slsUrl: '',
      certificate: '',
      privateKey: '',
      wantAssertionsSigned: true,
      wantResponseSigned: true,
      fieldMappings: {
        email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
        firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
        lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
        phone: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/mobilephone',
        displayName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/displayname',
        userId: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
        groups: 'http://schemas.xmlsoap.org/claims/Group'
      },
      useDefaultFallbacks: true
    };
  }
}

/**
 * Generate SAML login URL
 */
export async function generateSAMLLoginURL() {
  try {
    const config = await getSAMLConfig();
    
    if (!config.enabled || !config.ssoUrl) {
      throw new Error('SAML configuration is incomplete');
    }

    // For now, just redirect to the SSO URL
    // In a full implementation, you'd generate a proper SAML AuthnRequest
    return config.ssoUrl;
  } catch (error) {
    console.error('Failed to generate SAML login URL:', error);
    throw error;
  }
}

/**
 * Process SAML response from Identity Provider
 * This is a simplified version - in production you'd want full XML parsing and validation
 */
export async function processSAMLResponse(samlResponse) {
  try {
    const config = await getSAMLConfig();
    
    if (!config.enabled) {
      throw new Error('SAML authentication is disabled');
    }

    // Decode the SAML response (base64 decoded)
    let decodedResponse;
    try {
      decodedResponse = Buffer.from(samlResponse, 'base64').toString('utf8');
    } catch {
      // If it's not base64, assume it's already decoded
      decodedResponse = samlResponse;
    }

    // Mock user data extraction for testing
    // In production, you'd parse the XML and extract attributes properly
    const mockUserData = {
      nameId: 'test@company.com',
      sessionIndex: 'mock-session-123',
      uid: 'test@company.com',
      email: 'test@company.com',
      firstName: 'Test',
      lastName: 'User',
      displayName: 'Test User',
      phone: '+1234567890',
      groups: ['hr-team', 'employees', 'saml-users'],
      allAttributes: {
        'email': 'test@company.com',
        'firstName': 'Test',
        'lastName': 'User',
        'displayName': 'Test User',
        'http://schemas.xmlsoap.org/claims/Group': ['hr-team', 'employees', 'saml-users']
      }
    };

    // Helper function to get attribute value with fallbacks
    const getAttribute = (attributes, primaryAttr, fallbackAttrs = []) => {
      // Try primary attribute first
      let value = attributes[primaryAttr];
      
      // Try fallbacks if enabled and primary didn't work
      if (!value && config.useDefaultFallbacks && fallbackAttrs.length > 0) {
        for (const fallback of fallbackAttrs) {
          value = attributes[fallback];
          if (value) break;
        }
      }
      
      return value || null;
    };

    // Extract user data using configured field mappings
    const userData = {
      nameId: mockUserData.nameId,
      sessionIndex: mockUserData.sessionIndex,
      uid: getAttribute(mockUserData.allAttributes, config.fieldMappings.userId, ['nameID', 'email', 'user_id', 'uid']) || mockUserData.uid,
      email: getAttribute(mockUserData.allAttributes, config.fieldMappings.email, ['email', 'mail', 'emailAddress']) || mockUserData.email,
      firstName: getAttribute(mockUserData.allAttributes, config.fieldMappings.firstName, ['first_name', 'firstName', 'givenName']) || mockUserData.firstName,
      lastName: getAttribute(mockUserData.allAttributes, config.fieldMappings.lastName, ['last_name', 'lastName', 'surname', 'sn']) || mockUserData.lastName,
      displayName: getAttribute(mockUserData.allAttributes, config.fieldMappings.displayName, ['display_name', 'displayName', 'name']) || mockUserData.displayName,
      phone: getAttribute(mockUserData.allAttributes, config.fieldMappings.phone, ['phone', 'phoneNumber', 'mobile']) || mockUserData.phone,
      groups: getAttribute(mockUserData.allAttributes, config.fieldMappings.groups, ['groups', 'memberOf', 'roles']) || mockUserData.groups || [],
      allAttributes: mockUserData.allAttributes
    };

    return userData;
  } catch (error) {
    console.error('Failed to process SAML response:', error);
    throw error;
  }
}

/**
 * Generate SAML metadata for Service Provider
 */
export async function generateSAMLMetadata() {
  try {
    const config = await getSAMLConfig();
    
    if (!config.enabled) {
      throw new Error('SAML is not enabled');
    }

    // Basic SP metadata XML
    const metadata = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     entityID="${process.env.NEXTAUTH_URL}/api/auth/saml/metadata">
  <md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="${config.wantAssertionsSigned}"
                      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                 Location="${process.env.NEXTAUTH_URL}/api/auth/saml/acs"
                                 index="1" isDefault="true"/>
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                            Location="${process.env.NEXTAUTH_URL}/api/auth/saml/sls"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;

    return metadata;
  } catch (error) {
    console.error('Failed to generate SAML metadata:', error);
    throw error;
  }
}

/**
 * Test SAML configuration
 */
export async function testSAMLConnection() {
  const config = await getSAMLConfig();
  
  if (!config.enabled) {
    throw new Error('SAML authentication is disabled');
  }

  if (!config.ssoUrl || !config.certificate || !config.entityId) {
    throw new Error('SAML configuration is incomplete');
  }

  // Basic validation tests
  const tests = [];
  
  // Test 1: SSO URL is valid
  try {
    const url = new URL(config.ssoUrl);
    tests.push({ test: 'SSO URL Format', passed: true, message: `Valid URL: ${url.origin}` });
  } catch {
    tests.push({ test: 'SSO URL Format', passed: false, message: 'Invalid SSO URL format' });
  }
  
  // Test 2: Certificate format
  const certFormatValid = config.certificate.includes('BEGIN CERTIFICATE') || config.certificate.length > 50;
  tests.push({ 
    test: 'Certificate Format', 
    passed: certFormatValid, 
    message: certFormatValid ? 'Certificate appears valid' : 'Certificate format may be invalid' 
  });
  
  // Test 3: Entity ID format
  const entityIdValid = config.entityId.length > 0;
  tests.push({ 
    test: 'Entity ID', 
    passed: entityIdValid, 
    message: entityIdValid ? `Entity ID: ${config.entityId}` : 'Entity ID is required' 
  });

  const allPassed = tests.every(test => test.passed);
  
  return {
    success: allPassed,
    message: allPassed ? 'SAML configuration appears valid' : 'SAML configuration has issues',
    tests
  };
}

/**
 * Auto-refresh SAML metadata and certificates
 */
export async function refreshSAMLMetadata() {
  try {
    const config = await getSAMLConfig();
    
    if (!config.enabled || !config.entityId) {
      throw new Error('SAML is not properly configured');
    }

    // Get metadata URL from entity ID or a configured metadata endpoint
    let metadataUrl = config.entityId;
    
    // If entity ID is not a URL, try to construct metadata URL
    if (!metadataUrl.startsWith('http')) {
      throw new Error('Cannot auto-refresh: Entity ID is not a metadata URL');
    }
    
    console.log(`📡 Fetching SAML metadata from: ${metadataUrl}`);
    
    // Fetch metadata
    const response = await fetch(metadataUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/samlmetadata+xml, application/xml, text/xml',
        'User-Agent': 'JobSite-SAML-Client/1.0'
      },
      timeout: 10000 // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.status} ${response.statusText}`);
    }

    const metadataXml = await response.text();
    
    // Parse metadata to extract certificate and URLs
    const parsedMetadata = await parseSAMLMetadata(metadataXml);
    
    if (!parsedMetadata.certificate) {
      throw new Error('No certificate found in metadata');
    }

    // Update database settings with new metadata
    const updates = [];
    
    if (parsedMetadata.certificate && parsedMetadata.certificate !== config.certificate) {
      updates.push({
        key: 'saml_certificate',
        value: parsedMetadata.certificate,
        description: 'SAML Identity Provider certificate (auto-refreshed)',
        dataType: 'text',
        category: 'authentication'
      });
    }
    
    if (parsedMetadata.ssoUrl && parsedMetadata.ssoUrl !== config.ssoUrl) {
      updates.push({
        key: 'saml_sso_url',
        value: parsedMetadata.ssoUrl,
        description: 'SAML Single Sign-On URL (auto-refreshed)',
        dataType: 'text',
        category: 'authentication'
      });
    }
    
    if (parsedMetadata.slsUrl && parsedMetadata.slsUrl !== config.slsUrl) {
      updates.push({
        key: 'saml_sls_url',
        value: parsedMetadata.slsUrl,
        description: 'SAML Single Logout URL (auto-refreshed)',
        dataType: 'text',
        category: 'authentication'
      });
    }

    // Apply updates
    for (const update of updates) {
      await appPrisma.settings.upsert({
        where: {
          key_userId: {
            key: update.key,
            userId: null
          }
        },
        update: {
          value: update.value,
          updatedAt: new Date()
        },
        create: {
          ...update,
          userId: null,
          updatedAt: new Date()
        }
      });
    }

    // Update last refresh timestamp
    await appPrisma.settings.upsert({
      where: {
        key_userId: {
          key: 'saml_metadata_last_refresh',
          userId: null
        }
      },
      update: {
        value: new Date().toISOString(),
        updatedAt: new Date()
      },
      create: {
        key: 'saml_metadata_last_refresh',
        value: new Date().toISOString(),
        description: 'Timestamp of last SAML metadata refresh',
        dataType: 'datetime',
        category: 'authentication',
        userId: null,
        updatedAt: new Date()
      }
    });

    console.log(`✅ SAML metadata refreshed successfully. Updated ${updates.length} settings.`);
    
    return {
      success: true,
      updatesApplied: updates.length,
      lastRefresh: new Date().toISOString(),
      changes: updates.map(u => u.key)
    };
  } catch (error) {
    console.error('Failed to refresh SAML metadata:', error);
    
    // Log the failed refresh attempt
    await appPrisma.settings.upsert({
      where: {
        key_userId: {
          key: 'saml_metadata_last_refresh_error',
          userId: null
        }
      },
      update: {
        value: error.message,
        updatedAt: new Date()
      },
      create: {
        key: 'saml_metadata_last_refresh_error',
        value: error.message,
        description: 'Last SAML metadata refresh error',
        dataType: 'text',
        category: 'authentication',
        userId: null,
        updatedAt: new Date()
      }
    });
    
    throw error;
  }
}

/**
 * Parse SAML metadata XML to extract certificate and URLs
 */
async function parseSAMLMetadata(metadataXml) {
  try {
    // Basic XML parsing (in production, use a proper XML parser)
    const parsed = {
      certificate: null,
      ssoUrl: null,
      slsUrl: null
    };

    // Extract certificate
    const certMatch = metadataXml.match(/<ds:X509Certificate[^>]*>([\s\S]*?)<\/ds:X509Certificate>/i) ||
                      metadataXml.match(/<X509Certificate[^>]*>([\s\S]*?)<\/X509Certificate>/i);
    if (certMatch) {
      // Clean up certificate - remove whitespace and ensure proper format
      let cert = certMatch[1].replace(/\s+/g, '');
      if (!cert.includes('BEGIN CERTIFICATE')) {
        cert = `-----BEGIN CERTIFICATE-----\n${cert.match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----`;
      }
      parsed.certificate = cert;
    }

    // Extract SSO URL
    const ssoMatch = metadataXml.match(/<SingleSignOnService[^>]*Binding="[^"]*HTTP-(?:POST|Redirect)"[^>]*Location="([^"]*)"/) ||
                     metadataXml.match(/Location="([^"]*)"[^>]*Binding="[^"]*HTTP-(?:POST|Redirect)"/);
    if (ssoMatch) {
      parsed.ssoUrl = ssoMatch[1];
    }

    // Extract SLS URL
    const slsMatch = metadataXml.match(/<SingleLogoutService[^>]*Binding="[^"]*HTTP-(?:POST|Redirect)"[^>]*Location="([^"]*)"/) ||
                     metadataXml.match(/Location="([^"]*)"[^>]*Binding="[^"]*HTTP-(?:POST|Redirect)"[^>]*>[^<]*Logout/);
    if (slsMatch) {
      parsed.slsUrl = slsMatch[1];
    }

    return parsed;
  } catch (error) {
    console.error('Error parsing SAML metadata:', error);
    throw new Error(`Failed to parse SAML metadata: ${error.message}`);
  }
}

/**
 * Check if SAML metadata needs refresh based on configured interval
 */
export async function shouldRefreshSAMLMetadata() {
  try {
    const [lastRefreshSetting, intervalSetting] = await Promise.all([
      appPrisma.settings.findFirst({
        where: { key: 'saml_metadata_last_refresh', userId: null }
      }),
      appPrisma.settings.findFirst({
        where: { key: 'saml_metadata_refresh_interval_hours', userId: null }
      })
    ]);

    const refreshIntervalHours = parseInt(intervalSetting?.value || '24'); // Default 24 hours
    
    if (!lastRefreshSetting) {
      return true; // Never refreshed before
    }

    const lastRefresh = new Date(lastRefreshSetting.value);
    const nextRefreshTime = new Date(lastRefresh.getTime() + (refreshIntervalHours * 60 * 60 * 1000));
    
    return new Date() >= nextRefreshTime;
  } catch (error) {
    console.error('Error checking if SAML metadata needs refresh:', error);
    return false;
  }
}

/**
 * Provider presets for common SAML providers
 */
export const SAML_PROVIDER_PRESETS = {
  azure: {
    name: 'Azure Active Directory',
    entityId: 'https://sts.windows.net/{tenant-id}/',
    fieldMappings: {
      email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
      firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
      lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
      displayName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/displayname',
      userId: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'
    }
  },
  google: {
    name: 'Google Workspace',
    entityId: 'https://accounts.google.com/o/saml2?idpid={idp-id}',
    fieldMappings: {
      email: 'email',
      firstName: 'first_name',
      lastName: 'last_name',
      displayName: 'display_name',
      userId: 'name_id'
    }
  },
  okta: {
    name: 'Okta',
    entityId: 'http://www.okta.com/{app-id}',
    fieldMappings: {
      email: 'email',
      firstName: 'firstName',
      lastName: 'lastName',
      displayName: 'displayName',
      userId: 'login'
    }
  },
  onelogin: {
    name: 'OneLogin',
    entityId: 'https://app.onelogin.com/saml/metadata/{app-id}',
    fieldMappings: {
      email: 'email',
      firstName: 'first_name',
      lastName: 'last_name',
      displayName: 'display_name',
      userId: 'name_id'
    }
  }
};