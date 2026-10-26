export async function GET(request) {
  return Response.json({ csrfToken: crypto.randomUUID() });
}
