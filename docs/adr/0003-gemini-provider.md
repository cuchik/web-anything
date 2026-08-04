# ADR 0003: Gemini vision provider

Status: accepted for MVP.

Gemini analyzes a validated thumbnail behind a provider boundary. Provider-specific HTTP and prompt logic stays in `lib/ai/gemini.ts`; shared recipe contracts stay provider-neutral. This allows a future provider change without rewriting routes or UI.
