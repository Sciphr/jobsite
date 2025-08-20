import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const smtpConfig = await request.json();
    
    if (!smtpConfig.enabled) {
      return NextResponse.json(
        { error: "SMTP is not enabled" },
        { status: 400 }
      );
    }

    // Validate required fields
    const required = ["host", "port", "fromEmail", "fromName"];
    for (const field of required) {
      if (!smtpConfig[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    if (smtpConfig.requiresAuth && (!smtpConfig.username || !smtpConfig.password)) {
      return NextResponse.json(
        { error: "Username and password are required for authenticated SMTP" },
        { status: 400 }
      );
    }

    // Import nodemailer dynamically to avoid build issues
    const nodemailer = await import("nodemailer");
    
    // Create transporter with the provided configuration
    const transporter = nodemailer.default.createTransporter({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: smtpConfig.requiresAuth ? {
        user: smtpConfig.username,
        pass: smtpConfig.password,
      } : undefined,
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates for testing
      }
    });

    // Verify the connection
    try {
      await transporter.verify();
    } catch (verifyError) {
      console.error("SMTP verification failed:", verifyError);
      return NextResponse.json(
        { error: `SMTP connection failed: ${verifyError.message}` },
        { status: 400 }
      );
    }

    // Send a test email
    try {
      await transporter.sendMail({
        from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
        to: smtpConfig.fromEmail, // Send test email to the from address
        subject: "SMTP Test - Configuration Successful",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">SMTP Configuration Test</h2>
            <p>Congratulations! Your SMTP configuration is working correctly.</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #495057;">Configuration Details:</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li><strong>Host:</strong> ${smtpConfig.host}</li>
                <li><strong>Port:</strong> ${smtpConfig.port}</li>
                <li><strong>Secure:</strong> ${smtpConfig.secure ? 'Yes' : 'No'}</li>
                <li><strong>Authentication:</strong> ${smtpConfig.requiresAuth ? 'Enabled' : 'Disabled'}</li>
                <li><strong>From:</strong> "${smtpConfig.fromName}" &lt;${smtpConfig.fromEmail}&gt;</li>
              </ul>
            </div>
            <p style="color: #6c757d; font-size: 14px;">
              This test email was sent during the setup process of your application.
              You can now proceed with the configuration.
            </p>
          </div>
        `,
        text: `
SMTP Configuration Test

Congratulations! Your SMTP configuration is working correctly.

Configuration Details:
- Host: ${smtpConfig.host}
- Port: ${smtpConfig.port}
- Secure: ${smtpConfig.secure ? 'Yes' : 'No'}
- Authentication: ${smtpConfig.requiresAuth ? 'Enabled' : 'Disabled'}
- From: "${smtpConfig.fromName}" <${smtpConfig.fromEmail}>

This test email was sent during the setup process of your application.
You can now proceed with the configuration.
        `
      });

      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${smtpConfig.fromEmail}`
      });

    } catch (sendError) {
      console.error("Failed to send test email:", sendError);
      return NextResponse.json(
        { error: `Failed to send test email: ${sendError.message}` },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Error testing SMTP configuration:", error);
    return NextResponse.json(
      { error: "Failed to test SMTP configuration" },
      { status: 500 }
    );
  }
}