/**
 * Supabase Client for Server-Side Operations
 *
 * Used for database operations in API routes
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';
import { extractKeywordsAndPhrases } from './keyword-extraction';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client for server-side operations
export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Database schema types for ticket_results table
 */
export interface TicketResultRow {
  // Request data
  ticket_id?: string;
  ticket_text: string;
  translated_text?: string;

  // ML prediction results
  ml_cluster: number;
  ml_urgency: string;
  ml_priority: string;
  ml_confidence: number;
  ml_auto_escalate: boolean;

  // LLM judgment results
  llm_ml_valid: boolean;
  llm_confidence_assessment: string;
  llm_issue_category: string;
  llm_reasoning: string;
  llm_recommended_action: string;
  llm_tone: string;

  // Customer response
  customer_response: string;

  // Performance metrics (milliseconds)
  translation_time_ms: number;
  ml_processing_time_ms: number;
  llm_processing_time_ms: number;
  total_processing_time_ms: number;

  // Error handling (optional)
  error_stage?: string;
  error_message?: string;
}

/**
 * Save ticket result to database (fire-and-forget)
 *
 * This function saves the complete ticket processing result to the database
 * without blocking the API response. Errors are logged but don't affect the response.
 *
 * Also extracts and saves keywords for theme analysis.
 */
export async function saveTicketResult(data: TicketResultRow): Promise<void> {
  try {
    // 1. Save ticket result and get the inserted ID
    const { data: insertedData, error: insertError } = await supabase
      .from('ticket_results')
      .insert(data)
      .select('id')
      .single();

    if (insertError) {
      logger.error('Failed to save ticket result', {
        error: insertError.message,
        ticket_id: data.ticket_id,
      });
      throw insertError;
    }

    const ticketResultId = insertedData.id;

    logger.info('Ticket result saved to database', {
      ticket_id: data.ticket_id,
      ticket_result_id: ticketResultId,
      cluster: data.ml_cluster,
      category: data.llm_issue_category,
    });

    // 2. Extract keywords from the original Indonesian text
    try {
      const keywords = extractKeywordsAndPhrases(data.ticket_text, {
        maxKeywords: 7,
        maxBigrams: 3,
        minLength: 3,
      });

      if (keywords.length > 0) {
        // 3. Save keywords to ticket_keywords table
        const keywordRows = keywords.map(({ keyword, frequency }) => ({
          ticket_result_id: ticketResultId,
          keyword,
          frequency,
        }));

        const { error: keywordError } = await supabase
          .from('ticket_keywords')
          .insert(keywordRows);

        if (keywordError) {
          logger.error('Failed to save keywords', {
            error: keywordError.message,
            ticket_id: data.ticket_id,
            keyword_count: keywords.length,
          });
          // Don't throw - keyword save failure shouldn't fail the entire operation
        } else {
          logger.info('Keywords extracted and saved', {
            ticket_id: data.ticket_id,
            keyword_count: keywords.length,
            keywords: keywords.map(k => k.keyword).join(', '),
          });
        }
      }
    } catch (keywordError) {
      logger.error('Keyword extraction failed', {
        error: keywordError instanceof Error ? keywordError.message : 'Unknown error',
        ticket_id: data.ticket_id,
      });
      // Don't throw - keyword extraction failure shouldn't fail the entire operation
    }
  } catch (error) {
    logger.error('Database save error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ticket_id: data.ticket_id,
    });
    throw error;
  }
}
