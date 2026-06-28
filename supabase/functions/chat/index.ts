import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, conversationId } = await req.json();

    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY is not set');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: 'You are MessBot, a helpful assistant for the Mess Manager app. Keep your answers brief, polite, and directly address the user\'s queries about tracking meals, attendance, bills, and settings. Default to answering in Marathi unless the user speaks another language. You do not have access to real user data right now, so provide general guidance on how to use the app.'
          },
          {
            role: 'user',
            content: message
          }
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Groq API Error:', error);
      throw new Error('Failed to fetch from Groq');
    }

    const body = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        const encoder = new TextEncoder();

        let convId = conversationId || Date.now();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.trim() === '' || !line.startsWith('data: ')) continue;
              const dataStr = line.replace('data: ', '').trim();
              if (dataStr === '[DONE]') continue;

              try {
                const data = JSON.parse(dataStr);
                const content = data.choices[0]?.delta?.content;
                if (content) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ conversationId: convId, content })}\n\n`)
                  );
                }
              } catch (e) {
                console.error('Error parsing Groq chunk:', e);
              }
            }
          }
        } finally {
          controller.close();
          reader.releaseLock();
        }
      },
    });

    return new Response(body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
