import { generateSAMLMetadata } from "../../../../lib/saml";

export const GET = async (request) => {
  try {
    const metadata = await generateSAMLMetadata();
    
    return new Response(metadata, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Failed to generate SAML metadata:', error);
    return Response.json({ 
      error: 'Failed to generate SAML metadata' 
    }, { status: 500 });
  }
};