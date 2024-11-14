import { useState, useRef, useEffect } from 'react'
import { Message } from '@/types/chat'
import { ChatService } from '@/services/chat-service'
import { useToast } from '@/hooks/use-toast'

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const sessionId = useRef(`frontend-${Date.now()}`)

  // Load messages from localStorage on mount
  /*useEffect(() => {
    const savedMessages = localStorage.getItem('chatMessages')
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages).map((msg: Message) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      })))
    }
  }, [])*/

  // Save messages to localStorage when they change
  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages))
  }, [messages])

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
      const response = await ChatService.sendMessage(text, sessionId.current)
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.text,
        sender: 'assistant',
        timestamp: new Date(),
        data: response.data
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })

      // Add error state to the last message
      setMessages(prev => prev.map((msg, idx) => 
        idx === prev.length - 1 ? { ...msg, error: true } : msg
      ))
    } finally {
      setIsLoading(false)
    }
  }

  const retryMessage = async (messageIndex: number) => {
    const messageToRetry = messages[messageIndex]
    if (!messageToRetry || messageToRetry.sender !== 'user') return

    // Mark message as retrying
    setMessages(prev => prev.map((msg, idx) => 
      idx === messageIndex ? { ...msg, retrying: true } : msg
    ))

    // Remove subsequent messages
    setMessages(prev => prev.slice(0, messageIndex + 1))

    // Retry the message
    await sendMessage(messageToRetry.text)

    // Remove retry state
    setMessages(prev => prev.map((msg, idx) => 
      idx === messageIndex ? { ...msg, retrying: false, error: false } : msg
    ))
  }

  return {
    messages,
    isLoading,
    sendMessage,
    retryMessage
  }
} 