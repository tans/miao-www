"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WorkModal } from "@/components/WorkModal";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface WorkDetailProps {
  workId: string;
}

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
  images?: string[];
  videos?: string[];
}

const statusMap: Record<number, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  1: { label: "待审核", variant: "secondary" },
  2: { label: "已通过", variant: "default" },
  3: { label: "未通过", variant: "destructive" },
};

export function WorkDetail({ workId }: WorkDetailProps) {
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      window.location.href = "/admin/login";
      return;
    }

    loadWork();
  }, [workId]);

  async function loadWork() {
    try {
      const res = await api.getWorkDetail(parseInt(workId));
      if (res.code === 0) {
        setWork(res.data.work);
      } else {
        setError(res.message);
      }
    } catch (e) {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!confirm("确定通过该作品？")) return;
    try {
      const res = await api.updateWork(parseInt(workId), { status: 2, review_result: 1 });
      if (res.code === 0) {
        toast.success("已通过");
        loadWork();
      } else {
        toast.error("操作失败: " + res.message);
      }
    } catch (e) {
      toast.error("操作失败");
    }
  }

  async function handleReject() {
    if (!confirm("确定拒绝该作品？")) return;
    try {
      const res = await api.updateWork(parseInt(workId), { status: 3, review_result: 2 });
      if (res.code === 0) {
        toast.success("已拒绝");
        loadWork();
      } else {
        toast.error("操作失败: " + res.message);
      }
    } catch (e) {
      toast.error("操作失败");
    }
  }

  async function handleDelete() {
    if (!confirm("确定删除该作品？此操作不可恢复。")) return;
    try {
      const res = await api.deleteWork(parseInt(workId));
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

        {work.images && work.images.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>图片 ({work.images.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {work.images.map((img, i) => (
                  <img key={i} src={img} alt="作品图片" className="w-full h-40 object-cover rounded-lg border" />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {work.videos && work.videos.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>视频 ({work.videos.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {work.videos.map((video, i) => (
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
            {work.status === 1 && (
              <>
                <Button size="sm" onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
                  通过
                </Button>
                <Button size="sm" variant="destructive" onClick={handleReject}>
                  拒绝
                </Button>
              </>
            )}
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