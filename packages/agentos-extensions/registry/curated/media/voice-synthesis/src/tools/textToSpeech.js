/**
 * ElevenLabs TTS Tool — text-to-speech synthesis.
 */
const VOICES = {
    rachel: '21m00Tcm4TlvDq8ikWAM',
    domi: 'AZnzlk1XvdvUeBnXmlld',
    bella: 'EXAVITQu4vr4xnSDxMaL',
    antoni: 'ErXwobaYiN019PkySvjV',
    josh: 'TxGEqnHWrfWFTfGW9XjX',
    arnold: 'VR6AewLTigWG4xSOukaG',
    adam: 'pNInz6obpgDQGcFmaJgB',
    sam: 'yoZ06aMxZJJ28mfd3POQ',
};
export class TextToSpeechTool {
    id = 'elevenlabs-tts-v1';
    name = 'text_to_speech';
    displayName = 'Text to Speech';
    description = 'Convert text to speech using ElevenLabs. Returns base64-encoded MP3 audio. ' +
        'Voices: rachel, domi, bella, antoni, josh, arnold, adam, sam.';
    category = 'media';
    version = '1.0.0';
    hasSideEffects = false;
    inputSchema = {
        type: 'object',
        properties: {
            text: { type: 'string', description: 'Text to convert. Max 5000 chars.' },
            voice: { type: 'string', default: 'rachel', description: 'Voice name or ID.' },
            model: { type: 'string', default: 'eleven_monolingual_v1' },
            stability: { type: 'number', minimum: 0, maximum: 1, default: 0.5 },
            similarity_boost: { type: 'number', minimum: 0, maximum: 1, default: 0.75 },
        },
        required: ['text'],
    };
    requiredCapabilities = ['capability:tts'];
    apiKey;
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.ELEVENLABS_API_KEY || '';
    }
    async execute(args, _context) {
        if (!this.apiKey)
            return { success: false, error: 'ELEVENLABS_API_KEY not configured.' };
        const text = args.text.slice(0, 5000);
        const voiceId = VOICES[(args.voice || 'rachel').toLowerCase()] || args.voice || VOICES.rachel;
        const model = args.model || 'eleven_monolingual_v1';
        try {
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                method: 'POST',
                headers: { 'xi-api-key': this.apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
                body: JSON.stringify({
                    text,
                    model_id: model,
                    voice_settings: { stability: args.stability ?? 0.5, similarity_boost: args.similarity_boost ?? 0.75 },
                }),
            });
            if (!response.ok) {
                const err = await response.text();
                return { success: false, error: `ElevenLabs error (${response.status}): ${err}` };
            }
            const buf = await response.arrayBuffer();
            const audioBase64 = Buffer.from(buf).toString('base64');
            const durationEstimateMs = Math.round((text.split(/\s+/).length / 150) * 60 * 1000);
            return {
                success: true,
                output: { text, voice: args.voice || 'rachel', model, audioBase64, contentType: 'audio/mpeg', durationEstimateMs },
                contentType: 'audio/mpeg',
            };
        }
        catch (err) {
            return { success: false, error: `TTS failed: ${err.message}` };
        }
    }
}
//# sourceMappingURL=textToSpeech.js.map