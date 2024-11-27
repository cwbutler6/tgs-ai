import { ChatResponse, ConversationHistory } from '@/types/chat'

export interface ChatContext {
  conversation_history?: ConversationHistory[]
}

export class ChatService {
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY = 1000

  static async sendMessage(
    message: string, 
    user_id: string
  ): Promise<ChatResponse> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          user_id
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      return {
        text: data.text,
        status: data.success ? 'success' : 'error',
        data: {
          ...data.data
        }
      }

    } catch (error) {
      console.error('Error in chat service:', error)
      throw error
    }
  }

  static async getConversationHistory(user_id: string): Promise<ConversationHistory[]> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/conversation?user_id=${user_id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data.history?.messages || []

    } catch (error) {
      console.error('Error getting conversation history:', error)
      throw error
    }
  }
}