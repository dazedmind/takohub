export async function POST() {
  return Response.json(
    { success: true },
    {
      status: 200,
      headers: {
        "Set-Cookie": "session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
      },
    }
  );
}
