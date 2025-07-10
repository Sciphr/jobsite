import { getSystemSetting } from "../../../lib/settings";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    // Only allow certain public settings
    const allowedPublicSettings = [
      "max_resume_size_mb",
      "allowed_resume_types",
      "site_name",
      "allow_guest_applications",
      "default_currency",
      "site_description",
    ];

    if (!key || !allowedPublicSettings.includes(key)) {
      return new Response(
        JSON.stringify({ error: "Setting not found or not public" }),
        { status: 404 }
      );
    }

    const value = await getSystemSetting(key);

    return new Response(
      JSON.stringify({
        key,
        value,
        parsedValue: value,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching public setting:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}
