import { Message } from '@/types/chat'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatMessageProps {
  message: Message
  onRetry?: (messageId: string) => Promise<void> | void
  isLoading?: boolean
  retryMessage?: (messageId: string) => Promise<void> | void
}

export function ChatMessage({ message, isLoading, retryMessage }: ChatMessageProps) {
  const isAssistant = message.sender === 'assistant'

  const handleRetry = () => {
    if (retryMessage && message.id) {
      retryMessage(message.id)
    }
  }

  return (
    <div className={`flex gap-3 ${isAssistant ? 'flex-row' : 'flex-row-reverse'}`}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={isAssistant ? "/ai-avatar.png" : "/user-avatar.png"} />
        <AvatarFallback>{isAssistant ? 'AI' : 'U'}</AvatarFallback>
      </Avatar>

      <div className={`flex flex-col gap-2 ${isAssistant ? 'items-start' : 'items-end'} max-w-[80%]`}>
        <Card className={`px-4 py-3 ${isAssistant ? 'bg-secondary' : 'bg-primary text-primary-foreground'}`}>
          {message.error ? (
            <div className="flex flex-col gap-2">
              <p className="text-destructive">{message.error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetry}
                disabled={message.retrying}
                className="flex gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${message.retrying ? 'animate-spin' : ''}`} />
                {message.retrying ? 'Retrying...' : 'Retry'}
              </Button>
            </div>
          ) : isLoading ? (
            <div className="flex items-center gap-2">
              <div className="flex space-x-2">
                <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]"></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]"></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400"></div>
              </div>
              <span className="text-sm text-muted-foreground">AI is thinking...</span>
            </div>
          ) : (
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              className="prose dark"
            >
              {message.text}
            </ReactMarkdown>
          )}
        </Card>
      </div>
    </div>
  )
}