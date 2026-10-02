import { ITTSProvider, TTSVoice } from "./types";
import { VoiceAITTSProvider, VOICE_AI_VOICES } from "./providers/voiceai";
import { ElevenLabsTTSProvider } from "./providers/elevenlabs";
import { MockTTSProvider } from "./providers/mock";
import { CURATED_VOICES } from "./voices";
import { getProviderCredential } from "../providerRegistry";

/**
 * Resolves the active TTS provider.
 * 1. Checks providerRegistry and environment for Voice.ai API keys (supports 4-key pool with failover).
 * 2. Checks providerRegistry and environment for ElevenLabs API key.
 * 3. In dev / fallback mode, returns MockTTSProvider so the pipeline is fully testable without breaking.
 */
export async function getTTSProvider(): Promise<ITTSProvider> {
  try {
    // 1. Voice.ai Provider (Active Multi-Key Pool)
    const voiceAiDbKey = await getProviderCredential("voiceai");
    const voiceAiEnvKeys = process.env.VOICE_AI_API_KEYS || process.env.VOICE_AI_API_KEY || voiceAiDbKey;
    if (voiceAiEnvKeys && voiceAiEnvKeys.trim().includes("vk_")) {
      return new VoiceAITTSProvider(voiceAiEnvKeys);
    }

    // 2. ElevenLabs Provider
    const elevenLabsKey = (await getProviderCredential("elevenlabs")) || process.env.ELEVENLABS_API_KEY;
    if (elevenLabsKey && elevenLabsKey.trim().length > 5) {
      return new ElevenLabsTTSProvider(elevenLabsKey);
    }
  } catch (err) {
    console.warn("[TTS Registry] Error resolving provider credentials:", err);
  }

  return new MockTTSProvider();
}

/**
 * Returns available voices with descriptions and characteristics.
 */
export async function getAvailableVoices(): Promise<TTSVoice[]> {
  return [...VOICE_AI_VOICES, ...CURATED_VOICES];
}

