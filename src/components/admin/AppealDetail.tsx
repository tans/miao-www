"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface AppealDetailProps {
  appealId: string;
}

interface Appeal {
  id: number;
  type: number;
  status: number;
  target_id: number;
  user_id: number;
  created_at: string;
  handle_at?: string;
  reason?: string;
  result?: string;
}

const statusMap: Record<number, { label: string; variant: "default" | "secondary" | "outline" }> = {
  1: { label: "待处理", variant: "secondary" },
  2: { label: "已处理", variant: "default" },
  3: { label: "已关闭", variant: "outline" },
};

const typeMap: Record<number, string> = {
  1: "任务申诉",
  2: "提现申诉",
  3: "其他",
};

export function AppealDetail({ appealId }: AppealDetailProps) {
  const [appeal, setAppeal] = useState<Appeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [handleStatus, setHandleStatus] = useState("accepted");
  const [handleReply, setHandleReply] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      window.location.href = "/admin/login";
      return;
    }

    const id = parseInt(appealId, 10);
    if (!Number.isFinite(id) || id <= 0) {
      setError("无效的申诉ID");
      setLoading(false);
      return;
    }

    loadAppeal(id);
  }, [appealId]);

  async function loadAppeal(id: number) {
    try {
      const res = await api.getAppealDetail(id);
      if (res.code === 0) {
        setAppeal(res.data as Appeal);
      } else {
        setError(res.message);
      }
    } catch (e) {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!handleReply.trim()) {
      toast.error("请输入处理说明");
      return;
    }

    if (!confirm("确定提交处理结果？")) return;

    const accepted = handleStatus === "accepted";

    try {
      const res = await api.handleAppeal(parseInt(appealId, 10), accepted, handleReply);
      if (res.code === 0) {
        toast.success("处理成功");
        loadAppeal(parseInt(appealId, 10));
      } else {
        toast.error("处理失败: " + res.message);
      }
    } catch (e) {
      toast.error("处理失败");
    }
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (loading || !appeal) {
    return <div className="text-center py-12 text-muted-foreground">加载中...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>申诉信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground text-sm">申诉ID</span>
            <span className="font-mono text-sm">{appeal.id}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground text-sm">类型</span>
            <Badge variant="outline">{typeMap[appeal.type] || "未知"}</Badge>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground text-sm">状态</span>
            <Badge variant={statusMap[appeal.status]?.variant || "secondary"}>
              {statusMap[appeal.status]?.label || "未知"}
            </Badge>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground text-sm">关联ID</span>
            <a href={`/admin/task-detail?id=${appeal.target_id}`} className="text-primary hover:underline font-mono text-sm">
              {appeal.target_id}
            </a>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground text-sm">用户ID</span>
            <a href={`/admin/user-detail?id=${appeal.user_id}`} className="text-primary hover:underline font-mono text-sm">
              {appeal.user_id}
            </a>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground text-sm">创建时间</span>
            <span className="text-sm">{appeal.created_at ? new Date(appeal.created_at).toLocaleString("zh-CN") : "-"}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground text-sm">处理时间</span>
            <span className="text-sm">{appeal.handle_at ? new Date(appeal.handle_at).toLocaleString("zh-CN") : "-"}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>申诉原因</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap text-sm">{appeal.reason || "无"}</div>
        </CardContent>
      </Card>

      {appeal.result && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>处理结果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm">{appeal.result}</div>
          </CardContent>
        </Card>
      )}

      {appeal.status === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>处理申诉</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="handle-status">处理结果</Label>
              <div className="relative">
                <select
                  id="handle-status"
                  className="h-8 pl-3 pr-8 rounded-md border border-input bg-transparent text-sm appearance-none cursor-pointer hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 w-full"
                  value={handleStatus}
                  onChange={(e) => setHandleStatus(e.target.value)}
                >
                  <option value="accepted">通过申诉</option>
                  <option value="rejected">拒绝申诉</option>
                </select>
                <svg
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="handle-reply">回复说明</Label>
              <Textarea
                id="handle-reply"
                rows={4}
                placeholder="请输入处理说明..."
                value={handleReply}
                onChange={(e) => setHandleReply(e.target.value)}
              />
            </div>
            <Button onClick={handleSubmit} className="w-full">提交处理</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
