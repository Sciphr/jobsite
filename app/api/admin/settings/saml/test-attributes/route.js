import { withAdminAuth } from "../../../../../lib/auth";

export const POST = withAdminAuth(async (request) => {
  try {
    const { testSamlResponse, attributeMappings } = await request.json();
    
    if (!testSamlResponse) {
      return Response.json({ error: 'Test SAML response is required' }, { status: 400 });
    }

    // For testing purposes, we'll simulate parsing a SAML response
    // In a real implementation, you'd parse the actual SAML response
    // This is a mock for testing attribute mappings
    
    // Mock SAML attributes (these would come from the actual SAML response)
    const mockSamlAttributes = {
      // Azure AD style
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'test@company.com',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname': 'John',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname': 'Doe',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/displayname': 'John Doe',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': 'user123',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/mobilephone': '+1234567890',
      
      // Google style fallbacks
      'email': 'test@company.com',
      'first_name': 'John',
      'last_name': 'Doe',
      'display_name': 'John Doe',
      'name_id': 'user123',
      
      // Okta style fallbacks
      'firstName': 'John',
      'lastName': 'Doe',
      'displayName': 'John Doe',
      'login': 'user123'
    };

    // Map attributes based on custom mappings
    const mappedData = {};
    Object.keys(attributeMappings).forEach(field => {
      const samlAttr = attributeMappings[field];
      if (samlAttr && mockSamlAttributes[samlAttr]) {
        mappedData[field] = mockSamlAttributes[samlAttr];
      }
    });

    return Response.json({
      found: true,
      message: 'SAML attribute mapping test successful',
      mappedData,
      allAttributes: mockSamlAttributes
    });
  } catch (error) {
    console.error('SAML attribute test error:', error);
    return Response.json({ 
      error: error.message || 'SAML attribute test failed' 
    }, { status: 500 });
  }
});