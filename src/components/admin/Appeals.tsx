"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FilterTabs } from "@/components/FilterTabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/api";

interface Appeal {
  id: number;
  type: number;
  claim_id?: number;
  target_id?: number;
  task_id?: number;
  user_id: number;
  reason: string;
  status: number;
  created_at: string;
}

const statusMap: Record<number, { label: string; variant: "default" | "secondary" | "outline" }> = {
  1: { label: "待处理", variant: "secondary" },
  2: { label: "已处理", variant: "default" },
};

const typeMap: Record<number, string> = {
  1: "作品申诉",
};

export function Appeals() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const loadAppeals = useCallback(async (page: number, filterStatus: string) => {
    setLoading(true);
    try {
      const params: any = { page, page_size: 20 };
      if (filterStatus) params.status = parseInt(filterStatus);

      const res = await api.getAppeals(params);
      if (res.code === 0) {
        setAppeals(res.data.appeals || []);
        setTotal(res.data.total || 0);
        setTotalPages(Math.ceil((res.data.total || 0) / 20));
        setCurrentPage(page);
      } else {
        console.error(res.message);
      }
    } catch (e) {
      console.error("加载失败", e);
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

    loadAppeals(1, "");
  }, [loadAppeals]);

  useEffect(() => {
    const handleFilterChange = (e: CustomEvent<{ value: string }>) => {
      setStatus(e.detail.value);
      loadAppeals(1, e.detail.value);
    };

    window.addEventListener("filter-tabs-change", handleFilterChange as EventListener);
    return () => window.removeEventListener("filter-tabs-change", handleFilterChange as EventListener);
  }, [loadAppeals]);

  function handlePageChange(newPage: number) {
    loadAppeals(newPage, status);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openAppealDetail(id: number) {
    if (!Number.isFinite(id) || id <= 0) return;
    try {
      sessionStorage.setItem("admin_last_appeal_id", String(id));
    } catch (_) {}
  }

  return (
    <div className="max-w-[1400px]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">申诉管理</h1>
        <FilterTabs
          client:only="react"
          options={[
            { value: "", label: "全部" },
            { value: "1", label: "待处理" },
            { value: "2", label: "已处理" },
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
          ) : appeals.length === 0 ? (
            <Alert className="m-4">
              <AlertDescription>暂无数据</AlertDescription>
            </Alert>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>作品ID</TableHead>
                    <TableHead>任务ID</TableHead>
                    <TableHead>用户ID</TableHead>
                    <TableHead>原因</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appeals.map((appeal) => (
                    <TableRow key={appeal.id}>
                      <TableCell className="font-mono text-xs">{appeal.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{typeMap[appeal.type] || "未知"}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {appeal.claim_id || appeal.target_id ? (
                          <a href={`/admin/work-detail?id=${appeal.claim_id || appeal.target_id}`} className="text-primary hover:underline">
                            {appeal.claim_id || appeal.target_id}
                          </a>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {appeal.task_id ? (
                          <a href={`/admin/task-detail?id=${appeal.task_id}`} className="text-primary hover:underline">
                            {appeal.task_id}
                          </a>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{appeal.user_id}</TableCell>
                      <TableCell className="max-w-64 truncate text-muted-foreground">{appeal.reason}</TableCell>
                      <TableCell>
                        <Badge variant={statusMap[appeal.status]?.variant || "secondary"}>
                          {statusMap[appeal.status]?.label || "未知"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(appeal.created_at).toLocaleDateString("zh-CN")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <a
                            href={`/admin/appeal-detail/?id=${appeal.id}#id=${appeal.id}`}
                            onClick={() => openAppealDetail(appeal.id)}
                            className="text-primary hover:underline text-sm"
                          >
                            详情
                          </a>
                          {appeal.status === 1 && (
                            <a
                              href={`/admin/appeal-detail/?id=${appeal.id}#id=${appeal.id}`}
                              onClick={() => openAppealDetail(appeal.id)}
                              className="text-green-600 hover:underline text-sm"
                            >
                              处理
                            </a>
                          )}
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
