/**
 * Chat API Client
 *
 * Wraps the /api/llm-judge endpoint for chat integration.
 * Returns ONLY customer_response (Indonesian text) - hides ML/LLM technical details.
 */

interface ApiResponse {
  customer_response: string;
  // Escalation fields
  ml_auto_escalate?: boolean;
  ml_urgency?: string;
  ml_priority?: string;
  llm_ml_valid?: boolean;
  llm_recommended_action?: string;
  // Other fields exist but are hidden from chat UI
}

interface ApiError {
  error: string;
  error_stage?: string;
  details?: string;
}

export interface ChatApiResponse {
  response: string;
  escalation?: {
    triggered: boolean;
    urgency: string;
    priority: string;
    reason: 'ml' | 'llm';
  };
}

/**
 * Send chat message to LLM judge endpoint
 *
 * @param text - Customer message text (Indonesian)
 * @returns Response with customer message and escalation metadata
 * @throws Error with user-friendly Indonesian message
 */
export async function sendChatMessage(text: string): Promise<ChatApiResponse> {
  try {
    const response = await fetch('/api/llm-judge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        ticket_id: crypto.randomUUID(),
      }),
    });

    const data: ApiResponse | ApiError = await response.json();

    // Check for API errors
    if (!response.ok || 'error' in data) {
      throw new Error(getUserFriendlyError(data as ApiError));
    }

    const apiData = data as ApiResponse;

    // Check escalation conditions
    const isEscalatedByML = 
      apiData.ml_auto_escalate === true && 
      apiData.llm_ml_valid === true;
    
    const isEscalatedByLLM = 
      apiData.llm_recommended_action === 'escalate';

    const isEscalated = isEscalatedByML || isEscalatedByLLM;

    // Return customer response with escalation metadata
    return {
      response: apiData.customer_response,
      escalation: isEscalated ? {
        triggered: true,
        urgency: apiData.ml_urgency || 'High',
        priority: apiData.ml_priority || 'P1',
        reason: isEscalatedByML ? 'ml' : 'llm',
      } : undefined,
    };
  } catch (error) {
    // Network or parsing errors
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Terjadi kesalahan jaringan. Silakan periksa koneksi Anda.');
  }
}

/**
 * Convert API error to user-friendly Indonesian message
 */
function getUserFriendlyError(error: ApiError): string {
  const errorMessages: Record<string, string> = {
    validation: 'Pesan Anda tidak valid. Silakan coba lagi.',
    translation: 'Gagal memproses pesan. Silakan coba lagi.',
    ml_service: 'Layanan sedang sibuk. Mohon tunggu sebentar.',
    gemini: 'Gagal menghasilkan respons. Silakan coba lagi.',
    processing: 'Terjadi kesalahan saat memproses. Silakan coba lagi.',
  };

  // If error_stage is provided, use specific message
  if (error.error_stage && error.error_stage in errorMessages) {
    return errorMessages[error.error_stage];
  }

  // Fallback to generic error message
  return error.error || 'Terjadi kesalahan. Silakan coba lagi.';
}
