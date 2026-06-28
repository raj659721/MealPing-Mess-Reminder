import { useMutation } from "@tanstack/react-query";
import { authFetch } from "@/lib/api-fetch";
import { Language } from "@/lib/i18n";

type TranslateParams = {
  text: string;
  targetLang: Language;
  sourceLang?: Language;
};

type TranslateResponse = {
  translatedText: string;
};

/**
 * Hook to dynamically translate text using Sarvam AI (via Supabase Edge Functions).
 */
export function useTranslate() {
  return useMutation({
    mutationFn: async ({ text, targetLang, sourceLang = "en" }: TranslateParams) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) throw new Error("VITE_SUPABASE_URL is missing");

      // Don't call API if source and target are the same
      if (sourceLang === targetLang) {
        return text;
      }

      const res = await authFetch(`${supabaseUrl}/functions/v1/translate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          targetLang,
          sourceLang,
        }),
      });

      const data = (await res.json()) as TranslateResponse;
      return data.translatedText;
    },
  });
}
