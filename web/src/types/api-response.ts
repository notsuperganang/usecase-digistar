/**
 * API Response Type Definitions
 *
 * FLAT JSON STRUCTURE - minimal nesting for easy maintenance
 */

// Success response - FLAT structure (user requirement)
export interface LLMJudgeSuccessResponse {
  // Request metadata
  ticket_id?: string;
  ticket_text: string;

  // ML results (flattened)
  ml_cluster: number;
  ml_urgency: string;
  ml_priority: string;
  ml_confidence: number;
  ml_auto_escalate: boolean;

  // LLM judgment (flattened)
  llm_ml_valid: boolean;
  llm_confidence_assessment: string;
  llm_issue_category: string;
  llm_reasoning: string;
  llm_recommended_action: string;
  llm_tone: string;

  // Customer response
  customer_response: string;

  // Processing metadata
  translation_processing_time_ms: number;
  ml_processing_time_ms: number;
  llm_processing_time_ms: number;
  total_processing_time_ms: number;
  timestamp: string;
}

// Error response - FLAT structure
export interface LLMJudgeErrorResponse {
  error: string;
  error_message: string;
  error_stage: "validation" | "translation" | "ml_service" | "gemini" | "processing";
  error_details?: string;
  timestamp: string;
}

// Union type for API response
export type LLMJudgeResponse = LLMJudgeSuccessResponse | LLMJudgeErrorResponse;

// Type guard to check if response is an error
export function isErrorResponse(
  response: LLMJudgeResponse
): response is LLMJudgeErrorResponse {
  return 'error' in response;
}
