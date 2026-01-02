/**
 * LLM-Judge API Route
 *
 * Main endpoint that orchestrates the entire pipeline:
 * 1. Validate request
 * 2. Translate Indonesian to English (for ML processing)
 * 3. Call ML microservice with English text
 * 4. Call Gemini (judge + respond in Indonesian)
 * 5. Return flat JSON response
 */

import { NextRequest, NextResponse } from 'next/server';
import { mlServiceClient } from '@/lib/ml-service';
import { geminiClient } from '@/lib/gemini-client';
import { translationClient } from '@/lib/translation-client';
import { logger } from '@/lib/logger';
import type { LLMJudgeSuccessResponse, LLMJudgeErrorResponse } from '@/types/api-response';

// Request body validation
interface RequestBody {
  text: string;
  ticket_id?: string;
}

function validateRequest(body: unknown): { valid: true; data: RequestBody } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }

  const { text, ticket_id } = body as Record<string, unknown>;

  if (typeof text !== 'string' || text.trim().length === 0) {
    return { valid: false, error: 'Text field is required and must be non-empty' };
  }

  if (text.length > 10000) {
    return { valid: false, error: 'Text exceeds maximum length of 10,000 characters' };
  }

  if (ticket_id !== undefined && typeof ticket_id !== 'string') {
    return { valid: false, error: 'ticket_id must be a string if provided' };
  }

  return { valid: true, data: { text, ticket_id: ticket_id as string | undefined } };
}

export async function POST(request: NextRequest) {
  const pipelineStartTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();

    // Validate request
    const validation = validateRequest(body);
    if (!validation.valid) {
      logger.warn('Request validation failed', { error: validation.error });

      const errorResponse: LLMJudgeErrorResponse = {
        error: 'Validation Error',
        error_message: validation.error,
        error_stage: 'validation',
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(errorResponse, { status: 400 });
    }

    const { text, ticket_id } = validation.data;

    logger.info('LLM-judge pipeline started', { ticket_id });

    // Step 1: Translate Indonesian to English for ML processing
    let translationResult;
    try {
      translationResult = await translationClient.translateToEnglish(text, ticket_id);
    } catch (error) {
      const errorResponse: LLMJudgeErrorResponse = {
        error: 'Translation Error',
        error_message: error instanceof Error ? error.message : 'Failed to translate text',
        error_stage: 'translation',
        error_details: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(errorResponse, { status: 503 });
    }

    // Step 2: Call ML microservice with English translation
    let mlResponse;
    try {
      mlResponse = await mlServiceClient.predict({
        text: translationResult.translatedText,
        ticket_id
      });
    } catch (error) {
      const errorResponse: LLMJudgeErrorResponse = {
        error: 'ML Service Error',
        error_message: error instanceof Error ? error.message : 'Failed to get ML prediction',
        error_stage: 'ml_service',
        error_details: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(errorResponse, { status: 503 });
    }

    // Step 3: Call Gemini (judge + respond in one call) with both original and translated text
    let llmResult;
    try {
      llmResult = await geminiClient.judgeAndRespond(
        text,                                   // Original Indonesian text
        translationResult.translatedText,       // English translation for context
        mlResponse.prediction,
        ticket_id
      );
    } catch (error) {
      const errorResponse: LLMJudgeErrorResponse = {
        error: 'Gemini Error',
        error_message: error instanceof Error ? error.message : 'Failed to get LLM judgment',
        error_stage: 'gemini',
        error_details: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(errorResponse, { status: 503 });
    }

    // Step 3: Build flat JSON response
    const totalProcessingTime = Date.now() - pipelineStartTime;

    const successResponse: LLMJudgeSuccessResponse = {
      // Request metadata
      ticket_id,
      ticket_text: text,

      // ML results (flattened)
      ml_cluster: mlResponse.prediction.cluster,
      ml_urgency: mlResponse.prediction.urgency,
      ml_priority: mlResponse.prediction.priority,
      ml_confidence: mlResponse.prediction.confidence,
      ml_auto_escalate: mlResponse.prediction.auto_escalate,

      // LLM judgment (flattened)
      llm_ml_valid: llmResult.judgment.ml_valid,
      llm_confidence_assessment: llmResult.judgment.ml_confidence_assessment,
      llm_reasoning: llmResult.judgment.reasoning,
      llm_recommended_action: llmResult.judgment.recommended_action,
      llm_tone: llmResult.judgment.tone,

      // Customer response
      customer_response: llmResult.judgment.customer_response,

      // Processing metadata
      translation_processing_time_ms: translationResult.processingTimeMs,
      ml_processing_time_ms: mlResponse.processing_time_ms || 0,
      llm_processing_time_ms: llmResult.processingTimeMs,
      total_processing_time_ms: totalProcessingTime,
      timestamp: new Date().toISOString(),
    };

    logger.info('LLM-judge pipeline completed', {
      ticket_id,
      ml_valid: llmResult.judgment.ml_valid,
      total_time_ms: totalProcessingTime,
    });

    return NextResponse.json(successResponse, { status: 200 });

  } catch (error) {
    logger.error('Unexpected pipeline error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    const errorResponse: LLMJudgeErrorResponse = {
      error: 'Internal Server Error',
      error_message: 'An unexpected error occurred in the pipeline',
      error_stage: 'processing',
      error_details: error instanceof Error ? error.message : undefined,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method Not Allowed', error_message: 'Use POST method' },
    { status: 405 }
  );
}
