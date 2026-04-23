"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FilterTabs } from "@/components/FilterTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Task {
  id: number;
  title: string;
  business_id: number;
  unit_price: number;
  total_budget: number;
  remaining_count: number;
  claimed_count: number;
  submitted_count: number;
  status: string;
  created_at: string;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  "1": { label: "待审核", variant: "secondary" },
  "2": { label: "已上架", variant: "default" },
  "3": { label: "进行中", variant: "default" },
  "4": { label: "已结束", variant: "outline" },
  "5": { label: "已取消", variant: "destructive" },
};

export function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");

  const loadTasks = useCallback(async (page: number, filterStatus: string, keyword: string) => {
    setLoading(true);
    try {
      const params: any = { page, page_size: 20 };
      if (filterStatus) params.status = filterStatus;
      if (keyword) params.keyword = keyword;

      const res = await api.getTasks(params);
      if (res.code === 0) {
        setTasks(res.data.tasks || []);
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

    loadTasks(1, "", "");
  }, [loadTasks]);

  useEffect(() => {
    const handleFilterChange = (e: CustomEvent<{ value: string }>) => {
      setStatus(e.detail.value);
      loadTasks(1, e.detail.value, searchKeyword);
    };

    window.addEventListener("filter-tabs-change", handleFilterChange as EventListener);
    return () => window.removeEventListener("filter-tabs-change", handleFilterChange as EventListener);
  }, [searchKeyword, loadTasks]);

  const handleSearchChange = (value: string) => {
    setSearchKeyword(value);
    const timeoutId = setTimeout(() => {
      loadTasks(1, status, value);
    }, 300);
    return () => clearTimeout(timeoutId);
  };

  async function handleReview(id: number, approved: boolean) {
    const actionText = approved ? "通过" : "拒绝";
    if (!confirm(`确定${actionText}该任务？`)) return;

    try {
      const res = await api.reviewTask(id, approved);
      if (res.code === 0) {
        toast.success(`已${actionText}`);
        loadTasks(currentPage, status, searchKeyword);
      } else {
        toast.error("操作失败: " + res.message);
      }
    } catch (e) {
      toast.error("操作失败");
    }
  }

  function handlePageChange(newPage: number) {
    loadTasks(newPage, status, searchKeyword);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const hasFilters = searchKeyword || status;

  return (
    <div className="max-w-[1400px]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">任务管理</h1>
        <div className="flex items-center gap-3">
          <Input
            type="search"
            placeholder="搜索任务ID/标题..."
            className="w-64"
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          <FilterTabs
            client:only="react"
            options={[
              { value: "", label: "全部" },
              { value: "1", label: "待审核" },
              { value: "2", label: "已上架" },
              { value: "3", label: "进行中" },
              { value: "5", label: "已结束" },
            ]}
            id="filter-tabs"
            className="mb-0"
            eventName="filter-tabs-change"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : tasks.length === 0 ? (
            <Alert className="m-4">
              <AlertDescription>暂无数据{hasFilters ? "，请调整筛选条件" : ""}</AlertDescription>
            </Alert>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>标题</TableHead>
                    <TableHead>商家ID</TableHead>
                    <TableHead>单价</TableHead>
                    <TableHead>预算/剩余</TableHead>
                    <TableHead>已认领/已提交</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-mono text-xs">{task.id}</TableCell>
                      <TableCell className="font-medium max-w-64 truncate">{task.title}</TableCell>
                      <TableCell className="font-mono text-xs">{task.business_id}</TableCell>
                      <TableCell className="font-mono">¥{task.unit_price.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className="font-mono">{task.total_budget}</span> /{" "}
                        <span className="text-muted-foreground">{task.remaining_count}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">{task.claimed_count || 0}</span> /{" "}
                        <span className="text-muted-foreground">{task.submitted_count || 0}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusMap[task.status]?.variant || "secondary"}>
                          {statusMap[task.status]?.label || "未知"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(task.created_at).toLocaleDateString("zh-CN")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <a href={`/admin/task-detail?id=${task.id}`} className="text-primary hover:underline text-sm">
                            详情
                          </a>
                          {task.status === "1" && (
                            <>
                              <button
                                className="text-green-600 hover:underline text-sm"
                                onClick={() => handleReview(task.id, true)}
                              >
                                通过
                              </button>
                              <button
                                className="text-red-600 hover:underline text-sm"
                                onClick={() => handleReview(task.id, false)}
                              >
                                拒绝
                              </button>
                            </>
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