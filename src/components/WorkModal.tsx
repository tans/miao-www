"use client"

import { useState, useEffect } from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { XIcon } from "lucide-react"

interface WorkModalProps {
  onSaved?: () => void
}

export function WorkModal({ onSaved }: WorkModalProps) {
  const [open, setOpen] = useState(false)
  const [workId, setWorkId] = useState<number | null>(null)
  const [content, setContent] = useState("")

  const openModal = (id: number, workContent: string) => {
    setWorkId(id)
    setContent(workContent || "")
    setOpen(true)
  }

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: number; content: string }>
      openModal(customEvent.detail.id, customEvent.detail.content)
    }
    window.addEventListener("work:open-edit-modal", handler)
    return () => window.removeEventListener("work:open-edit-modal", handler)
  }, [])

  const closeModal = () => {
    setOpen(false)
    setWorkId(null)
    setContent("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workId) return
    try {
      const res = await api.updateWork(workId, { content })
      if (res.code === 0) {
        closeModal()
        onSaved?.()
        toast.success("保存成功")
      } else {
        toast.error(res.message || "保存失败")
      }
    } catch (e) {
      toast.error("保存失败")
    }
  }

  return (
    <DialogPrimitive open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Backdrop className="fixed inset-0 isolate z-50 bg-black/10 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
      <DialogPrimitive.Portal>
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-base leading-none font-medium">
              编辑作品
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-work-content">作品内容</Label>
              <Textarea
                id="edit-work-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                placeholder="请输入内容"
              />
            </div>
            <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={closeModal}>
                取消
              </Button>
              <Button type="submit">保存</Button>
            </div>
          </form>
          <DialogPrimitive.Close className="absolute top-2 right-2">
            <Button variant="ghost" size="icon-sm">
              <XIcon />
              <span className="sr-only">Close</span>
            </Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive>
  )
}
