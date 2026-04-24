"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/api";

interface FinanceStats {
  total_revenue: number;
  today_revenue: number;
  total_transactions: number;
}

interface Transaction {
  id: number;
  user_id: number;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  remark?: string;
  created_at: string;
}

export function Finance() {
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      window.location.href = "/admin/login";
      return;
    }

    loadFinance(1);
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
        setTotalPages(Math.ceil((txRes.data.total || 0) / 20));
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
                      <TableCell>{tx.type}</TableCell>
                      <TableCell className="font-mono">
                        <span className={tx.amount >= 0 ? "text-green-600" : "text-red-600"}>
                          {tx.amount >= 0 ? "+" : ""}¥{(tx.amount ?? 0).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground text-xs">
                        {(tx.balance_before ?? 0).toFixed(2)} → {(tx.balance_after ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{tx.remark || "-"}</TableCell>
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
    </div>
  );
}