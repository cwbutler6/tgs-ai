import { useRef, useEffect } from 'react'
import { ChatMessage } from './chat-message'
import { ChatInput } from './chat-input'
import { LoadingMessage } from './loading-message'
import { useChat } from '@/hooks/use-chat'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export function ChatContainer() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { messages, isLoading, sendMessage, retryMessage, clearChat } = useChat({
    persistMessages: true
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <ChatMessage 
              key={message.id} 
              message={message} 
              retryMessage={retryMessage}
            />
          ))}
          {isLoading && <LoadingMessage />}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <div className="border-t p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <ChatInput onSend={sendMessage} isLoading={isLoading} />
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              className="shrink-0"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}