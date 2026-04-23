"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface FilterTabsProps {
  options: { value: string; label: string }[]
  defaultValue?: string
  className?: string
  id?: string
  eventName?: string
}

export function FilterTabs({ options, defaultValue = "", className, id, eventName }: FilterTabsProps) {
  const [value, setValue] = useState(defaultValue)

  const handleChange = (newValue: string) => {
    setValue(newValue)
    if (eventName) {
      window.dispatchEvent(new CustomEvent(eventName, { detail: { value: newValue } }))
    }
  }

  return (
    <div id={id}>
      <Tabs value={value} onValueChange={handleChange} className={cn("bg-white rounded-lg border p-1", className)}>
        <TabsList variant="default" className="bg-transparent flex gap-1">
          {options.map((option) => (
            <TabsTrigger
              key={option.value}
              value={option.value}
              className="inline-flex h-[calc(100%-1px)] items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all hover:text-foreground data-active:bg-primary data-active:text-primary-foreground data-active:shadow-sm disabled:pointer-events-none disabled:opacity-50"
            >
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}
