import { getSession } from "@/app/api/utils/get-session.js";

export async function GET(request) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appId = process.env.INSTAGRAM_APP_ID;
  const appUrl = process.env.NEXT_PUBLIC_CREATE_APP_URL || "http://localhost:5000";
  const redirectUri = `${appUrl}/api/instagram/callback`;

  const scopes = [
    "public_profile",
    "email",
    "pages_show_list",
    "pages_read_engagement",
    "business_management",
  ].join(",");

  const authUrl =
    `https://www.facebook.com/v21.0/dialog/oauth?` +
    `client_id=${encodeURIComponent(appId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `response_type=code`;

  return Response.redirect(authUrl);
}
