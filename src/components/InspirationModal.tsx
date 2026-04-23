"use client"

import { useState, useEffect } from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { XIcon } from "lucide-react"

interface InspirationModalProps {
  onSaved?: () => void
}

export function InspirationModal({ onSaved }: InspirationModalProps) {
  const [open, setOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [coverUrl, setCoverUrl] = useState("")
  const [status, setStatus] = useState(1)

  const openModal = (isEditMode: boolean, data?: any) => {
    setIsEdit(isEditMode)
    if (isEditMode && data) {
      setEditId(data.id)
      setTitle(data.title || "")
      setContent(data.content || "")
      setCoverUrl(data.cover_url || "")
      setStatus(data.status ?? 1)
    } else {
      setEditId(null)
      setTitle("")
      setContent("")
      setCoverUrl("")
      setStatus(1)
    }
    setOpen(true)
  }

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ isEdit: boolean; data?: any }>
      openModal(customEvent.detail.isEdit, customEvent.detail.data)
    }
    window.addEventListener("inspiration:open-modal", handler)
    return () => window.removeEventListener("inspiration:open-modal", handler)
  }, [])

  const closeModal = () => {
    setOpen(false)
    setTitle("")
    setContent("")
    setCoverUrl("")
    setStatus(1)
    setEditId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = { title, content, cover_url: coverUrl, status }

    try {
      let res
      if (editId) {
        res = await api.updateInspiration(editId, data)
      } else {
        res = await api.createInspiration(data)
      }
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
              {isEdit ? "编辑灵感" : "添加灵感"}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" value={editId || ""} />
            <div className="space-y-2">
              <Label htmlFor="inspiration-title">标题</Label>
              <Input
                type="text"
                id="inspiration-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="请输入标题"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspiration-content">内容</Label>
              <Textarea
                id="inspiration-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="请输入内容"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspiration-cover">封面URL</Label>
              <Input
                type="text"
                id="inspiration-cover"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspiration-status">状态</Label>
              <select
                id="inspiration-status"
                value={status}
                onChange={(e) => setStatus(parseInt(e.target.value))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="0">草稿</option>
                <option value="1">已发布</option>
                <option value="2">已下架</option>
              </select>
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
