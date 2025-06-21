'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function RealtimeClock() {
  const [time, setTime] = useState<string>('')
  const [date, setDate] = useState<string>('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      
      setTime(now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }))
      
      setDate(now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }))
    }

    // Update immediately
    updateTime()
    
    // Update every second
    const interval = setInterval(updateTime, 1000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col items-start">
              <span className="text-xs font-mono font-medium leading-none">
                {time}
              </span>
              <span className="text-xs text-muted-foreground leading-none">
                {date}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <div className="font-semibold">Live Time</div>
            <div className="text-xs text-muted-foreground">
              Updates every second
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
