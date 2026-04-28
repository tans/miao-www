"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, resolveAssetUrl, type User } from "@/lib/api";
import { toast } from "sonner";

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

function formatMoney(value?: number) {
  return `¥${(value ?? 0).toFixed(2)}`;
}

function getUserDisplayName(user: User) {
  return user.nickname || user.username || `用户${user.id}`;
}

function getUserInitial(user: User) {
  return (getUserDisplayName(user).trim().charAt(0) || "用").toUpperCase();
}

function getRoleValue(role: string | number | undefined) {
  const raw = String(role ?? "");
  return roleMap[raw] || roleMap[String(Number(raw))] || "未知";
}

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
        setTotalPages(Math.max(1, Math.ceil((res.data.total || 0) / 20)));
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">用户管理</h1>
        <div className="flex items-center gap-3">
          <Input
            type="search"
            placeholder="搜索昵称/用户名/手机号..."
            className="w-64"
            value={searchKeyword}
            onChange={(e) => {
              setSearchKeyword(e.target.value);
            }}
          />
          <div className="relative">
            <select
              id="role-filter"
              className="h-8 cursor-pointer rounded-md border border-input bg-transparent pl-3 pr-8 text-sm appearance-none hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">全部角色</option>
              <option value="creator">创作者</option>
              <option value="business">商家</option>
              <option value="admin">管理员</option>
            </select>
            <svg
              className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
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
              className="h-8 cursor-pointer rounded-md border border-input bg-transparent pl-3 pr-8 text-sm appearance-none hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">全部状态</option>
              <option value="active">正常</option>
              <option value="disabled">禁用</option>
            </select>
            <svg
              className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
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
            <div className="py-12 text-center text-muted-foreground">加载中...</div>
          ) : users.length === 0 ? (
            <Alert className="m-4">
              <AlertDescription>暂无数据{hasFilters ? "，请调整筛选条件" : ""}</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">ID</TableHead>
                      <TableHead>资料</TableHead>
                      <TableHead className="w-28">角色</TableHead>
                      <TableHead className="w-28">等级</TableHead>
                      <TableHead className="w-40">资金</TableHead>
                      <TableHead className="w-40">认证</TableHead>
                      <TableHead className="w-28">状态</TableHead>
                      <TableHead className="w-36">注册时间</TableHead>
                      <TableHead className="w-24">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const avatarUrl = resolveAssetUrl(user.avatar);
                      const displayName = getUserDisplayName(user);
                      const roleLabel = getRoleValue(user.role);
                      const levelLabel = user.level_name || `Lv.${user.level ?? 0}`;
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-mono text-xs">{user.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar size="sm">
                                <AvatarImage src={avatarUrl} alt={displayName} />
                                <AvatarFallback>{getUserInitial(user)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="truncate font-medium">{displayName}</div>
                                <div className="truncate text-xs text-muted-foreground">
                                  @{user.username}
                                  <span className="mx-1">·</span>
                                  {user.phone || "未绑定手机号"}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{roleLabel}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{levelLabel}</div>
                              <div className="text-xs text-muted-foreground">
                                采纳 {user.adopted_count ?? 0} · 举报 {user.report_count ?? 0}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 font-mono">
                              <div>余额 {formatMoney(user.balance)}</div>
                              <div className="text-xs text-muted-foreground">冻结 {formatMoney(user.frozen_amount)}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Badge variant={user.real_name_verified ? "default" : "secondary"}>
                                {user.real_name_verified ? "实名已认证" : "实名未认证"}
                              </Badge>
                              <Badge variant={user.business_verified ? "default" : "secondary"}>
                                {user.business_verified ? "商家已认证" : "商家未认证"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusMap[user.status]?.variant || "secondary"}>
                              {statusMap[user.status]?.label || "未知"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {user.created_at ? new Date(user.created_at).toLocaleString("zh-CN") : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <a href={`/admin/user-detail?id=${user.id}`} className="text-primary text-sm hover:underline">
                                详情
                              </a>
                              <button
                                className="text-destructive text-sm hover:underline"
                                onClick={() => handleToggleStatus(user.id, user.status)}
                              >
                                {user.status === 1 ? "禁用" : "启用"}
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 border-t p-4">
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
