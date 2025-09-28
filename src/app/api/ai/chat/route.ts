export const dynamic = 'force-dynamic';

function createStreamedResponse(text: string) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const words = text.split(/(\s+)/); // keep spaces
      let i = 0;
      const interval = setInterval(() => {
        if (i >= words.length) {
          clearInterval(interval);
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(words[i]));
        i++;
      }, 30);
    },
  });
}

function composeReply(prompt: string) {
  const lower = prompt.toLowerCase();
  if (lower.includes('event') || lower.includes('cleanup')) {
    return 'You can browse upcoming cleanups on the Events page. Filter by location or date, then tap Register to join. Need directions? Open an event and use the map for navigation.';
  }
  if (lower.includes('register') || lower.includes('signup')) {
    return 'To register, create an account on the Signup page, then pick any event and press Register. Your points will update automatically after the cleanup.';
  }
  if (lower.includes('points') || lower.includes('leaderboard')) {
    return 'Points increase when you log collected waste. Check the Leaderboard to see your rank among Beach Guardians locally and globally.';
  }
  return 'I’m here to help with events, registration, directions, and impact tracking. Ask anything!';
}

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const reply = composeReply(String(message || ''));
    const stream = createStreamedResponse(reply);
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (e) {
    return new Response('Failed to process chat message', { status: 400 });
  }
}