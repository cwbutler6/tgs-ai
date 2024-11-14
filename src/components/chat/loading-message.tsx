import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'

export function LoadingMessage() {
  return (
    <div className="flex gap-3 animate-in fade-in-0 slide-in-from-bottom-3">
      <Avatar className="h-8 w-8 mt-1">
        <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-primary-foreground">
          AI
        </div>
      </Avatar>
      
      <div className="flex-1 max-w-[80%] space-y-2">
        <Card className="p-4 bg-secondary">
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse w-[80%]" />
            <div className="h-4 bg-muted rounded animate-pulse w-[60%]" />
            <div className="h-4 bg-muted rounded animate-pulse w-[70%]" />
          </div>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="p-3 bg-card">
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse w-[60%]" />
              <div className="h-3 bg-muted rounded animate-pulse w-[80%]" />
              <div className="h-3 bg-muted rounded animate-pulse w-[40%]" />
            </div>
          </Card>
          <Card className="p-3 bg-card">
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse w-[70%]" />
              <div className="h-3 bg-muted rounded animate-pulse w-[50%]" />
              <div className="h-3 bg-muted rounded animate-pulse w-[60%]" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
} 