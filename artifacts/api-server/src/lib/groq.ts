import Groq from "groq-sdk";

let groq: Groq | null = null;

if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export { groq };
