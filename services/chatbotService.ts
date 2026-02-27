/**
 * chatbotService.ts — Voice-to-voice orchestration layer
 *
 * Handles: audio recording (expo-av) → STT → Grok AI → TTS (expo-speech)
 * Full Hindi and English support with voice output.
 */

import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

// ─── Types ─────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
  isVoice?: boolean;
  isSpeaking?: boolean;
}

// ─── Audio Recording ───────────────────────────────────

let recording: Audio.Recording | null = null;

/**
 * Start recording audio from the microphone.
 * Returns true if recording started successfully.
 */
export async function startRecording(): Promise<boolean> {
  try {
    // Request permission
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) return false;

    // Configure audio mode for recording
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    // Start recording with high quality settings
    const { recording: newRecording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );

    recording = newRecording;
    return true;
  } catch (error) {
    console.error('Failed to start recording:', error);
    return false;
  }
}

/**
 * Stop recording and return the audio file URI.
 * Returns null if no recording was in progress.
 */
export async function stopRecording(): Promise<string | null> {
  if (!recording) return null;

  try {
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
    const uri = recording.getURI();
    recording = null;
    return uri;
  } catch (error) {
    console.error('Failed to stop recording:', error);
    recording = null;
    return null;
  }
}

/**
 * Check if currently recording.
 */
export function isRecording(): boolean {
  return recording !== null;
}

// ─── Speech-to-Text (STT) ─────────────────────────────

// STT API key (Google Cloud Speech). Leave empty if not available — voice will fallback to keyboard.
const GEMINI_API_KEY = '';

/**
 * Transcribe audio file.
 * If no API key configured, returns null (user should type instead).
 * When configured, uses Google Cloud Speech-to-Text.
 */
export async function transcribeAudio(audioUri: string): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    // No STT key — gracefully fall back to keyboard
    console.log('No STT API key configured, using keyboard input');
    return null;
  }

  try {
    const response = await fetch(audioUri);
    const blob = await response.blob();
    const base64 = await blobToBase64(blob);

    const res = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            encoding: 'LINEAR16',
            sampleRateHertz: 44100,
            languageCode: 'hi-IN',
            alternativeLanguageCodes: ['en-IN'],
            enableAutomaticPunctuation: true,
          },
          audio: { content: base64 },
        }),
      },
    );

    if (res.ok) {
      const data = await res.json();
      const transcript = data?.results?.[0]?.alternatives?.[0]?.transcript;
      return transcript || null;
    }

    console.warn('STT returned status:', res.status);
    return null;
  } catch (error) {
    console.error('Transcription error:', error);
    return null;
  }
}

/** Convert Blob to base64 string. */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip data URL prefix
      const b64 = result.split(',')[1] || result;
      resolve(b64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── Text-to-Speech (TTS) ──────────────────────────────

/**
 * Speak text aloud using expo-speech.
 * Cleans emojis and formatting for natural speech.
 */
export async function speakText(text: string, isHindi: boolean): Promise<void> {
  // Remove emojis, bullets, special chars for cleaner speech
  const clean = text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u2764]/gu, '')
    .replace(/[•\-\*]/g, ',')
    .replace(/\n+/g, '. ')
    .replace(/₹/g, isHindi ? 'रुपये ' : 'rupees ')
    .replace(/\//g, ' per ')
    .replace(/°C/g, isHindi ? ' डिग्री सेल्सियस' : ' degrees celsius')
    .replace(/%/g, isHindi ? ' प्रतिशत' : ' percent')
    .replace(/km/g, isHindi ? ' किलोमीटर' : ' kilometers')
    .replace(/q\b/g, isHindi ? ' क्विंटल' : ' quintal')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) return;

  const options: Speech.SpeechOptions = {
    language: isHindi ? 'hi-IN' : 'en-IN',
    rate: isHindi ? 0.85 : 0.95,
    pitch: 1.0,
  };

  return new Promise((resolve) => {
    Speech.speak(clean, {
      ...options,
      onDone: () => resolve(),
      onError: () => resolve(),
      onStopped: () => resolve(),
    });
  });
}

/**
 * Stop any ongoing speech.
 */
export function stopSpeaking(): void {
  Speech.stop();
}

/**
 * Check if speech is currently in progress.
 */
export async function isSpeaking(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}

// ─── Utility ───────────────────────────────────────────

/**
 * Generate a unique message ID.
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
