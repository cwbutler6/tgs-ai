export interface User {
  name: string
  title: string
  company: string
  location: string
  match_score: number
  match_reason: string
}

export interface TemporalData {
  newest_members?: Array<{
    'First Name': string
    'Last Name': string
    'Join Date': string
  }>
}

export interface MessageData {
  users?: User[]
  analytics?: Record<string, unknown>
  temporal?: TemporalData
}

export interface Message {
  id: string
  text: string
  sender: 'user' | 'assistant'
  timestamp: Date
  data?: {
    intent?: {
      intent_type: string
      confidence: number
      entities: string[]
      action_required: boolean
      priority: 'high' | 'medium' | 'low'
    }
    conversation_id?: string
  }
  error?: string
  correlationId?: string
  retrying?: boolean
}

export interface ChatResponse {
  text: string
  status: 'success' | 'error'
  error?: string
  correlationId?: string
  data?: {
    intent?: {
      intent_type: string
      confidence: number
      entities: string[]
      action_required: boolean
      priority: 'high' | 'medium' | 'low'
    }
    conversation_id?: string
  }
  isStreaming?: boolean
}

export interface ConversationHistory {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}