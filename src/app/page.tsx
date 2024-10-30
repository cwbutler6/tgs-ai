"use client"

import React from "react"
import { Card } from "@/components/ui/card"
import { ChatInterface } from "@/components/chat-interface"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <Card className="w-full max-w-4xl">
        <ChatInterface />
      </Card>
    </main>
  )
}
