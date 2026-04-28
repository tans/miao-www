"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api, resolveAssetUrl, type Claim as AdminClaim, type Task as AdminTask, type UserDetailResponse } from "@/lib/api";
import { toast } from "sonner";

type User = UserDetailResponse["user"];

interface Transaction {
  id: number;
  type: string;
  type_str?: string;
  amount: number;
  raw_amount?: number;
  balance_after: number;
  remark?: string;
  created_at: string;
}

function formatSignedAmount(amount: number) {
  const value = amount ?? 0;
  const sign = value >= 0 ? "+" : "-";
  return `${sign}¥${Math.abs(value).toFixed(2)}`;
}

function formatTaskStatus(status: number | string | undefined) {
  const map: Record<string, string> = {
    "1": "已上架",
    "2": "已上架",
    "3": "进行中",
    "4": "已结束",
    "5": "已取消",
    pending: "已上架",
    published: "已上架",
    completed: "已结束",
    cancelled: "已取消",
  };
  return map[String(status ?? "")] || "未知";
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

function formatReviewResult(claim: AdminClaim) {
  if (claim.review_result_str) return claim.review_result_str;
  if (claim.review_result === 1) return "通过";
  if (claim.review_result === 2) return "退回";
  if (claim.review_result === 3) return "举报";
  return "待验收";
}

function formatMoney(amount?: number) {
  return `¥${(amount ?? 0).toFixed(2)}`;
}

function getUserDisplayName(user: User) {
  return user.nickname || user.username || `用户${user.id}`;
}

function getUserInitial(user: User) {
  return (getUserDisplayName(user).trim().charAt(0) || "用").toUpperCase();
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
  "1": "创作者",
  "2": "商家",
  "3": "管理员",
};

export function UserDetail() {
  const [user, setUser] = useState<User | null>(null);
  const [createdTasks, setCreatedTasks] = useState<AdminTask[]>([]);
  const [participatedClaims, setParticipatedClaims] = useState<AdminClaim[]>([]);
  const [submittedWorks, setSubmittedWorks] = useState<AdminClaim[]>([]);
  const [createdTasksTotal, setCreatedTasksTotal] = useState(0);
  const [participatedTotal, setParticipatedTotal] = useState(0);
  const [submittedTotal, setSubmittedTotal] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      window.location.href = "/admin/login";
      return;
    }

    const id = parseInt(new URLSearchParams(window.location.search).get("id") || "", 10);
    if (!Number.isFinite(id) || id <= 0) {
      setError("无效的用户ID");
      setLoading(false);
      return;
    }

    setUserId(id);
    loadUser(id);
  }, []);

  async function loadUser(id: number) {
    try {
      const res = await api.getUserDetail(id);
      if (res.code === 0) {
        setUser(res.data.user);
        setCreatedTasks(res.data.created_tasks?.tasks || []);
        setParticipatedClaims(res.data.participated_tasks?.claims || []);
        setSubmittedWorks(res.data.submitted_works?.works || []);
        setCreatedTasksTotal(res.data.created_tasks?.total || 0);
        setParticipatedTotal(res.data.participated_tasks?.total || 0);
        setSubmittedTotal(res.data.submitted_works?.total || 0);
        loadTransactions(id);
      } else {
        setError(res.message);
        setLoading(false);
      }
    } catch (e) {
      setError("加载失败");
      setLoading(false);
    }
  }

  async function loadTransactions(id: number) {
    try {
      const res = await api.getUserTransactions(id);
      if (res.code === 0) {
        setTransactions((res.data.transactions || []) as Transaction[]);
      }
    } catch (e) {
      console.error("加载交易记录失败", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus() {
    if (!userId) return;
    const statusSelect = document.getElementById("status-select") as HTMLSelectElement;
    const status = parseInt(statusSelect.value);
    try {
      const res = await api.updateUserStatus(userId, status);
      if (res.code === 0) {
        toast.success("状态已更新");
        loadUser(userId);
      } else {
        toast.error("更新失败: " + res.message);
      }
    } catch (e) {
      toast.error("更新失败");
    }
  }

  async function handleUpdateBalance() {
    if (!userId) return;
    const balanceInput = document.getElementById("balance-input") as HTMLInputElement;
    const change = parseFloat(balanceInput.value);
    if (isNaN(change) || change === 0) {
      toast.error("请输入有效的金额");
      return;
    }
    try {
      const res = await api.updateUserBalance(userId, change, "管理员调整");
      if (res.code === 0) {
        toast.success(`已添加 ¥${change.toFixed(2)}`);
        loadUser(userId);
      } else {
        toast.error("更新失败: " + res.message);
      }
    } catch (e) {
      toast.error("更新失败");
    }
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (loading || !user) {
    return <div className="text-center py-12 text-muted-foreground">加载中...</div>;
  }

  const roleValue = String(user.role ?? "");
  const roleLabel = roleMap[roleValue] || roleMap[String(Number(roleValue))] || "未知";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar size="lg">
                <AvatarImage src={resolveAssetUrl(user.avatar)} alt={getUserDisplayName(user)} />
                <AvatarFallback>{getUserInitial(user)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold">{getUserDisplayName(user)}</div>
                <div className="truncate text-sm text-muted-foreground">@{user.username}</div>
                <div className="mt-2 text-sm text-muted-foreground">{user.phone || "未绑定手机号"}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{roleLabel}</Badge>
              <Badge variant={user.real_name_verified ? "default" : "secondary"}>
                {user.real_name_verified ? "实名已认证" : "实名未认证"}
              </Badge>
              <Badge variant={user.business_verified ? "default" : "secondary"}>
                {user.business_verified ? "商家已认证" : "商家未认证"}
              </Badge>
            </div>
            <div className="flex justify-between gap-4 py-2 border-b">
              <span className="text-muted-foreground text-sm">用户ID</span>
              <span className="font-mono text-sm">{user.id}</span>
            </div>
            <div className="flex justify-between gap-4 py-2 border-b">
              <span className="text-muted-foreground text-sm">等级</span>
              <span className="text-sm">{user.level_name || `Lv.${user.level ?? 0}`}</span>
            </div>
            <div className="flex justify-between gap-4 py-2 border-b">
              <span className="text-muted-foreground text-sm">采纳数</span>
              <span className="text-sm">{user.adopted_count ?? 0}</span>
            </div>
            <div className="flex justify-between gap-4 py-2 border-b">
              <span className="text-muted-foreground text-sm">举报数</span>
              <span className="text-sm">{user.report_count ?? 0}</span>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <span className="text-muted-foreground text-sm">注册时间</span>
              <span className="text-sm">{new Date(user.created_at).toLocaleString("zh-CN")}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>财务信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">余额</span>
              <span className="font-mono text-lg text-green-600">¥{user.balance.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">冻结金额</span>
              <span className="font-mono">¥{(user.frozen_amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">保证金冻结</span>
              <span className="font-mono">¥{(user.margin_frozen || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground text-sm">可用余额</span>
              <span className="text-sm">¥{Math.max(0, (user.balance || 0) - (user.frozen_amount || 0)).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground w-20">修改状态</label>
              <div className="relative">
                <select
                  id="status-select"
                  defaultValue={user.status}
                  className="h-8 pl-3 pr-8 rounded-md border border-input bg-transparent text-sm appearance-none cursor-pointer hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 w-32"
                >
                  <option value="1">正常</option>
                  <option value="0">禁用</option>
                  <option value="2">冻结</option>
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
              <Button size="sm" onClick={handleUpdateStatus}>更新状态</Button>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground w-20">调整余额</label>
              <Input type="number" id="balance-input" className="w-32" defaultValue={0} step="0.01" />
              <Button size="sm" onClick={handleUpdateBalance}>添加余额</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>创建任务 ({createdTasksTotal})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {createdTasks.length === 0 ? (
            <Alert className="m-4">
              <AlertDescription>暂无创建任务</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>预算</TableHead>
                  <TableHead>剩余</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {createdTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-mono text-xs">{task.id}</TableCell>
                    <TableCell className="font-medium max-w-64 truncate">{task.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{formatTaskStatus(task.status)}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{formatMoney(task.total_budget || task.unit_price * (task.total_count || 0))}</TableCell>
                    <TableCell className="font-mono">
                      {task.remaining_count ?? 0} / {task.total_count ?? 0}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {task.created_at ? new Date(task.created_at).toLocaleString("zh-CN") : "-"}
                    </TableCell>
                    <TableCell>
                      <a href={`/admin/task-detail?id=${task.id}`} className="text-primary hover:underline text-sm">
                        详情
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>参与认领 ({participatedTotal})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {participatedClaims.length === 0 ? (
            <Alert className="m-4">
              <AlertDescription>暂无参与认领</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>任务</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>内容</TableHead>
                  <TableHead>提交时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participatedClaims.map((claim) => (
                  <TableRow key={claim.id}>
                    <TableCell className="font-mono text-xs">{claim.id}</TableCell>
                    <TableCell className="max-w-64 truncate">
                      <div className="font-medium">{claim.task_title || claim.task?.title || claim.task_id}</div>
                      <div className="text-xs text-muted-foreground font-mono">任务ID: {claim.task_id}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{formatClaimStatus(claim)}</Badge>
                    </TableCell>
                    <TableCell className="max-w-72 truncate text-muted-foreground">{claim.content || "-"}</TableCell>
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

      <Card>
        <CardHeader>
          <CardTitle>提交作品 ({submittedTotal})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {submittedWorks.length === 0 ? (
            <Alert className="m-4">
              <AlertDescription>暂无提交作品</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>任务</TableHead>
                  <TableHead>审核结果</TableHead>
                  <TableHead>内容</TableHead>
                  <TableHead>审核时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submittedWorks.map((claim) => (
                  <TableRow key={claim.id}>
                    <TableCell className="font-mono text-xs">{claim.id}</TableCell>
                    <TableCell className="max-w-64 truncate">
                      <div className="font-medium">{claim.task_title || claim.task?.title || claim.task_id}</div>
                      <div className="text-xs text-muted-foreground font-mono">任务ID: {claim.task_id}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={claim.review_result === 1 ? "default" : claim.review_result === 2 ? "destructive" : "secondary"}>
                        {formatReviewResult(claim)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-72 truncate text-muted-foreground">{claim.content || "-"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {claim.review_at ? new Date(claim.review_at).toLocaleString("zh-CN") : "-"}
                    </TableCell>
                    <TableCell>
                      <a href={`/admin/work-detail?id=${claim.id}`} className="text-primary hover:underline text-sm">
                        查看详情
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>交易记录</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <Alert className="m-4">
              <AlertDescription>暂无交易记录</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>余额</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead>时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono text-xs">{tx.id}</TableCell>
                    <TableCell>{tx.type_str || tx.type}</TableCell>
                    <TableCell className={`font-mono ${tx.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatSignedAmount(tx.amount)}
                    </TableCell>
                    <TableCell className="font-mono">¥{tx.balance_after.toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{tx.remark || "-"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(tx.created_at).toLocaleString("zh-CN")}
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
