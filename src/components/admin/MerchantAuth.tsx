"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, resolveAssetUrl, type MerchantAuthApplication } from "@/lib/api";
import { toast } from "sonner";

const statusLabelMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "待审核", variant: "secondary" },
  approved: { label: "已通过", variant: "default" },
  rejected: { label: "已拒绝", variant: "destructive" },
};

const statusOptions = [
  { value: 0, label: "待审核" },
  { value: 1, label: "已通过" },
  { value: 2, label: "已拒绝" },
];

function formatTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN");
}

function getStatusKey(item: MerchantAuthApplication) {
  if (item.status === 0 || item.status_text === "待审核" || item.status_text === "审核中") return "pending";
  if (item.status === 1 || item.status_text === "已认证") return "approved";
  if (item.status === 2 || item.status_text === "已拒绝") return "rejected";
  return "pending";
}

export function MerchantAuth() {
  const [items, setItems] = useState<MerchantAuthApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState("");
  const [statusDrafts, setStatusDrafts] = useState<Record<number, number>>({});

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const loadData = useCallback(async (nextPage = 1) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getMerchantAuthApplications({
        page: nextPage,
        page_size: pageSize,
        status: statusFilter || undefined,
        keyword: keyword || undefined,
      });
      if (res.code === 0) {
        setItems(res.data.items || []);
        setTotal(res.data.total || 0);
        setPage(res.data.page || nextPage);
        setStatusDrafts(
          Object.fromEntries((res.data.items || []).map((item) => [item.user_id, item.status])) as Record<number, number>,
        );
      } else {
        setError(res.message || "加载失败");
      }
    } catch (e) {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }, [keyword, pageSize, statusFilter]);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      window.location.href = "/admin/login";
      return;
    }
    loadData(1);
  }, []);

  useEffect(() => {
    loadData(1);
  }, [keyword, statusFilter]);

  async function handleReview(item: MerchantAuthApplication, approved: boolean) {
    const action = approved ? "通过" : "拒绝";
    const comment = approved ? "" : window.prompt("请输入拒绝原因", "") || "";
    if (!confirm(`确定${action}【${item.company_name}】的商家认证？`)) return;

    try {
      const res = await api.reviewMerchantAuth(item.user_id, approved, comment);
      if (res.code === 0) {
        toast.success(`已${action}`);
        loadData(page);
      } else {
        toast.error(res.message || "操作失败");
      }
    } catch (e) {
      toast.error("操作失败");
    }
  }

  async function handleStatusSave(item: MerchantAuthApplication) {
    const nextStatus = statusDrafts[item.user_id];
    if (nextStatus === undefined || nextStatus === item.status) return;
    const comment = nextStatus === 2 ? window.prompt("请输入拒绝原因", item.review_comment || "") || "" : "";
    if (!confirm(`确定把【${item.company_name}】状态改为【${statusOptions.find((option) => option.value === nextStatus)?.label || "未知"}】？`)) return;

    try {
      const res = await api.updateMerchantAuthStatus(item.user_id, nextStatus, comment);
      if (res.code === 0) {
        toast.success("状态已更新");
        loadData(page);
      } else {
        toast.error(res.message || "更新失败");
      }
    } catch (e) {
      toast.error("更新失败");
    }
  }

  async function handleDelete(item: MerchantAuthApplication) {
    if (!confirm(`确定删除【${item.company_name}】这条认证数据？此操作不可恢复。`)) return;
    try {
      const res = await api.deleteMerchantAuth(item.user_id);
      if (res.code === 0) {
        toast.success("已删除");
        loadData(page);
      } else {
        toast.error(res.message || "删除失败");
      }
    } catch (e) {
      toast.error("删除失败");
    }
  }

  const summary = useMemo(() => {
    const pending = items.filter((item) => getStatusKey(item) === "pending").length;
    const approved = items.filter((item) => getStatusKey(item) === "approved").length;
    const rejected = items.filter((item) => getStatusKey(item) === "rejected").length;
    return { pending, approved, rejected };
  }, [items]);

  return (
    <div className="max-w-[1600px] space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">商家认证管理</h1>
          <p className="text-sm text-muted-foreground">认证提交后 30 分钟自动通过，也可在这里手动调整状态。</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            type="search"
            className="w-full sm:w-72"
            placeholder="搜索企业名 / 用户名 / 手机号"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <select
            className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">全部状态</option>
            <option value="pending">待审核</option>
            <option value="approved">已通过</option>
            <option value="rejected">已拒绝</option>
          </select>
          <Button variant="outline" onClick={() => { setKeyword(""); setStatusFilter(""); }}>
            重置
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">待审核</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{summary.pending}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">已通过</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{summary.approved}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">已拒绝</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{summary.rejected}</CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">加载中...</div>
          ) : items.length === 0 ? (
            <Alert className="m-4">
              <AlertDescription>暂无商家认证申请</AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">用户</TableHead>
                    <TableHead>企业信息</TableHead>
                    <TableHead className="w-48">联系信息</TableHead>
                    <TableHead className="w-40">状态</TableHead>
                    <TableHead className="w-44">时间</TableHead>
                    <TableHead className="w-40">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const statusKey = getStatusKey(item);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{item.username || `用户${item.user_id}`}</div>
                            <div className="text-xs text-muted-foreground">ID {item.user_id}</div>
                            <div className="text-xs text-muted-foreground">{item.phone || "未绑定手机号"}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{item.company_name}</div>
                            <div className="text-xs text-muted-foreground break-all">{item.credit_code}</div>
                            <div className="text-xs text-muted-foreground">联系人：{item.contact_name || "-"} / {item.contact_phone || "-"}</div>
                            {item.license_preview_url && (
                              <a href={resolveAssetUrl(item.license_preview_url)} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                                查看营业执照
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={item.business_verified ? "default" : "secondary"}>
                              {item.business_verified ? "商家已认证" : "商家未认证"}
                            </Badge>
                            <div className="text-xs text-muted-foreground">提交时间：{formatTime(item.created_at)}</div>
                            <div className="text-xs text-muted-foreground">自动通过：{formatTime(item.auto_approve_at)}</div>
                            <div className="text-xs text-muted-foreground">
                              剩余：{statusKey === "pending" ? `${item.auto_approve_in_minutes} 分钟` : "已处理"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusLabelMap[statusKey].variant}>{statusLabelMap[statusKey].label}</Badge>
                          <div className="mt-2 text-xs text-muted-foreground">{item.review_comment || "-"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div>更新时间：{formatTime(item.updated_at)}</div>
                            <div>审核时间：{formatTime(item.reviewed_at)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <select
                              className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                              value={statusDrafts[item.user_id] ?? item.status}
                              onChange={(e) =>
                                setStatusDrafts((prev) => ({ ...prev, [item.user_id]: Number(e.target.value) }))
                              }
                            >
                              {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" onClick={() => handleStatusSave(item)}>
                                保存
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleDelete(item)}>
                                删除
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          共 {total} 条，第 {page} / {totalPages} 页
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => loadData(page - 1)}
          >
            上一页
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => loadData(page + 1)}
          >
            下一页
          </Button>
        </div>
      </div>
    </div>
  );
}
