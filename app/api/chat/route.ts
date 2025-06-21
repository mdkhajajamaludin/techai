export async function POST(request: Request) {
  return new Response(
    JSON.stringify({
      status: 'Client-side only',
      message: 'This API route is no longer used. Gemini API is now used directly from the client.',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
