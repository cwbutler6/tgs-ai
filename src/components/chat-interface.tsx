/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"

interface Message {
  text: string
  isUser: boolean
  relevantUsers?: unknown[]
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage = input
    setInput("")
    setIsLoading(true)
    setMessages(prev => [...prev, { text: userMessage, isUser: true }])
    console.log(`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: userMessage,
          session_id: "frontend-" + Date.now(),
        }),
      })

      const data = await response.json()
      console.log(data)
      
      if (data.error) {
        console.error(data.error) 
        throw new Error(data.error)
      }

      setMessages(prev => [...prev, {
        text: data.response,
        isUser: false,
        relevantUsers: data.relevant_users
      }])
    } catch (_: unknown) {
      console.error(_)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[600px] p-4">
      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-4">
          {messages.map((message, i) => (
            <div
              key={i}
              className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`rounded-lg px-4 py-2 max-w-[80%] ${
                  message.isUser
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
                {message.relevantUsers && (
                  <div className="mt-2 text-sm">
                    {message.relevantUsers.map((user: any, i: number) => (
                      <div key={i} className="mt-1">
                        {user["First Name"]} {user["Last Name"]} - {user.Title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="flex gap-2 mt-4">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <Button onClick={sendMessage} disabled={isLoading}>
          Send
        </Button>
      </div>
    </div>
  )
}
