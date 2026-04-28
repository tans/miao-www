"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WorkModal } from "@/components/WorkModal";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Work {
  id: number;
  task_id: number;
  claim_id: number;
  creator_id: number;
  status: number;
  review_result: number;
  created_at: string;
  review_at?: string;
  content?: string;
  materials?: Array<{
    file_path: string;
    file_type: string;
    thumbnail_path?: string;
  }>;
}

const statusMap: Record<number, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  1: { label: "已认领", variant: "secondary" },
  2: { label: "待验收", variant: "secondary" },
  3: { label: "已验收", variant: "default" },
  4: { label: "已取消", variant: "destructive" },
  5: { label: "已超时", variant: "outline" },
};

export function WorkDetail() {
  const [work, setWork] = useState<Work | null>(null);
  const [workId, setWorkId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      window.location.href = "/admin/login";
      return;
    }

    const id = parseInt(new URLSearchParams(window.location.search).get("id") || "", 10);
    if (!Number.isFinite(id) || id <= 0) {
      setError("无效的作品ID");
      setLoading(false);
      return;
    }

    setWorkId(id);
    loadWork(id);
  }, []);

  async function loadWork(id: number) {
    try {
      const res = await api.getWorkDetail(id);
      if (res.code === 0) {
        setWork(res.data as Work);
      } else {
        setError(res.message);
      }
    } catch (e) {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!workId) return;
    if (!confirm("确定删除该作品？此操作不可恢复。")) return;
    try {
      const res = await api.deleteWork(workId);
      if (res.code === 0) {
        toast.success("已删除");
        window.location.href = "/admin/works";
      } else {
        toast.error("删除失败: " + res.message);
      }
    } catch (e) {
      toast.error("删除失败");
    }
  }

  function handleEdit() {
    if (!work) return;
    window.dispatchEvent(new CustomEvent("work:open-edit-modal", {
      detail: { id: work.id, content: work.content || "" }
    }));
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (loading || !work) {
    return <div className="text-center py-12 text-muted-foreground">加载中...</div>;
  }

  const imageUrls = (work.materials || [])
    .filter((material) => material.file_type?.startsWith("image/"))
    .map((material) => material.thumbnail_path || material.file_path)
    .filter(Boolean);
  const videoUrls = (work.materials || [])
    .filter((material) => material.file_type?.startsWith("video/"))
    .map((material) => material.file_path)
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>作品信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">作品ID</span>
              <span className="font-mono text-sm">{work.id}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">任务ID</span>
              <a href={`/admin/task-detail?id=${work.task_id}`} className="text-primary hover:underline font-mono text-sm">
                {work.task_id}
              </a>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">认领ID</span>
              <span className="font-mono text-sm">{work.claim_id}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">创作者ID</span>
              <a href={`/admin/user-detail?id=${work.creator_id}`} className="text-primary hover:underline font-mono text-sm">
                {work.creator_id}
              </a>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">状态</span>
              <Badge variant={statusMap[work.status]?.variant || "secondary"}>
                {statusMap[work.status]?.label || "未知"}
              </Badge>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">审核结果</span>
              <span className="text-sm">
                {work.review_result === 1 ? "通过" : work.review_result === 2 ? "未通过" : "待审核"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">提交时间</span>
              <span className="text-sm">{work.created_at ? new Date(work.created_at).toLocaleString("zh-CN") : "-"}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground text-sm">审核时间</span>
              <span className="text-sm">{work.review_at ? new Date(work.review_at).toLocaleString("zh-CN") : "-"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>作品内容</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm">{work.content || "无文字内容"}</div>
          </CardContent>
        </Card>

        {imageUrls.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>图片 ({imageUrls.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {imageUrls.map((img, i) => (
                  <img key={i} src={img} alt="作品图片" className="w-full h-40 object-cover rounded-lg border" />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {videoUrls.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>视频 ({videoUrls.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {videoUrls.map((video, i) => (
                <video key={i} controls src={video} className="w-full max-h-96 rounded-lg border" />
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>操作</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button size="sm" onClick={handleEdit}>
              编辑
            </Button>
            <Button size="sm" variant="outline" onClick={handleDelete}>
              删除
            </Button>
          </CardContent>
        </Card>
      </div>

      <WorkModal client:only="react" />
    </div>
  );
}
