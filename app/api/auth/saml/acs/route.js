import { processSAMLResponse } from "../../../../lib/saml";
import { signIn } from "next-auth/react";

// Handle SAML Assertion Consumer Service (ACS) - where SAML responses are posted
export const POST = async (request) => {
  try {
    const formData = await request.formData();
    const samlResponse = formData.get('SAMLResponse');
    
    if (!samlResponse) {
      return Response.json({ error: 'No SAML response provided' }, { status: 400 });
    }

    console.log('🔐 Received SAML response at ACS endpoint');

    // For now, redirect to a custom sign-in page that can handle the SAML response
    // In production, you'd want to process this more securely
    const redirectUrl = new URL('/auth/signin', request.url);
    redirectUrl.searchParams.set('saml_response', samlResponse);
    redirectUrl.searchParams.set('provider', 'saml');
    
    return Response.redirect(redirectUrl, 302);

  } catch (error) {
    console.error('❌ SAML ACS error:', error);
    return Response.json({ error: 'SAML authentication failed' }, { status: 500 });
  }
};