import { withAdminAuth } from "../../../../../lib/auth";
import { testSAMLConnection } from "../../../../../lib/saml";

export const POST = withAdminAuth(async (request) => {
  try {
    const result = await testSAMLConnection();
    return Response.json(result);
  } catch (error) {
    console.error('SAML connection test error:', error);
    return Response.json({ 
      success: false, 
      message: error.message || 'SAML connection test failed',
      tests: []
    }, { status: 500 });
  }
});