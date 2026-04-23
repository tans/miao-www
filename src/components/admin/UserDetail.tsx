"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface UserDetailProps {
  userId: string;
}

interface User {
  id: number;
  username: string;
  email?: string;
  phone?: string;
  role: number;
  level?: string;
  status: number;
  created_at: string;
  balance: number;
  margin_frozen: number;
  credit_score: number;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  balance_after: number;
  remark?: string;
  created_at: string;
}

const statusMap: Record<number, { label: string; variant: "default" | "destructive" | "secondary" }> = {
  0: { label: "禁用", variant: "destructive" },
  1: { label: "正常", variant: "default" },
  2: { label: "冻结", variant: "secondary" },
};

const roleMap: Record<number, string> = {
  1: "创作者",
  2: "商家",
  3: "管理员",
};

export function UserDetail({ userId }: UserDetailProps) {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      window.location.href = "/admin/login";
      return;
    }

    loadUser();
  }, [userId]);

  async function loadUser() {
    try {
      const res = await api.getUserDetail(parseInt(userId));
      if (res.code === 0) {
        setUser(res.data.user);
        loadTransactions();
      } else {
        setError(res.message);
        setLoading(false);
      }
    } catch (e) {
      setError("加载失败");
      setLoading(false);
    }
  }

  async function loadTransactions() {
    try {
      const res = await api.request<{ transactions: Transaction[] }>(`/api/v1/admin/users/${userId}/transactions`);
      if (res.code === 0) {
        setTransactions(res.data.transactions || []);
      }
    } catch (e) {
      console.error("加载交易记录失败", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus() {
    const statusSelect = document.getElementById("status-select") as HTMLSelectElement;
    const status = parseInt(statusSelect.value);
    try {
      const res = await api.updateUserStatus(parseInt(userId), status);
      if (res.code === 0) {
        toast.success("状态已更新");
        loadUser();
      } else {
        toast.error("更新失败: " + res.message);
      }
    } catch (e) {
      toast.error("更新失败");
    }
  }

  async function handleUpdateBalance() {
    const balanceInput = document.getElementById("balance-input") as HTMLInputElement;
    const balance = parseFloat(balanceInput.value);
    try {
      const res = await api.updateUserBalance(parseInt(userId), balance);
      if (res.code === 0) {
        toast.success("余额已更新");
        loadUser();
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">用户ID</span>
              <span className="font-mono text-sm">{user.id}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">用户名</span>
              <span className="font-medium">{user.username}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">邮箱</span>
              <span className="text-sm">{user.email || "-"}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">手机号</span>
              <span className="text-sm">{user.phone || "-"}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">角色</span>
              <Badge variant="outline">{roleMap[user.role] || "未知"}</Badge>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">等级</span>
              <span className="text-sm">{user.level || "-"}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">状态</span>
              <Badge variant={statusMap[user.status]?.variant || "secondary"}>
                {statusMap[user.status]?.label || "未知"}
              </Badge>
            </div>
            <div className="flex justify-between py-2">
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
              <span className="font-mono">¥{user.margin_frozen.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground text-sm">信用评分</span>
              <span className="text-sm">{user.credit_score || 0}</span>
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
              <Input type="number" id="balance-input" className="w-32" defaultValue={user.balance} step="0.01" />
              <Button size="sm" onClick={handleUpdateBalance}>调整余额</Button>
            </div>
          </CardContent>
        </Card>
      </div>

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
                    <TableCell>{tx.type}</TableCell>
                    <TableCell className={`font-mono ${tx.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {tx.amount >= 0 ? "+" : ""}¥{tx.amount.toFixed(2)}
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