import { processSAMLResponse } from "../../../../lib/saml";

// Handle SAML Assertion Consumer Service (ACS) - where SAML responses are posted
export const POST = async (request) => {
  try {
    const formData = await request.formData();
    const samlResponse = formData.get('SAMLResponse');
    
    if (!samlResponse) {
      return Response.json({ error: 'No SAML response provided' }, { status: 400 });
    }

    console.log('🔐 Received SAML response at ACS endpoint');

    // Redirect to signin page with SAML response - it will process immediately and redirect
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const redirectUrl = new URL('/auth/signin', baseUrl);
    redirectUrl.searchParams.set('saml_response', samlResponse);
    redirectUrl.searchParams.set('provider', 'saml');
    
    return Response.redirect(redirectUrl, 302);

  } catch (error) {
    console.error('❌ SAML ACS error:', error);
    return Response.json({ error: 'SAML authentication failed' }, { status: 500 });
  }
};