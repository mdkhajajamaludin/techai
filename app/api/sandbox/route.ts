import { FragmentSchema } from '@/lib/schema'
import { ExecutionResultInterpreter, ExecutionResultWeb } from '@/lib/types'
import { Sandbox } from '@e2b/code-interpreter'

const sandboxTimeout = 10 * 60 * 1000 // 10 minute in ms

export const maxDuration = 60

export async function POST(request: Request) {
  return new Response(
    JSON.stringify({
      status: 'Client-side only',
      message: 'This API route is no longer used. Frontend now simulates sandbox responses.',
      url: 'https://example.com/sandbox',
      sbxId: 'mock-sandbox-' + Date.now(),
      template: 'code-interpreter-v1'
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
