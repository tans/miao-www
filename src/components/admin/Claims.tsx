"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FilterTabs } from "@/components/FilterTabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api, type Claim as AdminClaim } from "@/lib/api";
import { toast } from "sonner";

function normalizeClaimsData(data: unknown) {
  if (Array.isArray(data)) {
    return {
      items: data as AdminClaim[],
      total: data.length,
      page: 1,
      limit: data.length || 20,
    };
  }

  if (data && typeof data === "object") {
    const payload = data as {
      claims?: AdminClaim[]
      data?: AdminClaim[]
      total?: number
      page?: number
      limit?: number
    };

    const items = payload.claims || payload.data || [];
    return {
      items,
      total: payload.total ?? items.length,
      page: payload.page ?? 1,
      limit: payload.limit ?? 20,
    };
  }

  return {
    items: [] as AdminClaim[],
    total: 0,
    page: 1,
    limit: 20,
  };
}

function formatMoney(amount?: number) {
  return `¥${(amount ?? 0).toFixed(2)}`;
}

function formatClaimStatus(claim: AdminClaim) {
  const map: Record<string, string> = {
    "1": "已认领",
    "2": "已提交",
    "3": "已验收",
    "4": "已取消",
    "5": "已超时",
  };
  return claim.status_str || map[String(claim.status ?? "")] || "未知";
}

export function Claims() {
  const [claims, setClaims] = useState<AdminClaim[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const loadClaims = useCallback(async (page: number, filterStatus: string) => {
    setLoading(true);
    try {
      const params: { page: number; page_size: number; status?: number } = { page, page_size: 20 };
      if (filterStatus) params.status = parseInt(filterStatus, 10);

      const res = await api.getClaims(params);
      if (res.code === 0) {
        const normalized = normalizeClaimsData(res.data);
        setClaims(normalized.items);
        setTotal(normalized.total);
        setTotalPages(Math.max(1, Math.ceil(normalized.total / normalized.limit)));
        setCurrentPage(normalized.page || page);
      } else {
        toast.error(res.message);
      }
    } catch (e) {
      toast.error("加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      window.location.href = "/admin/login";
      return;
    }

    loadClaims(1, "");
  }, [loadClaims]);

  useEffect(() => {
    const handleFilterChange = (e: CustomEvent<{ value: string }>) => {
      setStatus(e.detail.value);
      loadClaims(1, e.detail.value);
    };

    window.addEventListener("filter-tabs-change", handleFilterChange as EventListener);
    return () => window.removeEventListener("filter-tabs-change", handleFilterChange as EventListener);
  }, [loadClaims]);

  function handlePageChange(newPage: number) {
    loadClaims(newPage, status);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const hasFilters = status;

  return (
    <div className="max-w-[1400px]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">认领管理</h1>
        <FilterTabs
          client:only="react"
          options={[
            { value: "", label: "全部" },
            { value: "1", label: "已认领" },
            { value: "2", label: "已提交" },
            { value: "3", label: "已验收" },
            { value: "4", label: "已取消" },
            { value: "5", label: "已超时" },
          ]}
          id="filter-tabs"
          className="mb-0"
          eventName="filter-tabs-change"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : claims.length === 0 ? (
            <Alert className="m-4">
              <AlertDescription>暂无数据{hasFilters ? "，请调整筛选条件" : ""}</AlertDescription>
            </Alert>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>任务</TableHead>
                    <TableHead>创作者</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>内容</TableHead>
                    <TableHead>奖励</TableHead>
                    <TableHead>提交时间</TableHead>
                    <TableHead>审核时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => (
                    <TableRow key={claim.id}>
                      <TableCell className="font-mono text-xs">{claim.id}</TableCell>
                      <TableCell className="max-w-64 truncate">
                        <div className="font-medium">{claim.task_title || claim.task?.title || "-"}</div>
                        <div className="text-xs text-muted-foreground font-mono">任务ID: {claim.task_id}</div>
                      </TableCell>
                      <TableCell className="max-w-48 truncate">
                        <div className="font-medium">{claim.creator_name || claim.creator?.username || claim.creator_id}</div>
                        <div className="text-xs text-muted-foreground font-mono">ID: {claim.creator_id}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={claim.status === 3 ? "default" : claim.status === 4 ? "destructive" : claim.status === 5 ? "outline" : "secondary"}>
                          {formatClaimStatus(claim)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-72 truncate text-muted-foreground">{claim.content || "-"}</TableCell>
                      <TableCell className="font-mono">{formatMoney(claim.creator_reward)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {claim.submit_at ? new Date(claim.submit_at).toLocaleString("zh-CN") : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {claim.review_at ? new Date(claim.review_at).toLocaleString("zh-CN") : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <a href={`/admin/work-detail?id=${claim.id}`} className="text-primary hover:underline text-sm">
                            作品详情
                          </a>
                          <a href={`/admin/task-detail?id=${claim.task_id}`} className="text-muted-foreground hover:underline text-sm">
                            任务详情
                          </a>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 p-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    上一页
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    第 {currentPage} / {totalPages} 页，共 {total} 条
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
