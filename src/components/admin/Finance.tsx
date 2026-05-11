"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api, type WithdrawOrder } from "@/lib/api";
import { toast } from "sonner";

interface FinanceStats {
  total_revenue: number;
  today_revenue: number;
  total_transactions: number;
}

interface Transaction {
  id: number;
  user_id: number;
  type: string;
  type_str?: string;
  amount: number;
  raw_amount?: number;
  balance_before: number;
  balance_after: number;
  remark?: string;
  description?: string;
  created_at: string;
}

function formatSignedAmount(amount: number) {
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

function formatMoney(value?: number) {
  return `¥${(value ?? 0).toFixed(2)}`;
}

function statusLabel(status: number) {
  switch (status) {
    case 1: return "待审核";
    case 2: return "打款成功";
    case 3: return "已拒绝";
    case 4: return "打款中";
    case 5: return "打款失败";
    default: return "未知";
  }
}

export function Finance() {
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawOrders, setWithdrawOrders] = useState<WithdrawOrder[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);
  const [withdrawPage, setWithdrawPage] = useState(1);
  const [withdrawTotalPages, setWithdrawTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [withdrawTotal, setWithdrawTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(true);
  const [withdrawError, setWithdrawError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<WithdrawOrder | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approveRemark, setApproveRemark] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      window.location.href = "/admin/login";
      return;
    }

    loadFinance(1);
    loadWithdrawOrders(1);
  }, []);

  async function loadFinance(page: number) {
    setLoading(true);
    setError("");

    try {
      const [statsRes, txRes] = await Promise.all([
        api.getFinanceStats(),
        api.getFinanceTransactions({ page, page_size: 20 })
      ]);

      if (statsRes.code === 0) {
        setStats(statsRes.data);
      }

      if (txRes.code === 0) {
        setTransactions(txRes.data.transactions || []);
        setTotal(txRes.data.total || 0);
        setTxTotalPages(Math.max(1, Math.ceil((txRes.data.total || 0) / 20)));
        setCurrentPage(page);
      } else {
        setError(txRes.message);
      }
    } catch (e) {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadWithdrawOrders(page: number) {
    setWithdrawLoading(true);
    setWithdrawError("");
    try {
      const res = await api.getWithdrawOrders({
        page,
        page_size: 20,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      if (res.code === 0) {
        setWithdrawOrders(res.data.items || []);
        setWithdrawTotal(res.data.total || 0);
        setWithdrawTotalPages(Math.max(1, Math.ceil((res.data.total || 0) / 20)));
        setWithdrawPage(page);
      } else {
        setWithdrawError(res.message);
      }
    } catch (e) {
      setWithdrawError("加载提现单失败");
    } finally {
      setWithdrawLoading(false);
    }
  }

  const hasWithdrawFilters = useMemo(() => statusFilter || search, [statusFilter, search]);

  function handlePageChange(newPage: number) {
    loadFinance(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleWithdrawPageChange(newPage: number) {
    loadWithdrawOrders(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function openOrderDetail(order: WithdrawOrder) {
    setRejectReason("");
    setApproveRemark("");
    setSelectedOrder(order);
    try {
      const res = await api.getWithdrawOrder(order.id);
      if (res.code === 0) {
        setSelectedOrder(res.data);
      }
    } catch (e) {
      toast.error("加载提现单详情失败");
    }
  }

  async function handleApprove(order: WithdrawOrder) {
    if (!confirm(`确认通过提现吗？${order.withdraw_no}`)) return;
    setActionLoading(true);
    try {
      const res = await api.approveWithdrawOrder(order.id, approveRemark);
      if (res.code === 0) {
        toast.success("已发起打款");
        setSelectedOrder(null);
        setApproveRemark("");
        await loadWithdrawOrders(withdrawPage);
      } else {
        toast.error(res.message || "操作失败");
      }
    } catch (e) {
      toast.error("操作失败");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(order: WithdrawOrder) {
    if (!rejectReason.trim()) {
      toast.error("请填写拒绝原因");
      return;
    }
    if (!confirm(`确认拒绝提现吗？${order.withdraw_no}`)) return;
    setActionLoading(true);
    try {
      const res = await api.rejectWithdrawOrder(order.id, rejectReason.trim());
      if (res.code === 0) {
        toast.success("已拒绝并退回余额");
        setSelectedOrder(null);
        setRejectReason("");
        await loadWithdrawOrders(withdrawPage);
      } else {
        toast.error(res.message || "操作失败");
      }
    } catch (e) {
      toast.error("操作失败");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSync(order: WithdrawOrder) {
    setActionLoading(true);
    try {
      const res = await api.syncWithdrawOrder(order.id);
      if (res.code === 0) {
        toast.success("同步成功");
        await loadWithdrawOrders(withdrawPage);
      } else {
        toast.error(res.message || "同步失败");
      }
    } catch (e) {
      toast.error("同步失败");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats ? (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal text-muted-foreground">总收入</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">¥{stats.total_revenue?.toFixed(2) || "0.00"}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal text-muted-foreground">今日收入</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">¥{stats.today_revenue?.toFixed(2) || "0.00"}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal text-muted-foreground">总交易笔数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_transactions || 0}</div>
                <p className="text-xs text-muted-foreground">笔</p>
              </CardContent>
            </Card>
          </>
        ) : loading ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">加载中...</div>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>提现审核</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              className="w-72"
              placeholder="搜索提现单号/用户名/手机号"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">全部状态</option>
              <option value="1">待审核</option>
              <option value="4">打款中</option>
              <option value="2">打款成功</option>
              <option value="3">已拒绝</option>
              <option value="5">打款失败</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => loadWithdrawOrders(1)}>
              搜索
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter(""); void loadWithdrawOrders(1); }}>
              重置
            </Button>
          </div>
          {withdrawError && (
            <Alert variant="destructive">
              <AlertDescription>{withdrawError}</AlertDescription>
            </Alert>
          )}
          {withdrawLoading ? (
            <div className="py-10 text-center text-muted-foreground">加载中...</div>
          ) : withdrawOrders.length === 0 ? (
            <Alert>
              <AlertDescription>暂无提现单{hasWithdrawFilters ? "，请调整筛选条件" : ""}</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>提现单号</TableHead>
                      <TableHead>用户</TableHead>
                      <TableHead>金额</TableHead>
                      <TableHead>实际到账</TableHead>
                      <TableHead>手续费</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">{order.withdraw_no}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{order.nickname || order.username}</div>
                            <div className="text-xs text-muted-foreground">{order.phone || "-"}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{formatMoney(order.amount)}</TableCell>
                        <TableCell className="font-mono">{formatMoney(order.actual_amount)}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">{formatMoney(order.commission_amount)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div>{statusLabel(order.status)}</div>
                            {order.fail_reason && <div className="text-xs text-red-500">{order.fail_reason}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatTime(order.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => openOrderDetail(order)}>
                              详情
                            </Button>
                            {order.status === 1 && (
                              <>
                                <Button size="sm" onClick={() => handleApprove(order)} disabled={actionLoading}>
                                  通过
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => openOrderDetail(order)} disabled={actionLoading}>
                                  拒绝
                                </Button>
                              </>
                            )}
                            {order.status === 4 && (
                              <Button size="sm" variant="outline" onClick={() => handleSync(order)} disabled={actionLoading}>
                                同步状态
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {withdrawTotalPages > 1 && (
                <div className="flex justify-center items-center gap-4 p-4 border-t">
                  <Button variant="outline" size="sm" disabled={withdrawPage <= 1} onClick={() => handleWithdrawPageChange(withdrawPage - 1)}>
                    上一页
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    第 {withdrawPage} / {withdrawTotalPages} 页，共 {withdrawTotal} 条
                  </span>
                  <Button variant="outline" size="sm" disabled={withdrawPage >= withdrawTotalPages} onClick={() => handleWithdrawPageChange(withdrawPage + 1)}>
                    下一页
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>交易记录</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : transactions.length === 0 ? (
            <Alert className="m-4">
              <AlertDescription>暂无数据</AlertDescription>
            </Alert>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>用户ID</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>余额变化</TableHead>
                    <TableHead>备注</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-xs">{tx.id}</TableCell>
                      <TableCell className="font-mono text-xs">{tx.user_id}</TableCell>
                      <TableCell>{tx.type_str || tx.type}</TableCell>
                      <TableCell className="font-mono">
                        <span className={tx.amount >= 0 ? "text-green-600" : "text-red-600"}>
                          {formatSignedAmount(tx.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground text-xs">
                        {(tx.balance_before ?? 0).toFixed(2)} → {(tx.balance_after ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{tx.remark || tx.description || "-"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{formatTime(tx.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {txTotalPages > 1 && (
                <div className="flex justify-center items-center gap-4 p-4 border-t">
                  <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => handlePageChange(currentPage - 1)}>
                    上一页
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    第 {currentPage} / {txTotalPages} 页，共 {total} 条
                  </span>
                  <Button variant="outline" size="sm" disabled={currentPage >= txTotalPages} onClick={() => handlePageChange(currentPage + 1)}>
                    下一页
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedOrder}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOrder(null);
            setRejectReason("");
            setApproveRemark("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>提现单详情</DialogTitle>
            <DialogDescription>{selectedOrder?.withdraw_no || ""}</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-3 text-sm">
              <div>状态: {statusLabel(selectedOrder.status)}</div>
              <div>用户: {selectedOrder.nickname || selectedOrder.username}</div>
              <div>金额: {formatMoney(selectedOrder.amount)}</div>
              <div>实际到账: {formatMoney(selectedOrder.actual_amount)}</div>
              <div>手续费: {formatMoney(selectedOrder.commission_amount)}</div>
              <div>拒绝原因: {selectedOrder.reject_reason || "-"}</div>
              <div>失败原因: {selectedOrder.fail_reason || "-"}</div>
              <div>审核备注</div>
              <Textarea value={approveRemark} onChange={(e) => setApproveRemark(e.target.value)} placeholder="可选备注" />
              <div>拒绝原因</div>
              <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="拒绝时必填" />
              {selectedOrder.logs?.length ? (
                <div className="space-y-2 pt-2">
                  <div className="font-medium">操作日志</div>
                  {selectedOrder.logs.map((log) => (
                    <div key={log.id} className="rounded-md border p-2 text-xs text-muted-foreground">
                      {log.status_text || log.action} · {log.remark || "-"} · {formatTime(log.created_at)}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>关闭</Button>
            {selectedOrder?.status === 1 && (
              <>
                <Button variant="destructive" onClick={() => selectedOrder && handleReject(selectedOrder)} disabled={actionLoading}>
                  拒绝
                </Button>
                <Button onClick={() => selectedOrder && handleApprove(selectedOrder)} disabled={actionLoading}>
                  通过并打款
                </Button>
              </>
            )}
            {selectedOrder?.status === 4 && (
              <Button onClick={() => selectedOrder && handleSync(selectedOrder)} disabled={actionLoading}>
                同步状态
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
