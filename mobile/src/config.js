// ─── AI API Keys ─────────────────────────────────────────────────────────────
// Keys are injected at build time from EAS Secrets.
// To set them, run:
//
//   eas secret:create --scope project --name EXPO_PUBLIC_GEMINI_API_KEY --value "AIza..."
//   eas secret:create --scope project --name EXPO_PUBLIC_GROQ_API_KEY   --value "gsk_..."
//
// For local dev, create a .env file in mobile/ with:
//   EXPO_PUBLIC_GEMINI_API_KEY=AIza...
//   EXPO_PUBLIC_GROQ_API_KEY=gsk_...

export const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
export const GROQ_API_KEY   = process.env.EXPO_PUBLIC_GROQ_API_KEY   ?? '';

// Models
export const GROQ_MODEL   = 'llama-3.3-70b-versatile';
export const GEMINI_MODEL = 'gemini-1.5-flash';
