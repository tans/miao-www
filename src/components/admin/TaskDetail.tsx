"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api, type Claim as AdminClaim, type TaskDetail as AdminTaskDetail } from "@/lib/api";
import { toast } from "sonner";

const statusMap: Record<number, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  1: { label: "待审核", variant: "secondary" },
  2: { label: "已上架", variant: "default" },
  3: { label: "进行中", variant: "default" },
  4: { label: "已结束", variant: "outline" },
  5: { label: "已取消", variant: "destructive" },
};

const claimStatusMap: Record<number, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  1: { label: "已认领", variant: "secondary" },
  2: { label: "已提交", variant: "default" },
  3: { label: "已验收", variant: "default" },
  4: { label: "已取消", variant: "destructive" },
  5: { label: "已超时", variant: "outline" },
};

function normalizeClaims(value: unknown): AdminClaim[] {
  if (Array.isArray(value)) {
    return value as AdminClaim[];
  }

  if (value && typeof value === "object") {
    const payload = value as { claims?: AdminClaim[]; data?: AdminClaim[] };
    if (Array.isArray(payload.claims)) return payload.claims;
    if (Array.isArray(payload.data)) return payload.data;
  }

  return [];
}

export function TaskDetail() {
  const [task, setTask] = useState<AdminTaskDetail | null>(null);
  const [claims, setClaims] = useState<AdminClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

    loadTask(id);
  }, []);

  async function loadTask(id: number) {
    try {
      const res = await api.getTaskDetail(id);
      if (res.code === 0) {
        const taskData = res.data;
        const rawStatus = taskData.status as number | string;
        const statusMapStrToNum: Record<string, number> = {
          pending: 1,
          published: 2,
          ongoing: 3,
          completed: 4,
          cancelled: 5,
        };
        const totalCount = taskData.total_count ?? (taskData.unit_price ? Math.floor((taskData.total_budget || 0) / taskData.unit_price) : 0);
        const totalBudget = taskData.total_budget ?? (taskData.unit_price || 0) * totalCount;
        setTask({
          ...taskData,
          status: typeof rawStatus === "string" ? statusMapStrToNum[rawStatus] || 1 : rawStatus,
          total_count: totalCount,
          total_budget: totalBudget,
          business_id: taskData.business_id || 0,
          business_name: taskData.business_name || "",
          claimed_count: taskData.claimed_count ?? normalizeClaims(taskData.claims).length,
          submitted_count: taskData.submitted_count ?? normalizeClaims(taskData.claims).filter((claim) => claim.status >= 2).length,
        });
        const taskClaims = normalizeClaims(taskData.claims);
        if (taskClaims.length > 0 || Array.isArray(taskData.claims)) {
          setClaims(taskClaims);
          setLoading(false);
          return;
        }
        await loadClaims(id);
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
        setClaims(normalizeClaims(res.data));
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

  async function handleOffline() {
    const taskId = new URLSearchParams(window.location.search).get("id");
    const id = parseInt(taskId || "");
    if (isNaN(id)) return;
    if (!confirm("确定下架该任务？")) return;

    try {
      const res = await api.updateTask(id, { status: 5 });
      if (res.code === 0) {
        toast.success("任务已下架");
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

  const totalCount = task.total_count ?? (task.unit_price ? Math.floor(task.total_budget / task.unit_price) : 0);

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
              <span className="text-muted-foreground text-sm">商家</span>
              <span className="font-mono text-sm">{task.business_name || task.business_id || "-"}</span>
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
              <span className="font-mono">¥{(task.paid_amount || 0).toFixed(2)}</span>
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

      {(task.status === 2 || task.status === 3) && (
        <Card>
          <CardHeader>
            <CardTitle>任务操作</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={handleOffline} variant="destructive">
              下架任务
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
                    <TableCell className="text-sm">
                      <div className="font-medium">{claim.creator_name || claim.creator_id}</div>
                      <div className="text-xs text-muted-foreground font-mono">ID: {claim.creator_id}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={claimStatusMap[claim.status]?.variant || "secondary"}>
                        {claim.status_str || claimStatusMap[claim.status]?.label || "未知"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {claim.submit_at ? new Date(claim.submit_at).toLocaleString("zh-CN") : "-"}
                    </TableCell>
                    <TableCell>
                      <a href={`/admin/work-detail?id=${claim.id}`} className="text-primary hover:underline text-sm">
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
