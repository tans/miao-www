"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, type ExceptionReport } from "@/lib/api";
import { toast } from "sonner";

const PAGE_SIZE = 20;

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

function statusVariant(status?: number) {
  if (!status) return "secondary";
  if (status >= 500) return "destructive";
  if (status >= 400) return "secondary";
  return "outline";
}

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";

function compactText(value?: string, length = 120) {
  const text = (value || "").trim();
  if (!text) return "-";
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function DetailBlock({ title, value }: { title: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      <pre className="max-h-60 overflow-auto rounded-md border bg-muted/40 p-3 text-xs leading-5 whitespace-pre-wrap break-words">
        {value}
      </pre>
    </div>
  );
}

export function ExceptionReports() {
  const [items, setItems] = useState<ExceptionReport[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [source, setSource] = useState("");
  const [type, setType] = useState("");
  const [statusCode, setStatusCode] = useState("");
  const [keyword, setKeyword] = useState("");

  const loadItems = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const res = await api.getExceptionReports({
        page,
        page_size: PAGE_SIZE,
        source,
        type,
        status_code: statusCode,
        keyword,
      });
      if (res.code === 0) {
        const nextItems = res.data.items || [];
        setItems(nextItems);
        setTotal(res.data.total || 0);
        setTotalPages(Math.max(1, Math.ceil((res.data.total || 0) / PAGE_SIZE)));
        setCurrentPage(page);
        if (expandedId && !nextItems.some((item) => item.id === expandedId)) {
          setExpandedId(null);
        }
      } else {
        toast.error(res.message || "加载失败");
      }
    } catch (e) {
      toast.error("加载失败");
    } finally {
      setLoading(false);
    }
  }, [expandedId, keyword, source, statusCode, type]);

  useEffect(() => {
    loadItems(1);
  }, [loadItems]);

  function handleReset() {
    setSource("");
    setType("");
    setStatusCode("");
    setKeyword("");
  }

  function handlePageChange(page: number) {
    loadItems(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const hasFilters = source || type || statusCode || keyword;

  return (
    <div className="max-w-[1500px]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">异常报错</h1>
          <p className="mt-1 text-sm text-muted-foreground">后端异常和小程序上报统一在这里查看。</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Input className="w-48" placeholder="来源 miao/miao-mini" value={source} onChange={(e) => setSource(e.target.value)} />
          <Input className="w-52" placeholder="类型 panic/request_error" value={type} onChange={(e) => setType(e.target.value)} />
          <Input className="w-32" placeholder="状态码" value={statusCode} onChange={(e) => setStatusCode(e.target.value)} />
          <Input className="w-64" type="search" placeholder="搜索消息/路径/堆栈" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <Button variant="outline" size="sm" onClick={handleReset}>重置</Button>
          <Button variant="outline" size="sm" onClick={() => loadItems(1)}>刷新</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">加载中...</div>
          ) : items.length === 0 ? (
            <Alert className="m-4">
              <AlertDescription>暂无异常{hasFilters ? "，请调整筛选条件" : ""}</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">ID</TableHead>
                      <TableHead className="w-36">来源</TableHead>
                      <TableHead className="w-44">类型</TableHead>
                      <TableHead>消息</TableHead>
                      <TableHead className="w-52">路径/页面</TableHead>
                      <TableHead className="w-24">状态</TableHead>
                      <TableHead className="w-40">用户</TableHead>
                      <TableHead className="w-44">时间</TableHead>
                      <TableHead className="w-24">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <Fragment key={item.id}>
                        <TableRow>
                          <TableCell className="font-mono text-xs">{item.id}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.source || "-"}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant={(item.level === "error" ? "destructive" : "secondary") as BadgeVariant}>{item.level || "error"}</Badge>
                              <div className="text-xs text-muted-foreground">{item.type || "-"}</div>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xl">
                            <div className="truncate font-medium">{compactText(item.message, 160)}</div>
                            {item.client_ip && <div className="mt-1 text-xs text-muted-foreground">IP {item.client_ip}</div>}
                          </TableCell>
                          <TableCell className="max-w-52">
                            <div className="truncate font-mono text-xs">{item.path || item.page || "-"}</div>
                            {item.method && <div className="mt-1 text-xs text-muted-foreground">{item.method}</div>}
                          </TableCell>
                          <TableCell>
                            {item.status_code ? (
                              <Badge variant={statusVariant(item.status_code) as BadgeVariant}>{item.status_code}</Badge>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {item.user_id ? (
                              <div>
                                <div className="font-mono">{item.user_id}</div>
                                <div className="truncate text-muted-foreground">{item.username || "-"}</div>
                              </div>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(item.created_at || item.occurred_at)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                            >
                              {expandedId === item.id ? "收起" : "查看"}
                            </Button>
                          </TableCell>
                        </TableRow>
                        {expandedId === item.id && (
                          <TableRow>
                            <TableCell colSpan={9} className="bg-muted/20">
                              <div className="grid gap-4 p-4 lg:grid-cols-2">
                                <DetailBlock title="消息" value={item.message} />
                                <DetailBlock title="堆栈" value={item.stack} />
                                <DetailBlock title="请求体" value={item.request_body} />
                                <DetailBlock title="响应体" value={item.response_body} />
                                <DetailBlock title="设备信息" value={item.device_info} />
                                <DetailBlock title="Extra" value={item.extra} />
                                <div className="text-xs text-muted-foreground lg:col-span-2">
                                  <span className="mr-4">UA: {item.user_agent || "-"}</span>
                                  <span className="mr-4">query: {item.query || "-"}</span>
                                  <span>app: {item.app_version || "-"}</span>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 border-t p-4">
                  <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => handlePageChange(currentPage - 1)}>
                    上一页
                  </Button>
                  <span className="text-sm text-muted-foreground">第 {currentPage} / {totalPages} 页，共 {total} 条</span>
                  <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => handlePageChange(currentPage + 1)}>
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
