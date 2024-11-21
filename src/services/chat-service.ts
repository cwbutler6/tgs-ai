import { metadata } from '@/app/layout'
import { ChatResponse, ConversationHistory } from '@/types/chat'

export interface ChatContext {
  user_id?: string
  metadata?: Record<string, any>
  source?: string
  locale?: string
  timezone?: string
  previous_context?: Record<string, any>
  conversation_history?: ConversationHistory[]
}

export class ChatService {
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY = 1000

  static async sendMessage(
    query: string, 
    sessionId: string, 
    context: ChatContext = {},
    retryCount = 0
  ): Promise<ChatResponse> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          session_id: sessionId,
          user_id: context.user_id,
          metadata: context.metadata || {},
          source: context.source || 'chat',
          locale: context.locale || 'en-US',
          timezone: context.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          previous_context: context.previous_context || {},
          conversation_history: context.conversation_history || []
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      return {
        text: data.response || data.error,
        status: data.status,
        error: data.error,
        correlationId: data.correlation_id,
        data: data.data
      }
    } catch (error) {
      if (retryCount < this.MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * (retryCount + 1)))
        return this.sendMessage(query, sessionId, context, retryCount + 1)
      }
      throw error
    }
  }

  static async clearSession(sessionId: string): Promise<void> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/clear-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
    } catch (error) {
      console.error('Error clearing session:', error)
      throw error
    }
  }
}