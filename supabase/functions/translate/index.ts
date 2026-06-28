import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map our internal lang codes to Sarvam AI codes
const LANG_MAP: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
  gu: "gu-IN"
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, sourceLang = "en", targetLang } = await req.json();

    if (!text || !targetLang) {
      throw new Error('text and targetLang are required');
    }

    const sarvamApiKey = Deno.env.get('SARVAM_API_KEY');
    if (!sarvamApiKey) {
      throw new Error('SARVAM_API_KEY is not set');
    }

    const sLangCode = LANG_MAP[sourceLang] || "en-IN";
    const tLangCode = LANG_MAP[targetLang] || "hi-IN";

    // If source and target are the same, just return the text
    if (sLangCode === tLangCode) {
      return new Response(JSON.stringify({ translatedText: text }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const response = await fetch('https://api.sarvam.ai/translate', {
      method: 'POST',
      headers: {
        'api-subscription-key': sarvamApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: [text],
        source_language_code: sLangCode,
        target_language_code: tLangCode,
        speaker_gender: "Male",
        mode: "formal",
        model: "sarvam-translate"
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Sarvam API Error:', error);
      throw new Error(`Failed to fetch from Sarvam AI: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Sarvam API returns: { translated_text: ["translated text here"] }
    const translatedText = data.translated_text?.[0] || text;

    return new Response(JSON.stringify({ translatedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
