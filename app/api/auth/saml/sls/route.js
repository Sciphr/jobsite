// Handle SAML Single Logout Service (SLS)
export const GET = async (request) => {
  try {
    const url = new URL(request.url);
    const samlRequest = url.searchParams.get('SAMLRequest');
    
    console.log('🚪 SAML logout request received');
    
    // For now, redirect to the main sign-in page
    // In a full implementation, you'd process the logout request and respond appropriately
    return Response.redirect('/auth/signin?message=logged_out', 302);

  } catch (error) {
    console.error('❌ SAML SLS error:', error);
    return Response.redirect('/auth/signin?error=logout_failed', 302);
  }
};

export const POST = async (request) => {
  return GET(request);
};