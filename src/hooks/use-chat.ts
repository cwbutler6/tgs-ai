import { useState, useRef, useEffect } from 'react'
import { Message, ConversationHistory } from '@/types/chat'
import { ChatService, ChatContext } from '@/services/chat-service'
import { useToast } from '@/hooks/use-toast'

interface UseChatOptions {
  persistMessages?: boolean
  initialContext?: ChatContext
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const sessionId = useRef(`frontend-${Date.now()}`)
  const context = useRef<ChatContext>(options.initialContext || {})

  // Load messages from localStorage if persistence is enabled
  useEffect(() => {
    if (options.persistMessages) {
      const savedMessages = localStorage.getItem('chatMessages')
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages).map((msg: Message) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
        setMessages(parsedMessages)
        
        // Update conversation history in context
        context.current.conversation_history = parsedMessages.map((msg: Message) => ({
          role: msg.sender,
          content: msg.text,
          timestamp: msg.timestamp.toISOString()
        }))
      }
    }
  }, [options.persistMessages])

  // Save messages to localStorage when they change
  useEffect(() => {
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
      // Update conversation history in context
      context.current.conversation_history = [
        ...(context.current.conversation_history || []),
        {
          role: 'user',
          content: text,
          timestamp: userMessage.timestamp.toISOString()
        }
      ]

      const response = await ChatService.sendMessage(
        text, 
        sessionId.current,
        context.current
      )
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.text,
        sender: 'assistant',
        timestamp: new Date(),
        data: response.data,
        error: response.error,
        correlationId: response.correlationId
      }

      // Update conversation history with assistant's response
      context.current.conversation_history?.push({
        role: 'assistant',
        content: response.text,
        timestamp: assistantMessage.timestamp.toISOString()
      })

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const clearChat = async () => {
    try {
      await ChatService.clearSession(sessionId.current)
      setMessages([])
      context.current.conversation_history = []
      if (options.persistMessages) {
        localStorage.removeItem('chatMessages')
      }
    } catch (error) {
      console.error('Error clearing chat:', error)
      toast({
        title: 'Error',
        description: 'Failed to clear chat. Please try again.',
        variant: 'destructive'
      })
    }
  }

  return {
    messages,
    isLoading,
    sendMessage,
    clearChat,
    sessionId: sessionId.current
  }
}