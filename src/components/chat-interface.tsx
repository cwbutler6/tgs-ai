import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

interface Message {
  id: string
  text: string
  sender: 'user' | 'assistant'
  timestamp: Date
  data?: {
    users?: Array<{
      name: string
      title: string
      company: string
      location: string
      match_score: number
      match_reason: string
    }>
    analytics?: Record<string, unknown>
    temporal?: {
      newest_members?: Array<{
        'First Name': string
        'Last Name': string
        'Join Date': string
      }>
    }
  }
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sessionId = useRef(`frontend-${Date.now()}`)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input,
          session_id: sessionId.current
        })
      })

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.text,
        sender: 'assistant',
        timestamp: new Date(),
        data: data.data
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const renderMessage = (message: Message) => (
    <div key={message.id} 
      className={`flex flex-col gap-2 ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8" />
        <span className="text-sm text-muted-foreground">
          {message.timestamp.toLocaleTimeString()}
        </span>
      </div>
      
      <div className={`rounded-lg px-4 py-2 max-w-[80%] ${
        message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
      }`}>
        <ReactMarkdown 
          className="prose dark:prose-invert prose-sm"
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ ...props }) => (
              <a {...props} className="text-blue-500 hover:underline" />
            ),
            code: ({ ...props }) => (
              <code {...props} className="bg-muted-foreground/20 rounded px-1" />
            ),
            ul: ({ ...props }) => (
              <ul {...props} className="list-disc pl-4 my-2" />
            ),
            ol: ({ ...props }) => (
              <ol {...props} className="list-decimal pl-4 my-2" />
            ),
            p: ({ children, ...props }) => {
              const containsTable = React.Children.toArray(children).some(
                child => React.isValidElement(child) && child.type === 'table'
              );
              if (containsTable) {
                return <>{children}</>;
              }
              return <p {...props} className="my-2">{children}</p>;
            },
            table: ({ ...props }) => (
              <table {...props} className="min-w-full my-4 border-collapse" />
            ),
            th: ({ ...props }) => (
              <th {...props} className="border border-muted-foreground/20 px-4 py-2 bg-muted" />
            ),
            td: ({ ...props }) => (
              <td {...props} className="border border-muted-foreground/20 px-4 py-2" />
            )
          }}
        >
          {message.text}
        </ReactMarkdown>

        {message.data?.users && message.data.users.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {message.data.users.map((user, idx) => (
              <Card key={idx} className="p-4 hover:shadow-md transition-shadow">
                <h4 className="font-semibold">{user.name}</h4>
                <p className="text-sm text-muted-foreground">{user.title} at {user.company}</p>
                <p className="text-sm text-muted-foreground">{user.location}</p>
                <p className="text-sm italic mt-2">{user.match_reason}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderLoadingState = () => (
    <div className="flex flex-col gap-2 items-start">
      <div className="flex items-center gap-2">
        <Skeleton circle width={32} height={32} />
        <Skeleton width={60} />
      </div>
      <div className="space-y-2 w-[80%]">
        <Skeleton count={2} />
        <Skeleton width="60%" />
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-[600px] p-4">
      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-4">
          {messages.map(renderMessage)}
          {isLoading && renderLoadingState()}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="flex gap-2 mt-4">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Type your message..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={isLoading}>
          Send
        </Button>
      </div>
    </div>
  )
} 