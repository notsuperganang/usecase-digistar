/**
 * Google Gemini Client
 *
 * Client for calling Gemini API with judge + response in single call
 * Uses structured output with Zod schemas following @google/genai cookbook
 */

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { logger } from './logger';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { MLPrediction } from '@/types/ml-service';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_TEMPERATURE = parseFloat(process.env.GEMINI_TEMPERATURE || '0.7');

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

// Initialize GoogleGenAI client
const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});

/**
 * Zod schema for LLM judgment response
 * Following Gemini cookbook pattern with specific types and enums
 * This will be converted to JSON Schema using zodToJsonSchema()
 */
const llmJudgmentSchema = z.object({
  ml_valid: z.boolean().describe(
    "Whether the ML prediction is valid and makes sense given the ticket content"
  ),
  ml_confidence_assessment: z.enum(["high", "medium", "low"]).describe(
    "Assessment of the ML model's confidence level: high (>0.85), medium (0.60-0.85), or low (<0.60)"
  ),
  issue_category: z.enum([
    "Billing & Payment",
    "Network & Connectivity",
    "Technical Support",
    "Account & Service Management",
    "General Inquiry & Feedback"
  ]).describe(
    "Category of the customer ticket based on the issue type. Billing & Payment: invoices, charges, payments. Network & Connectivity: signal, internet, coverage. Technical Support: device, configuration, troubleshooting. Account & Service Management: registration, plan changes, subscriptions. General Inquiry & Feedback: questions, complaints, suggestions."
  ),
  reasoning: z.string().describe(
    "Brief explanation of why the ML prediction is valid or invalid (1-2 sentences)"
  ),
  customer_response: z.string().describe(
    "Generated response text for the customer that addresses their issue (2-4 sentences). MUST be written in Indonesian language."
  ),
  recommended_action: z.enum(["escalate", "standard", "automated"]).describe(
    "Recommended action: escalate for high urgency, standard for medium, automated for low"
  ),
  tone: z.enum(["empathetic", "professional", "urgent", "friendly"]).describe(
    "Tone of the customer response based on urgency: empathetic/urgent for high, professional for medium, friendly for low"
  ),
  keywords: z.array(z.string()).min(5).max(10).describe(
    "Extract 5-10 semantically important Indonesian keywords or short phrases from the original ticket. " +
    "These keywords will be used for weekly analytics to identify top customer issues. " +
    "Focus on: problem indicators (internet mati, tagihan salah), product names (IndiHome, fiber), " +
    "emotions (kecewa, urgent), technical terms (modem, router). " +
    "Return actual Indonesian words from the ticket, not English translations. " +
    "Prefer specific multi-word phrases over single words (e.g., 'internet mati' > 'internet'). " +
    "Each keyword should be 2-50 characters. Avoid stopwords and gibberish."
  ),
});

// Export the type inferred from schema
export type LLMJudgmentResponse = z.infer<typeof llmJudgmentSchema>;

/**
 * System instruction that does BOTH judge AND response in one call
 *
 * This is the key innovation - single prompt for dual tasks
 */
const SYSTEM_INSTRUCTION = `You are an AI assistant for TelcoCare, a telecommunications company.

Your task is to:
1. Evaluate ML predictions for customer support tickets
2. Categorize the ticket into a telco business category
3. Generate appropriate customer responses
4. Extract keywords for analytics

You will receive:
- Customer ticket text (original Indonesian + English translation)
- ML prediction: cluster, urgency, priority, confidence

EVALUATION CRITERIA:
- High confidence (>0.85): Usually valid, but check if prediction matches ticket sentiment
- Medium confidence (0.60-0.85): Validate carefully, look for context clues
- Low confidence (<0.60): Likely invalid, rely on ticket text only

CATEGORIZATION CRITERIA:
You must categorize each ticket into ONE of these 5 categories:
1. "Billing & Payment": Invoices, charges, payment issues, billing disputes, refunds
2. "Network & Connectivity": Signal problems, internet speed, coverage issues, outages
3. "Technical Support": Device setup, configuration, troubleshooting, app issues, error messages
4. "Account & Service Management": Registration, plan changes, subscriptions, upgrades, cancellations
5. "General Inquiry & Feedback": General questions, complaints, suggestions, feedback, praise

Choose the category based on the PRIMARY issue in the ticket. If multiple issues exist, prioritize the most urgent or prominent one.

KEYWORD EXTRACTION CRITERIA:
Extract 5-10 important Indonesian keywords or phrases from the ORIGINAL Indonesian ticket text.

Keywords should help CS team identify trending issues across tickets:
- Problem indicators: internet mati, sinyal lemot, tagihan salah, pulsa habis
- Service names: IndiHome, fiber, WiFi, paket internet
- Technical terms: modem, router, aplikasi, instalasi
- Emotions/urgency: kecewa, urgent, penting, komplain, lapor
- Billing terms: tagihan, bayar, kuota, saldo, refund

Guidelines:
1. Prefer multi-word phrases over single words (e.g., "internet mati" > "mati")
2. Use actual words from the Indonesian ticket (not English)
3. Each keyword: 2-50 characters, no gibberish
4. Skip common stopwords (yang, untuk, saya, mohon, terima kasih)
5. Focus on terms useful for aggregating similar issues across tickets

URGENCY MAPPING (for reference):
- Cluster 3: High urgency (service outages, complete failures)
- Cluster 2: Medium urgency (follow-ups, data submissions)
- Clusters 0, 1: Low urgency (thanks, questions, general inquiries)

RESPONSE GUIDELINES:
- If ML valid: Use urgency/priority context to tailor response tone
- If ML invalid: Ignore ML, respond based solely on ticket content
- High urgency: Empathetic, urgent tone; indicate immediate escalation
- Medium urgency: Professional, solution-focused
- Low urgency: Friendly, informative

IMPORTANT: The customer_response field MUST be written in Indonesian language (Bahasa Indonesia).
Even if the ticket text is provided in English (for ML processing), your response to the customer must be in Indonesian.

Always respond with structured JSON matching the provided schema.`;

/**
 * Build complete prompt with system instruction and user input
 * Includes both original Indonesian text and English translation for context
 */
const buildPrompt = (
  originalText: string,
  translatedText: string,
  mlPrediction: MLPrediction
): string => {
  return `${SYSTEM_INSTRUCTION}

CUSTOMER TICKET (Original Indonesian):
"${originalText}"

CUSTOMER TICKET (English translation for ML processing):
"${translatedText}"

ML PREDICTION (based on English translation):
- Cluster: ${mlPrediction.cluster}
- Urgency: ${mlPrediction.urgency}
- Priority: ${mlPrediction.priority}
- Confidence: ${(mlPrediction.confidence * 100).toFixed(1)}%
- Auto-escalate: ${mlPrediction.auto_escalate}

Evaluate this prediction and generate a customer response in Indonesian.`;
};

export class GeminiClient {
  async judgeAndRespond(
    originalText: string,
    translatedText: string,
    mlPrediction: MLPrediction,
    ticketId?: string
  ): Promise<{ judgment: LLMJudgmentResponse; processingTimeMs: number }> {
    const startTime = Date.now();

    try {
      logger.info('Calling Gemini', {
        ticket_id: ticketId,
        model: GEMINI_MODEL,
      });

      const prompt = buildPrompt(originalText, translatedText, mlPrediction);

      // Convert Zod schema to JSON Schema
      const jsonSchema = zodToJsonSchema(llmJudgmentSchema as any);

      // Debug logging
      logger.info('Generated JSON Schema', {
        ticket_id: ticketId,
        schema: JSON.stringify(jsonSchema, null, 2)
      });

      // Generate content with structured output following cookbook pattern
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          temperature: GEMINI_TEMPERATURE,
          responseMimeType: "application/json",
          // Type assertion needed due to Zod v4 compatibility with zod-to-json-schema
          responseJsonSchema: jsonSchema,
        },
      });

      const processingTimeMs = Date.now() - startTime;

      const responseText = response.text;

      // Debug logging
      logger.info('Gemini raw response', {
        ticket_id: ticketId,
        response_text: responseText,
        response_type: typeof responseText
      });

      if (!responseText) {
        throw new Error('No content in Gemini response');
      }

      // Parse and validate response with Zod schema
      const parsedResponse = JSON.parse(responseText);

      // Debug logging
      logger.info('Parsed JSON', {
        ticket_id: ticketId,
        parsed: parsedResponse
      });

      const judgment = llmJudgmentSchema.parse(parsedResponse);

      logger.info('Gemini response received', {
        ticket_id: ticketId,
        ml_valid: judgment.ml_valid,
        recommended_action: judgment.recommended_action,
        elapsed_ms: processingTimeMs,
      });

      return { judgment, processingTimeMs };

    } catch (error) {
      logger.error('Gemini request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        elapsed_ms: Date.now() - startTime,
      });
      throw error;
    }
  }
}

// Export singleton instance
export const geminiClient = new GeminiClient();
