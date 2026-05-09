"use client";

import { useEffect, useState } from "react";
import { Download, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

function formatMoney(amount?: number) {
  return `¥${(amount ?? 0).toFixed(2)}`;
}

function formatTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN");
}

const withdrawStatusMap: Record<number, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  1: { label: "待审核", variant: "secondary" },
  2: { label: "打款成功", variant: "default" },
  3: { label: "已拒绝", variant: "destructive" },
  4: { label: "打款处理中", variant: "outline" },
  5: { label: "打款失败", variant: "destructive" },
};

function getWithdrawStatus(order: WithdrawOrder) {
  return withdrawStatusMap[order.status] || { label: order.status_text || "未知", variant: "outline" as const };
}

function formatWithdrawOrderStatus(status: number) {
  return withdrawStatusMap[status]?.label || "未知";
}

export function Finance() {
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [withdrawOrders, setWithdrawOrders] = useState<WithdrawOrder[]>([]);
  const [withdrawPage, setWithdrawPage] = useState(1);
  const [withdrawTotalPages, setWithdrawTotalPages] = useState(1);
  const [withdrawTotal, setWithdrawTotal] = useState(0);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawStatus, setWithdrawStatus] = useState("1");
  const [withdrawSearch, setWithdrawSearch] = useState("");
  const [selectedWithdraw, setSelectedWithdraw] = useState<WithdrawOrder | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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
        setTotalPages(Math.max(1, Math.ceil((txRes.data.total || 0) / 20)));
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
    } catch (e) {
      toast.error("加载提现单失败");
    } finally {
      setWithdrawLoading(false);
    }
  }

  async function openWithdrawDetail(order: WithdrawOrder) {
    try {
      const res = await api.getWithdrawOrder(order.id);
      if (res.code === 0) {
        setSelectedWithdraw(res.data);
        setDetailOpen(true);
      } else {
        toast.error(res.message || "加载详情失败");
      }
    } catch (e) {
      toast.error("加载详情失败");
    }
  }

  async function handleApprove(order: WithdrawOrder) {
    const remark = window.prompt("确认打款备注，可留空", "") || "";
    if (!confirm(`确认打款到微信 ${order.withdraw_no}，实际打款 ${formatMoney(order.actual_amount)}？`)) return;

    try {
      const res = await api.approveWithdrawOrder(order.id, remark.trim());
      if (res.code === 0) {
        toast.success(res.message || "已提交微信打款");
        loadWithdrawOrders(withdrawPage);
      } else {
        toast.error(res.message || "操作失败");
      }
    } catch (e) {
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
        loadWithdrawOrders(withdrawPage);
        loadFinance(currentPage);
      } else {
        toast.error(res.message || "操作失败");
      }
    } catch (e) {
      toast.error("操作失败");
    }
  }

  async function handleSync(order: WithdrawOrder) {
    try {
      const res = await api.syncWithdrawOrder(order.id);
      if (res.code === 0) {
        toast.success("状态已同步");
        loadWithdrawOrders(withdrawPage);
        if (selectedWithdraw?.id === order.id) {
          setSelectedWithdraw(res.data);
        }
      } else {
        toast.error(res.message || "同步失败");
      }
    } catch (e) {
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

  function handlePageChange(newPage: number) {
    loadFinance(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
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
                            <div className="font-medium">{order.nickname || order.username || `用户${order.user_id}`}</div>
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
                              <Button size="sm" variant="outline" onClick={() => openWithdrawDetail(order)}>
                                <Eye className="size-3.5" />
                                详情
                              </Button>
                              {order.status === 4 ? (
                                <Button size="sm" variant="outline" onClick={() => handleSync(order)}>
                                  同步状态
                                </Button>
                              ) : null}
                              {order.status === 1 ? (
                                <>
                                  <Button size="sm" onClick={() => handleApprove(order)}>
                                    确认打款
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

              {withdrawTotalPages > 1 && (
                <div className="flex justify-center items-center gap-4 p-4 border-t">
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
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(tx.created_at).toLocaleString("zh-CN")}
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

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>提现单详情</DialogTitle>
          </DialogHeader>
          {selectedWithdraw ? (
            <div className="space-y-5">
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
                  <div>{selectedWithdraw.nickname || selectedWithdraw.username || selectedWithdraw.user_id}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">手机号</div>
                  <div>{selectedWithdraw.phone || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">申请金额</div>
                  <div>{formatMoney(selectedWithdraw.amount)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">实际到账</div>
                  <div>{formatMoney(selectedWithdraw.actual_amount)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">微信商户单号</div>
                  <div className="font-mono break-all">{selectedWithdraw.channel_txn_id || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">微信转账单号</div>
                  <div className="font-mono break-all">{selectedWithdraw.transfer_bill_no || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">申请时间</div>
                  <div>{formatTime(selectedWithdraw.created_at)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">打款时间</div>
                  <div>{formatTime(selectedWithdraw.transferred_at)}</div>
                </div>
              </div>

              {(selectedWithdraw.reject_reason || selectedWithdraw.fail_reason) ? (
                <Alert variant="destructive">
                  <AlertDescription>{selectedWithdraw.reject_reason || selectedWithdraw.fail_reason}</AlertDescription>
                </Alert>
              ) : null}

              <div>
                <div className="mb-2 text-sm font-medium">审核操作日志</div>
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
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
