import { useState, useRef, useEffect } from 'react'
import { Message } from '@/types/chat'
import { ChatService, ChatContext } from '@/services/chat-service'
import { useToast } from '@/hooks/use-toast'

interface UseChatOptions {
  persistMessages?: boolean
  initialContext?: ChatContext
}

const generateUserId = () => {
  if (typeof window === 'undefined') return ''
  
  const savedUserId = localStorage.getItem('chatUserId')
  if (savedUserId) return savedUserId
  
  const newUserId = `user-${Date.now()}-${Math.random().toString(36).slice(2)}`
  localStorage.setItem('chatUserId', newUserId)
  return newUserId
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const userId = useRef(generateUserId())

  // Load messages from localStorage if persistence is enabled
  useEffect(() => {
    if (typeof window === 'undefined') return

    const loadMessages = async () => {
      if (options.persistMessages) {
        try {
          const history = await ChatService.getConversationHistory(userId.current)
          if (history && history.length > 0) {
            const messages = history.map((msg): Message => ({
              id: Date.now().toString() + Math.random(),
              text: msg.content,
              sender: msg.role,
              timestamp: new Date(msg.timestamp)
            }))
            setMessages(messages)
          }
        } catch (error) {
          console.error('Error loading messages:', error)
          const savedMessages = localStorage.getItem('chatMessages')
          if (savedMessages) {
            const parsedMessages = JSON.parse(savedMessages).map((msg: Message) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
            setMessages(parsedMessages)
          }
        }
      }
    }
    loadMessages()
  }, [options.persistMessages])

  // Save messages to localStorage when they change
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (options.persistMessages) {
      localStorage.setItem('chatMessages', JSON.stringify(messages))
    }
  }, [messages, options.persistMessages])

  const sendMessage = async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await ChatService.sendMessage(
        text,
        userId.current
      )
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.text,
        sender: 'assistant',
        timestamp: new Date(),
        data: response.data
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive'
      })
      // Remove the failed message
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
    }
  }

  const retryMessage = async (messageId: string): Promise<void> => {
    const messageToRetry = messages.find(m => m.id === messageId)
    if (!messageToRetry) return
    
    // Remove the failed message and its response
    setMessages(prev => prev.slice(0, -2))
    // Retry sending the message
    await sendMessage(messageToRetry.text)
  }

  const clearChat = () => {
    setMessages([])
    if (options.persistMessages) {
      localStorage.removeItem('chatMessages')
    }
  }

  return {
    messages,
    isLoading,
    sendMessage,
    retryMessage,
    clearChat,
    userId: userId.current
  }
}