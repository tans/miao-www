"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Task {
  id: number;
  title: string;
  description?: string;
  business_id: number;
  status: number;
  created_at: string;
  unit_price: number;
  total_budget: number;
  paid_amount: number;
  remaining_count: number;
  claimed_count: number;
  submitted_count: number;
  cover_image?: string;
}

interface Claim {
  id: number;
  creator_id: number;
  status: number;
  submit_at?: string;
  work_id: number;
}

const statusMap: Record<number, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  1: { label: "待审核", variant: "secondary" },
  2: { label: "已上架", variant: "default" },
  3: { label: "进行中", variant: "default" },
  4: { label: "已结束", variant: "outline" },
  5: { label: "已取消", variant: "destructive" },
};

export function TaskDetail() {
  const [task, setTask] = useState<Task | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      window.location.href = "/admin/login";
      return;
    }

    if (initialized.current) return;
    initialized.current = true;

    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get("id") || "");
    if (isNaN(id)) {
      setError("无效的任务ID");
      setLoading(false);
      return;
    }

    setTaskId(params.get("id"));
    loadTask(id);
  }, []);

  async function loadTask(id: number) {
    try {
      const res = await api.getTaskDetail(id);
      if (res.code === 0) {
        setTask(res.data.task);
        loadClaims(id);
      } else {
        setError(res.message);
        setLoading(false);
      }
    } catch (e) {
      setError("加载失败");
      setLoading(false);
    }
  }

  async function loadClaims(id: number) {
    try {
      const res = await api.getClaims({ task_id: id });
      if (res.code === 0) {
        setClaims(res.data.claims || []);
      }
    } catch (e) {
      console.error("加载投稿失败", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(approve: boolean) {
    const taskId = new URLSearchParams(window.location.search).get("id");
    const id = parseInt(taskId || "");
    if (isNaN(id)) return;
    if (!confirm(approve ? "确定通过该任务审核？" : "确定拒绝该任务？")) return;
    try {
      const res = await api.reviewTask(id, approve);
      if (res.code === 0) {
        toast.success(approve ? "已通过审核" : "已拒绝");
        loadTask(id);
      } else {
        toast.error("操作失败: " + res.message);
      }
    } catch (e) {
      toast.error("操作失败");
    }
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (loading || !task) {
    return <div className="text-center py-12 text-muted-foreground">加载中...</div>;
  }

  const totalCount = Math.floor(task.total_budget / task.unit_price) || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">任务ID</span>
              <span className="font-mono text-sm">{task.id}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">标题</span>
              <span className="font-medium">{task.title}</span>
            </div>
            <div className="py-2 border-b">
              <span className="text-muted-foreground text-sm block mb-1">描述</span>
              <span className="text-sm whitespace-pre-wrap">{task.description || "-"}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">商家ID</span>
              <span className="font-mono text-sm">{task.business_id}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">状态</span>
              <Badge variant={statusMap[task.status]?.variant || "secondary"}>
                {statusMap[task.status]?.label || "未知"}
              </Badge>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground text-sm">创建时间</span>
              <span className="text-sm">{new Date(task.created_at).toLocaleString("zh-CN")}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>价格与预算</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">单价</span>
              <span className="font-mono text-lg text-green-600">¥{task.unit_price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">总预算</span>
              <span className="font-mono">¥{task.total_budget.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">已支付</span>
              <span className="font-mono">¥{task.paid_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground text-sm">剩余数量</span>
              <span>{task.remaining_count} / {totalCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>进度</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">已认领</span>
              <span>{task.claimed_count || 0}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground text-sm">已提交</span>
              <span>{task.submitted_count || 0}</span>
            </div>
          </CardContent>
        </Card>

        {task.cover_image && (
          <Card>
            <CardHeader>
              <CardTitle>封面图</CardTitle>
            </CardHeader>
            <CardContent>
              <img src={task.cover_image} alt="封面" className="w-full max-w-sm rounded-lg" />
            </CardContent>
          </Card>
        )}
      </div>

      {task.status === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>审核操作</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={() => handleReview(true)} className="bg-green-600 hover:bg-green-700">
              通过审核
            </Button>
            <Button onClick={() => handleReview(false)} variant="destructive">
              拒绝
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>投稿列表</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {claims.length === 0 ? (
            <Alert className="m-4">
              <AlertDescription>暂无投稿</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>创作者</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>提交时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((claim) => (
                  <TableRow key={claim.id}>
                    <TableCell className="font-mono text-xs">{claim.id}</TableCell>
                    <TableCell className="font-mono text-xs">{claim.creator_id}</TableCell>
                    <TableCell>
                      <Badge variant={statusMap[claim.status]?.variant || "secondary"}>
                        {statusMap[claim.status]?.label || "未知"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {claim.submit_at ? new Date(claim.submit_at).toLocaleString("zh-CN") : "-"}
                    </TableCell>
                    <TableCell>
                      <a href={`/admin/work-detail?id=${claim.work_id}`} className="text-primary hover:underline text-sm">
                        查看作品
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}