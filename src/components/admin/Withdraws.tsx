"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Eye, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, type WithdrawOrder } from "@/lib/api";
import { toast } from "sonner";

const USER_TX_LIMIT = 50;

type AdminUserTransaction = {
  id: number;
  user_id: number;
  type: number | string;
  type_str?: string;
  type_code?: string;
  amount: number;
  raw_amount?: number;
  balance_before: number;
  balance_after: number;
  remark?: string;
  related_id?: number;
  created_at: string;
};

const withdrawStatusMap: Record<number, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  1: { label: "待审核", variant: "secondary" },
  2: { label: "打款成功", variant: "default" },
  3: { label: "已拒绝", variant: "destructive" },
  4: { label: "打款处理中", variant: "outline" },
  5: { label: "打款失败", variant: "destructive" },
};

function formatMoney(amount?: number) {
  return `¥${(amount ?? 0).toFixed(2)}`;
}

function formatSignedAmount(amount?: number) {
  const value = amount ?? 0;
  const sign = value >= 0 ? "+" : "-";
  return `${sign}¥${Math.abs(value).toFixed(2)}`;
}

function formatTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN");
}

function getWithdrawStatus(order: WithdrawOrder) {
  return withdrawStatusMap[order.status] || { label: order.status_text || "未知", variant: "outline" as const };
}

function formatWithdrawOrderStatus(status: number) {
  return withdrawStatusMap[status]?.label || "未知";
}

function getUserDisplayName(order: WithdrawOrder) {
  return order.nickname || order.username || `用户${order.user_id}`;
}

type UserTransactionStats = {
  incomeTotal: number;
  expenseTotal: number;
  withdrawCount: number;
  refundCount: number;
};

function buildUserTransactionStats(items: AdminUserTransaction[]): UserTransactionStats {
  return items.reduce<UserTransactionStats>((acc, item) => {
    const amount = Number(item.amount || 0);
    const typeCode = String(item.type_code || "");

    if (amount >= 0) {
      acc.incomeTotal += amount;
    } else {
      acc.expenseTotal += Math.abs(amount);
    }

    if (typeCode === "withdraw") {
      acc.withdrawCount += 1;
    }
    if (typeCode === "withdraw_refund") {
      acc.refundCount += 1;
    }
    return acc;
  }, {
    incomeTotal: 0,
    expenseTotal: 0,
    withdrawCount: 0,
    refundCount: 0,
  });
}

export function Withdraws() {
  const [withdrawOrders, setWithdrawOrders] = useState<WithdrawOrder[]>([]);
  const [withdrawPage, setWithdrawPage] = useState(1);
  const [withdrawTotalPages, setWithdrawTotalPages] = useState(1);
  const [withdrawTotal, setWithdrawTotal] = useState(0);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawStatus, setWithdrawStatus] = useState("1");
  const [withdrawSearch, setWithdrawSearch] = useState("");
  const [selectedWithdraw, setSelectedWithdraw] = useState<WithdrawOrder | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userTransactions, setUserTransactions] = useState<AdminUserTransaction[]>([]);
  const [userTransactionsTotal, setUserTransactionsTotal] = useState(0);

  const userTxStats = useMemo(() => buildUserTransactionStats(userTransactions), [userTransactions]);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      window.location.href = "/admin/login";
      return;
    }

    loadWithdrawOrders(1);
  }, []);

  async function loadWithdrawOrders(page: number) {
    setWithdrawLoading(true);
    try {
      const res = await api.getWithdrawOrders({
        page,
        page_size: 20,
        status: withdrawStatus === "" ? undefined : Number(withdrawStatus),
        search: withdrawSearch || undefined,
      });

      if (res.code === 0) {
        setWithdrawOrders(res.data.items || []);
        setWithdrawTotal(res.data.total || 0);
        setWithdrawTotalPages(Math.max(1, Math.ceil((res.data.total || 0) / 20)));
        setWithdrawPage(page);
      } else {
        toast.error(res.message || "加载提现单失败");
      }
    } catch (error) {
      toast.error("加载提现单失败");
    } finally {
      setWithdrawLoading(false);
    }
  }

  async function loadWithdrawDetail(order: WithdrawOrder) {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const [detailRes, txRes] = await Promise.all([
        api.getWithdrawOrder(order.id),
        api.getUserTransactions(order.user_id, { limit: USER_TX_LIMIT, offset: 0 }),
      ]);

      if (detailRes.code !== 0) {
        throw new Error(detailRes.message || "加载提现单详情失败");
      }

      if (txRes.code !== 0) {
        throw new Error(txRes.message || "加载用户流水失败");
      }

      setSelectedWithdraw(detailRes.data);
      setUserTransactions(txRes.data.transactions || []);
      setUserTransactionsTotal(txRes.data.total || 0);
    } catch (error) {
      setDetailOpen(false);
      toast.error(error instanceof Error ? error.message : "加载详情失败");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleApprove(order: WithdrawOrder) {
    const remark = window.prompt("确认打款备注，可留空", "") || "";
    if (!confirm(`确认打款到微信 ${order.withdraw_no}，实际打款 ${formatMoney(order.actual_amount)}？`)) return;

    try {
      const res = await api.approveWithdrawOrder(order.id, remark.trim());
      if (res.code === 0) {
        toast.success(res.message || "已提交微信打款");
        await loadWithdrawOrders(withdrawPage);
        if (selectedWithdraw?.id === order.id) {
          await loadWithdrawDetail(order);
        }
      } else {
        toast.error(res.message || "操作失败");
      }
    } catch (error) {
      toast.error("操作失败");
    }
  }

  async function handleReject(order: WithdrawOrder) {
    const reason = window.prompt("请输入拒绝原因", "") || "";
    if (!reason.trim()) {
      toast.error("请填写拒绝原因");
      return;
    }
    if (!confirm(`确认拒绝提现 ${order.withdraw_no}？系统会退回 ${formatMoney(order.amount)} 到用户余额。`)) return;

    try {
      const res = await api.rejectWithdrawOrder(order.id, reason.trim());
      if (res.code === 0) {
        toast.success("提现已拒绝，余额已退回");
        await loadWithdrawOrders(withdrawPage);
        if (selectedWithdraw?.id === order.id) {
          await loadWithdrawDetail(order);
        }
      } else {
        toast.error(res.message || "操作失败");
      }
    } catch (error) {
      toast.error("操作失败");
    }
  }

  async function handleSync(order: WithdrawOrder) {
    try {
      const res = await api.syncWithdrawOrder(order.id);
      if (res.code === 0) {
        toast.success("状态已同步");
        await loadWithdrawOrders(withdrawPage);
        if (selectedWithdraw?.id === order.id) {
          await loadWithdrawDetail(res.data);
        }
      } else {
        toast.error(res.message || "同步失败");
      }
    } catch (error) {
      toast.error("同步失败");
    }
  }

  function exportWithdrawOrders() {
    const url = api.getWithdrawOrdersExportUrl({
      status: withdrawStatus === "" ? undefined : Number(withdrawStatus),
      search: withdrawSearch || undefined,
    });
    window.open(url, "_blank");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">待审核</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{withdrawStatus === "1" ? withdrawTotal : "-"}</div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">当前页</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{withdrawPage}</div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">总页数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{withdrawTotalPages}</div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">筛选结果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{withdrawTotal}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>提现审核</CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                className="w-full sm:w-72"
                placeholder="搜索提现单号 / 用户 / 手机号"
                value={withdrawSearch}
                onChange={(e) => setWithdrawSearch(e.target.value)}
              />
              <select
                className="h-8 rounded-md border border-input bg-transparent px-3 text-sm"
                value={withdrawStatus}
                onChange={(e) => setWithdrawStatus(e.target.value)}
              >
                <option value="">全部状态</option>
                <option value="1">待审核</option>
                <option value="4">打款处理中</option>
                <option value="2">打款成功</option>
                <option value="3">已拒绝</option>
                <option value="5">打款失败</option>
              </select>
              <Button variant="outline" size="sm" onClick={() => loadWithdrawOrders(1)}>
                查询
              </Button>
              <Button variant="outline" size="sm" onClick={exportWithdrawOrders}>
                <Download className="size-3.5" />
                导出
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {withdrawLoading ? (
            <div className="py-12 text-center text-muted-foreground">加载中...</div>
          ) : withdrawOrders.length === 0 ? (
            <Alert className="m-4">
              <AlertDescription>暂无提现申请</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>提现单</TableHead>
                      <TableHead>用户</TableHead>
                      <TableHead>金额</TableHead>
                      <TableHead>手续费</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>申请时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawOrders.map((order) => {
                      const status = getWithdrawStatus(order);
                      return (
                        <TableRow key={order.id}>
                          <TableCell>
                            <div className="font-mono text-xs">{order.withdraw_no}</div>
                            <div className="text-xs text-muted-foreground">ID {order.id}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{getUserDisplayName(order)}</div>
                            <div className="text-xs text-muted-foreground">
                              ID {order.user_id} · {order.phone || "未绑定手机号"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{formatMoney(order.amount)}</div>
                            <div className="text-xs text-muted-foreground">到账 {formatMoney(order.actual_amount)}</div>
                          </TableCell>
                          <TableCell>{formatMoney(order.commission_amount)}</TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.label}</Badge>
                            {order.transfer_bill_no || order.channel_txn_id ? (
                              <div className="mt-1 text-xs text-muted-foreground">{order.transfer_bill_no || order.channel_txn_id}</div>
                            ) : null}
                            {order.reject_reason || order.fail_reason ? (
                              <div className="mt-1 max-w-48 truncate text-xs text-destructive">{order.reject_reason || order.fail_reason}</div>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatTime(order.created_at)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" onClick={() => loadWithdrawDetail(order)}>
                                <Eye className="size-3.5" />
                                详情
                              </Button>
                              {order.status === 4 ? (
                                <Button size="sm" variant="outline" onClick={() => handleSync(order)}>
                                  <RefreshCw className="size-3.5" />
                                  同步状态
                                </Button>
                              ) : null}
                              {order.status === 1 ? (
                                <>
                                  <Button size="sm" onClick={() => handleApprove(order)}>
                                    发起打款
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleReject(order)}>
                                    拒绝
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {withdrawTotalPages > 1 ? (
                <div className="flex items-center justify-center gap-4 border-t p-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={withdrawPage <= 1}
                    onClick={() => loadWithdrawOrders(withdrawPage - 1)}
                  >
                    上一页
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    第 {withdrawPage} / {withdrawTotalPages} 页，共 {withdrawTotal} 条
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={withdrawPage >= withdrawTotalPages}
                    onClick={() => loadWithdrawOrders(withdrawPage + 1)}
                  >
                    下一页
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>提现单详情</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="py-12 text-center text-muted-foreground">加载中...</div>
          ) : selectedWithdraw ? (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Card size="sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-normal text-muted-foreground">申请金额</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-semibold">{formatMoney(selectedWithdraw.amount)}</div>
                    <div className="text-xs text-muted-foreground">到账 {formatMoney(selectedWithdraw.actual_amount)}</div>
                  </CardContent>
                </Card>
                <Card size="sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-normal text-muted-foreground">近{Math.min(USER_TX_LIMIT, userTransactions.length)}条收入</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-semibold text-green-600">{formatMoney(userTxStats.incomeTotal)}</div>
                  </CardContent>
                </Card>
                <Card size="sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-normal text-muted-foreground">近{Math.min(USER_TX_LIMIT, userTransactions.length)}条支出</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-semibold text-amber-600">{formatMoney(userTxStats.expenseTotal)}</div>
                  </CardContent>
                </Card>
                <Card size="sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-normal text-muted-foreground">提现历史</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-semibold">{userTxStats.withdrawCount} / 退回 {userTxStats.refundCount}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>提现单信息</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-muted-foreground">提现单号</div>
                        <div className="font-mono">{selectedWithdraw.withdraw_no}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">状态</div>
                        <Badge variant={getWithdrawStatus(selectedWithdraw).variant}>{getWithdrawStatus(selectedWithdraw).label}</Badge>
                      </div>
                      <div>
                        <div className="text-muted-foreground">用户</div>
                        <div>{getUserDisplayName(selectedWithdraw)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">手机号</div>
                        <div>{selectedWithdraw.phone || "-"}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">申请时间</div>
                        <div>{formatTime(selectedWithdraw.created_at)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">打款时间</div>
                        <div>{formatTime(selectedWithdraw.transferred_at)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">微信商户单号</div>
                        <div className="font-mono break-all">{selectedWithdraw.channel_txn_id || "-"}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">微信转账单号</div>
                        <div className="font-mono break-all">{selectedWithdraw.transfer_bill_no || "-"}</div>
                      </div>
                    </div>
                    {selectedWithdraw.reject_reason || selectedWithdraw.fail_reason ? (
                      <Alert variant="destructive" className="mt-4">
                        <AlertDescription>{selectedWithdraw.reject_reason || selectedWithdraw.fail_reason}</AlertDescription>
                      </Alert>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>审核操作日志</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedWithdraw.logs && selectedWithdraw.logs.length > 0 ? (
                      <div className="space-y-2">
                        {selectedWithdraw.logs.map((log) => (
                          <div key={log.id} className="rounded-md border p-3 text-sm">
                            <div className="flex justify-between gap-3">
                              <span>{log.action} · {formatWithdrawOrderStatus(log.status_after)}</span>
                              <span className="text-muted-foreground">{formatTime(log.created_at)}</span>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">管理员 ID {log.admin_id || "-"}</div>
                            {log.remark ? <div className="mt-2 text-xs">{log.remark}</div> : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">暂无日志</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>该用户最近流水</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    已加载最近 {userTransactions.length} 条，用户总流水 {userTransactionsTotal} 条
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {userTransactions.length === 0 ? (
                    <Alert className="m-4">
                      <AlertDescription>该用户暂无流水</AlertDescription>
                    </Alert>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>类型</TableHead>
                            <TableHead>金额</TableHead>
                            <TableHead>余额变化</TableHead>
                            <TableHead>备注</TableHead>
                            <TableHead>时间</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userTransactions.map((item) => {
                            const isCurrentWithdraw = String(item.type_code || "") === "withdraw" && item.related_id === selectedWithdraw.id;
                            return (
                              <TableRow key={item.id} className={isCurrentWithdraw ? "bg-amber-50/70" : undefined}>
                                <TableCell className="font-mono text-xs">{item.id}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span>{item.type_str || item.type_code || item.type}</span>
                                    {isCurrentWithdraw ? <Badge variant="outline">本次提现</Badge> : null}
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono">
                                  <span className={Number(item.amount) >= 0 ? "text-green-600" : "text-red-600"}>
                                    {formatSignedAmount(item.amount)}
                                  </span>
                                </TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                  {(item.balance_before ?? 0).toFixed(2)} → {(item.balance_after ?? 0).toFixed(2)}
                                </TableCell>
                                <TableCell className="max-w-80 text-xs text-muted-foreground">{item.remark || "-"}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{formatTime(item.created_at)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
