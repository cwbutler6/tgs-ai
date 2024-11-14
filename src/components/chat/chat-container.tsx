import { useEffect, useRef } from 'react'
import { MessageComponent } from './message'
import { LoadingMessage } from './loading-message'
import { ChatInput } from './chat-input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useChat } from '@/hooks/use-chat'

export function ChatContainer() {
  const { messages, isLoading, sendMessage } = useChat()
  const scrollRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-[600px]">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {messages.map((message, i) => (
            <MessageComponent 
              key={message.id} 
              message={message}
              isLast={i === messages.length - 1}
            />
          ))}
          {isLoading && <LoadingMessage />}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
      
      <div className="border-t p-4">
        <ChatInput 
          onSend={sendMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
} 