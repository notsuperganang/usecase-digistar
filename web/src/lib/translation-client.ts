/**
 * Hugging Face Translation Client
 *
 * Translates Indonesian text to English for ML model input
 * Uses Helsinki-NLP/opus-mt-id-en model
 */

import { InferenceClient } from '@huggingface/inference';
import { logger } from './logger';

const HF_API_KEY = process.env.HF_API_KEY;
const TRANSLATION_MODEL = 'Helsinki-NLP/opus-mt-id-en';

if (!HF_API_KEY) {
  throw new Error('HF_API_KEY environment variable is not set');
}

class TranslationClient {
  private client: InferenceClient;

  constructor() {
    this.client = new InferenceClient(HF_API_KEY);
  }

  /**
   * Translate Indonesian text to English
   */
  async translateToEnglish(
    text: string,
    ticketId?: string
  ): Promise<{ translatedText: string; processingTimeMs: number }> {
    const startTime = Date.now();

    try {
      logger.info('Translating text to English', {
        ticket_id: ticketId,
        model: TRANSLATION_MODEL,
        input_length: text.length,
      });

      const result = await this.client.translation({
        model: TRANSLATION_MODEL,
        inputs: text,
      });

      const translatedText = result.translation_text;
      const processingTimeMs = Date.now() - startTime;

      logger.info('Translation completed', {
        ticket_id: ticketId,
        output_length: translatedText.length,
        elapsed_ms: processingTimeMs,
      });

      return { translatedText, processingTimeMs };
    } catch (error) {
      const elapsedMs = Date.now() - startTime;

      logger.error('Translation failed', {
        ticket_id: ticketId,
        error: error instanceof Error ? error.message : 'Unknown error',
        elapsed_ms: elapsedMs,
      });

      throw new Error(
        `Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Export singleton instance
export const translationClient = new TranslationClient();
