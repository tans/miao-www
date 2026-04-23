"use client"

import { useState } from "react"
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cn } from "@/lib/utils"

interface FilterTabsProps {
  options: { value: string; label: string }[]
  defaultValue?: string
  onChange?: (value: string) => void
  className?: string
  id?: string
  eventName?: string
}

export function FilterTabs({ options, defaultValue = "", onChange, className, id, eventName }: FilterTabsProps) {
  const [value, setValue] = useState(defaultValue)

  const handleChange = (newValue: string) => {
    setValue(newValue)
    onChange?.(newValue)
    if (eventName) {
      window.dispatchEvent(new CustomEvent(eventName, { detail: { value: newValue } }))
    }
  }

  return (
    <div id={id}>
      <TabsPrimitive value={value} onValueChange={handleChange} className={cn("bg-white rounded-lg border p-1", className)}>
        <TabsPrimitive.List className="bg-transparent flex gap-1">
          {options.map((option) => (
            <TabsPrimitive.Tab
              key={option.value}
              value={option.value}
              className="inline-flex h-[calc(100%-1px)] items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all hover:text-foreground data-active:bg-primary data-active:text-primary-foreground data-active:shadow-sm disabled:pointer-events-none disabled:opacity-50"
            >
              {option.label}
            </TabsPrimitive.Tab>
          ))}
        </TabsPrimitive.List>
      </TabsPrimitive>
    </div>
  )
}
