import { Message } from '@/types/chat'
import { Avatar } from '@/components/ui/avatar'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import cn from 'classnames'

interface MessageProps {
  message: Message
  isLast: boolean
}

export function MessageComponent({ message }: MessageProps) {
  const isAssistant = message.sender === 'assistant'

  return (
    <div className="flex gap-3 items-start max-w-2xl">
      <Avatar />
      <div className={cn(
        "rounded-xl border px-4 py-3",
        isAssistant
          ? "border-neutral-200 bg-white text-neutral-950 shadow-[0_1px_7px_0_rgba(0,0,0,0.03)] dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50"
          : "border-neutral-200 bg-secondary text-neutral-950 dark:border-neutral-800 dark:bg-secondary dark:text-neutral-50"
      )}>
        <div className="prose prose-neutral dark:prose-invert prose-sm max-w-none">
          <ReactMarkdown>
            {message.text}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}