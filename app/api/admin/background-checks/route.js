// app/api/admin/background-checks/route.js
import { NextResponse } from "next/server";
import { protectRoute } from "@/app/lib/middleware/apiProtection";
import { appPrisma } from "@/app/lib/prisma";
import { logAuditEvent } from "@/lib/auditMiddleware";
import crypto from "crypto";

// Decryption function
function decrypt(text) {
  const algorithm = "aes-256-cbc";
  const key = Buffer.from(
    process.env.ENCRYPTION_KEY || "12345678901234567890123456789012",
    "utf-8"
  ).slice(0, 32);
  const parts = text.split(":");
  const iv = Buffer.from(parts.shift(), "hex");
  const encryptedText = parts.join(":");
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// Helper function to get CERTN access token
async function getCertnAccessToken(clientId, clientSecret, environment) {
  const baseUrl = environment === "demo"
    ? "https://demo-api.certn.co"
    : "https://api.certn.co";

  const tokenResponse = await fetch(`${baseUrl}/v1/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error("Failed to get CERTN access token");
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

export async function GET(request) {
  try {
    const authResult = await protectRoute("applications", "read");
    if (authResult.error) return authResult.error;
    const { session } = authResult;

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get("applicationId");

    if (!applicationId) {
      return NextResponse.json(
        { error: "Application ID is required" },
        { status: 400 }
      );
    }

    // Get active background check for this application
    const backgroundCheck = await appPrisma.background_checks.findFirst({
      where: {
        application_id: applicationId,
        is_active: true,
      },
      orderBy: { initiated_at: "desc" },
    });

    return NextResponse.json({
      backgroundCheck,
    });
  } catch (error) {
    console.error("Error fetching background check:", error);
    return NextResponse.json(
      { error: "Failed to fetch background check" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const authResult = await protectRoute("applications", "update");
    if (authResult.error) return authResult.error;
    const { session } = authResult;

    const { applicationId, packageId, candidateInfo } = await request.json();

    if (!applicationId || !packageId || !candidateInfo) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get application
    const application = await appPrisma.applications.findUnique({
      where: { id: applicationId },
      include: {
        jobs: {
          select: { title: true },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Check if an active background check is pending
    const existingCheck = await appPrisma.background_checks.findFirst({
      where: {
        application_id: applicationId,
        status: "pending",
        is_active: true,
      },
    });

    if (existingCheck) {
      return NextResponse.json(
        {
          error:
            "A background check is already in progress for this candidate. Please wait for it to complete.",
        },
        { status: 400 }
      );
    }

    // Mark any existing checks as inactive (for re-runs)
    await appPrisma.background_checks.updateMany({
      where: {
        application_id: applicationId,
        is_active: true,
      },
      data: {
        is_active: false,
      },
    });

    // Get CERTN credentials
    const certnClientId = await appPrisma.settings.findFirst({
      where: { key: "certn_client_id" },
    });

    const certnClientSecret = await appPrisma.settings.findFirst({
      where: { key: "certn_client_secret" },
    });

    const certnEnvironment = await appPrisma.settings.findFirst({
      where: { key: "certn_environment" },
    });

    if (!certnClientId?.value || !certnClientSecret?.value) {
      return NextResponse.json(
        { error: "CERTN is not configured" },
        { status: 400 }
      );
    }

    const clientId = decrypt(certnClientId.value);
    const clientSecret = decrypt(certnClientSecret.value);
    const environment = certnEnvironment?.value || "demo";

    const baseUrl = environment === "demo"
      ? "https://demo-api.certn.co"
      : "https://api.certn.co";

    // Get access token using OAuth flow
    const accessToken = await getCertnAccessToken(clientId, clientSecret, environment);

    // Create applicant in CERTN (CERTN uses "applicants" not "candidates")
    const applicantResponse = await fetch(`${baseUrl}/v1/applicants`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: candidateInfo.email,
        first_name: candidateInfo.firstName,
        middle_name: candidateInfo.middleName || undefined,
        last_name: candidateInfo.lastName,
        phone: candidateInfo.phone,
        date_of_birth: candidateInfo.dob,
        ssn: candidateInfo.ssn,
        driver_license_number: candidateInfo.driverLicenseNumber || undefined,
        driver_license_state: candidateInfo.driverLicenseState || undefined,
      }),
    });

    if (!applicantResponse.ok) {
      const error = await applicantResponse.json();
      console.error("CERTN API error (applicant):", error);
      return NextResponse.json(
        { error: "Failed to create applicant in CERTN" },
        { status: 500 }
      );
    }

    const applicantData = await applicantResponse.json();

    // Map package ID to CERTN package type
    const packageMapping = {
      basic: "criminal_record_check",
      standard: "standard_criminal_check",
      comprehensive: "enhanced_criminal_check",
    };

    const certnPackage = packageMapping[packageId] || "standard_criminal_check";

    // Create background check (application) in CERTN
    const applicationResponse = await fetch(`${baseUrl}/v1/applications`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        applicant_id: applicantData.id,
        package_type: certnPackage,
      }),
    });

    if (!applicationResponse.ok) {
      const error = await applicationResponse.json();
      console.error("CERTN API error (application):", error);
      return NextResponse.json(
        { error: "Failed to create application in CERTN" },
        { status: 500 }
      );
    }

    const reportData = await applicationResponse.json();

    // Save background check record to database
    const backgroundCheck = await appPrisma.background_checks.create({
      data: {
        application_id: applicationId,
        certn_applicant_id: applicantData.id,
        certn_application_id: reportData.id,
        package_type: packageId,
        status: "pending",
        initiated_at: new Date(),
        initiated_by: session.user.id,
        certn_report_url: reportData.report_url || reportData.url || null,
        is_active: true,
        metadata: {
          candidateInfo: {
            firstName: candidateInfo.firstName,
            lastName: candidateInfo.lastName,
            email: candidateInfo.email,
          },
          certnResponse: {
            reportStatus: reportData.status,
            applicantId: applicantData.id,
            applicationId: reportData.id,
          },
        },
      },
    });

    // Add application note
    await appPrisma.application_notes.create({
      data: {
        application_id: applicationId,
        content: `Background check initiated (${packageId} package). CERTN application ID: ${reportData.id}`,
        type: "background_check",
        author_id: session.user.id,
        author_name: session.user.name || session.user.email,
        metadata: {
          backgroundCheckId: backgroundCheck.id,
          certnApplicationId: reportData.id,
          packageType: packageId,
        },
      },
    });

    // Log audit event
    await logAuditEvent({
      eventType: "CREATE",
      category: "BACKGROUND_CHECK",
      subcategory: "INITIATE",
      entityType: "background_check",
      entityId: backgroundCheck.id,
      entityName: `${candidateInfo.firstName} ${candidateInfo.lastName}`,
      actorId: session.user.id,
      actorName: session.user.name || session.user.email,
      actorType: "user",
      action: "Initiate background check",
      description: `Initiated ${packageId} background check for ${candidateInfo.firstName} ${candidateInfo.lastName}`,
      relatedApplicationId: applicationId,
      metadata: {
        packageType: packageId,
        certnApplicantId: applicantData.id,
        certnApplicationId: reportData.id,
      },
    });

    return NextResponse.json({
      success: true,
      backgroundCheck,
      certnApplicantId: applicantData.id,
      certnApplicationId: reportData.id,
    });
  } catch (error) {
    console.error("Error creating background check:", error);
    return NextResponse.json(
      { error: "Failed to create background check" },
      { status: 500 }
    );
  }
}
