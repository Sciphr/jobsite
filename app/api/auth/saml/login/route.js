import { generateSAMLLoginURL } from "../../../../lib/saml";

// Handle SAML login initiation
export const GET = async (request) => {
  try {
    console.log('🔐 Initiating SAML login');
    
    const loginUrl = await generateSAMLLoginURL();
    
    console.log('✅ Generated SAML login URL, redirecting to IdP');
    return Response.redirect(loginUrl, 302);

  } catch (error) {
    console.error('❌ SAML login initiation error:', error);
    
    // Redirect back to sign-in page with error
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('error', 'saml_config_error');
    
    return Response.redirect(signInUrl, 302);
  }
};