/**
 * ElevenLabs TTS Tool — text-to-speech synthesis.
 */
import type { ITool, ToolExecutionContext, ToolExecutionResult, JSONSchemaObject } from '@framers/agentos';
export interface TTSInput {
    text: string;
    voice?: string;
    model?: string;
    stability?: number;
    similarity_boost?: number;
}
export interface TTSOutput {
    text: string;
    voice: string;
    model: string;
    audioBase64: string;
    contentType: string;
    durationEstimateMs: number;
}
export declare class TextToSpeechTool implements ITool<TTSInput, TTSOutput> {
    readonly id = "elevenlabs-tts-v1";
    readonly name = "text_to_speech";
    readonly displayName = "Text to Speech";
    readonly description: string;
    readonly category = "media";
    readonly version = "1.0.0";
    readonly hasSideEffects = false;
    readonly inputSchema: JSONSchemaObject;
    readonly requiredCapabilities: string[];
    private apiKey;
    constructor(apiKey?: string);
    execute(args: TTSInput, _context: ToolExecutionContext): Promise<ToolExecutionResult<TTSOutput>>;
}
//# sourceMappingURL=textToSpeech.d.ts.map