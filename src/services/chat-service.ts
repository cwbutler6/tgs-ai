import { ChatResponse } from '@/types/chat'

export class ChatService {
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY = 1000

  static async sendMessage(text: string, sessionId: string, retryCount = 0): Promise<ChatResponse> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, session_id: sessionId })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      if (retryCount < this.MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * (retryCount + 1)))
        return this.sendMessage(text, sessionId, retryCount + 1)
      }
      throw error
    }
  }
} 