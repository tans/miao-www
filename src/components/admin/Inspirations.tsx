"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FilterTabs } from "@/components/FilterTabs";
import { InspirationModal } from "@/components/InspirationModal";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Inspiration {
  id: number;
  title?: string;
  cover_url?: string;
  status: number;
  likes?: number;
  created_at: string;
}

const statusMap: Record<number, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  0: { label: "草稿", variant: "secondary" },
  1: { label: "已发布", variant: "default" },
  2: { label: "已下架", variant: "destructive" },
};

export function Inspirations() {
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const loadInspirations = useCallback(async (page: number, filterStatus: string) => {
    setLoading(true);
    try {
      const params: any = { page, page_size: 20 };
      if (filterStatus) params.status = parseInt(filterStatus);

      const res = await api.getInspirations(params);
      if (res.code === 0) {
        setInspirations(res.data.inspirations || []);
        setTotal(res.data.total || 0);
        setTotalPages(Math.ceil((res.data.total || 0) / 20));
        setCurrentPage(page);
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

    loadInspirations(1, "");
  }, [loadInspirations]);

  useEffect(() => {
    const handleFilterChange = (e: CustomEvent<{ value: string }>) => {
      setStatus(e.detail.value);
      loadInspirations(1, e.detail.value);
    };

    window.addEventListener("filter-tabs-change", handleFilterChange as EventListener);
    return () => window.removeEventListener("filter-tabs-change", handleFilterChange as EventListener);
  }, [loadInspirations]);

  function handleOpenModal(isEdit: boolean, data?: any) {
    window.dispatchEvent(new CustomEvent("inspiration:open-modal", { detail: { isEdit, data } }));
  }

  async function handleEdit(id: number) {
    try {
      const res = await api.getInspirationDetail(id);
      if (res.code === 0) {
        handleOpenModal(true, res.data.inspiration);
      }
    } catch (e) {
      toast.error("获取详情失败");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("确定删除该灵感？")) return;
    try {
      const res = await api.deleteInspiration(id);
      if (res.code === 0) {
        toast.success("删除成功");
        loadInspirations(currentPage, status);
      } else {
        toast.error(res.message || "删除失败");
      }
    } catch (e) {
      toast.error("删除失败");
    }
  }

  function handlePageChange(newPage: number) {
    loadInspirations(newPage, status);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="max-w-[1400px]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">灵感管理</h1>
        <div className="flex items-center gap-3">
          <FilterTabs
            client:only="react"
            options={[
              { value: "", label: "全部" },
              { value: "0", label: "草稿" },
              { value: "1", label: "已发布" },
              { value: "2", label: "已下架" },
            ]}
            id="filter-tabs"
            className="mb-0"
            eventName="filter-tabs-change"
          />
          <Button onClick={() => handleOpenModal(false)}>添加灵感</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : inspirations.length === 0 ? (
            <Alert className="m-4">
              <AlertDescription>暂无数据</AlertDescription>
            </Alert>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>标题</TableHead>
                    <TableHead>封面</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>点赞数</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspirations.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.id}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.title || "-"}</TableCell>
                      <TableCell>
                        {item.cover_url ? (
                          <img src={item.cover_url} alt="封面" className="w-10 h-10 object-cover rounded-md border" />
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusMap[item.status]?.variant || "secondary"}>
                          {statusMap[item.status]?.label || "未知"}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.likes || 0}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(item.created_at).toLocaleDateString("zh-CN")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <button className="text-primary hover:underline text-sm" onClick={() => handleEdit(item.id)}>
                            编辑
                          </button>
                          <button className="text-destructive hover:underline text-sm" onClick={() => handleDelete(item.id)}>
                            删除
                          </button>
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

      <InspirationModal id="modal" />
    </div>
  );
}