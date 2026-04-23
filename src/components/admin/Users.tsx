"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface User {
  id: number;
  username: string;
  email?: string;
  phone?: string;
  role: string;
  balance: number;
  credit_score: number;
  status: number;
  created_at: string;
}

const statusMap: Record<number, { label: string; variant: "default" | "destructive" | "secondary" }> = {
  0: { label: "禁用", variant: "destructive" },
  1: { label: "正常", variant: "default" },
  2: { label: "冻结", variant: "secondary" },
};

const roleMap: Record<string, string> = {
  creator: "创作者",
  business: "商家",
  admin: "管理员",
};

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadUsers = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, page_size: 20 };
      if (searchKeyword) params.keyword = searchKeyword;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) {
        params.status = statusFilter === "active" ? 1 : statusFilter === "disabled" ? 0 : statusFilter;
      }

      const res = await api.getUsers(params);
      if (res.code === 0) {
        setUsers(res.data.users || []);
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
  }, [searchKeyword, roleFilter, statusFilter]);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      window.location.href = "/admin/login";
      return;
    }

    loadUsers(1);
  }, []);

  useEffect(() => {
    loadUsers(1);
  }, [searchKeyword, roleFilter, statusFilter]);

  async function handleToggleStatus(id: number, currentStatus: number) {
    const newStatus = currentStatus === 1 ? 0 : 1;
    const actionText = newStatus === 1 ? "启用" : "禁用";
    if (!confirm(`确定${actionText}该用户？`)) return;

    try {
      const res = await api.updateUserStatus(id, newStatus);
      if (res.code === 0) {
        toast.success(`已${actionText}`);
        loadUsers(currentPage);
      } else {
        toast.error("操作失败: " + res.message);
      }
    } catch (e) {
      toast.error("操作失败");
    }
  }

  function handleReset() {
    setSearchKeyword("");
    setRoleFilter("");
    setStatusFilter("");
  }

  function handlePageChange(newPage: number) {
    loadUsers(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const hasFilters = searchKeyword || roleFilter || statusFilter;

  return (
    <div className="max-w-[1400px]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">用户管理</h1>
        <div className="flex items-center gap-3">
          <Input
            type="search"
            placeholder="搜索用户名/邮箱/手机..."
            className="w-64"
            value={searchKeyword}
            onChange={(e) => {
              setSearchKeyword(e.target.value);
            }}
          />
          <div className="relative">
            <select
              id="role-filter"
              className="h-8 pl-3 pr-8 rounded-md border border-input bg-transparent text-sm appearance-none cursor-pointer hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">全部角色</option>
              <option value="creator">创作者</option>
              <option value="business">商家</option>
              <option value="admin">管理员</option>
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
          <div className="relative">
            <select
              id="status-filter"
              className="h-8 pl-3 pr-8 rounded-md border border-input bg-transparent text-sm appearance-none cursor-pointer hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">全部状态</option>
              <option value="active">正常</option>
              <option value="disabled">禁用</option>
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
          <Button variant="outline" size="sm" onClick={handleReset}>
            重置
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : users.length === 0 ? (
            <Alert className="m-4">
              <AlertDescription>暂无数据{hasFilters ? "，请调整筛选条件" : ""}</AlertDescription>
            </Alert>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>用户名</TableHead>
                    <TableHead>邮箱</TableHead>
                    <TableHead>手机</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>余额</TableHead>
                    <TableHead>信用分</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>注册时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono text-xs">{user.id}</TableCell>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email || "-"}</TableCell>
                      <TableCell>{user.phone || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{roleMap[user.role] || "未知"}</Badge>
                      </TableCell>
                      <TableCell className="font-mono">¥{user.balance.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={`font-mono text-sm ${(user.credit_score || 0) < 60 ? "text-red-500" : "text-green-600"}`}>
                          {user.credit_score || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusMap[user.status]?.variant || "secondary"}>
                          {statusMap[user.status]?.label || "未知"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(user.created_at).toLocaleDateString("zh-CN")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <a href={`/admin/user-detail?id=${user.id}`} className="text-primary hover:underline text-sm">
                            详情
                          </a>
                          <button
                            className="text-destructive hover:underline text-sm"
                            onClick={() => handleToggleStatus(user.id, user.status)}
                          >
                            {user.status === 1 ? "禁用" : "启用"}
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
    </div>
  );
}