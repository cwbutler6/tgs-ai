import { Message } from '@/types/chat'
import { ChatMessage } from './chat-message'
import { LoadingMessage } from './loading-message'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useEffect, useRef } from 'react'

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
  onRetry: (index: number) => void
}

export function MessageList({ messages, isLoading, onRetry }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <ScrollArea className="flex-1 pr-4">
      <div className="space-y-4">
        {messages.map((message, index) => (
          <ChatMessage 
            key={message.id} 
            message={message} 
            onRetry={() => onRetry(index)}
          />
        ))}
        {isLoading && <LoadingMessage />}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  )
} 