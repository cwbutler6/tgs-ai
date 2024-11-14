"use client"

import { Card } from "@/components/ui/card"
import { ChatContainer } from "@/components/chat/chat-container"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <Card className="w-full max-w-4xl h-[600px]">
        <ChatContainer />
      </Card>
    </main>
  )
}
