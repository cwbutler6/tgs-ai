import { Message } from '@/types/chat'
import { Avatar } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MessageProps {
  message: Message
  isLast: boolean
}

export function MessageComponent({ message }: MessageProps) {
  const isAssistant = message.sender === 'assistant'
  
  return (
    <div className={`flex gap-3 ${isAssistant ? '' : 'justify-end'} animate-in fade-in-0 slide-in-from-bottom-3`}>
      <div className={`flex gap-2 max-w-[80%] ${isAssistant ? 'order-1' : 'order-2'}`}>
        <Avatar className="h-8 w-8 mt-1">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-primary-foreground">
            {isAssistant ? 'AI' : 'U'}
          </div>
        </Avatar>
        
        <div className="flex flex-col gap-1">
          <Card className={`px-4 py-3 ${
            isAssistant ? 'bg-secondary' : 'bg-primary text-primary-foreground'
          }`}>
            <ReactMarkdown 
              className="prose dark:prose-invert prose-sm"
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ ...props }) => (
                  <a {...props} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" />
                ),
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                code: ({ className, children }) => {
                  const isInline = !className
                  return isInline ? 
                    <code className="bg-muted px-1 py-0.5 rounded text-sm">{children}</code> :
                    <pre className="bg-muted p-3 rounded-lg overflow-x-auto">
                      <code className="text-sm">{children}</code>
                    </pre>
                }
              }}
            >
              {message.text}
            </ReactMarkdown>
          </Card>
          
          {message.data?.users && message.data.users.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              {message.data.users.map((user, idx) => (
                <Card key={idx} className="p-3 hover:shadow-md transition-shadow bg-card">
                  <h4 className="font-medium text-sm">{user.name}</h4>
                  <p className="text-xs text-muted-foreground">{user.title} at {user.company}</p>
                  <p className="text-xs text-muted-foreground">{user.location}</p>
                  <p className="text-xs mt-2 italic">{user.match_reason}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 