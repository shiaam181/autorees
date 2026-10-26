import { getSession } from "@/app/api/utils/get-session.js";
import { randomBytes } from "crypto";

export async function GET(request) {
  const session = await getSession(request);
  if (!session || !session.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Generate a random state parameter for CSRF protection
  const state = randomBytes(32).toString("hex");

  // Google OAuth URL Generation
  const clientId = process.env.GOOGLE_CLIENT_ID || "PLACEHOLDER_CLIENT_ID";
  const redirectUri = `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/api/auth/google/callback`;
  const scopes = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/userinfo.email",
  ];

  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes.join(" "))}&` +
    `access_type=offline&` +
    `prompt=consent&` +
    `state=${state}`;

  return Response.redirect(authUrl);
}
