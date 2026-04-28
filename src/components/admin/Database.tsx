"use client";

import { useEffect, useState } from "react";
import { ChevronDownIcon, EyeIcon, SearchIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Column {
  cid?: number;
  name: string;
  type: string;
  notnull?: boolean;
  default?: unknown;
  primary_key?: boolean;
}

interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
}

interface PreviewState {
  title: string;
  description?: string;
  content: string;
}

const PAGE_SIZE_OPTIONS = [20, 50, 100];

function stringifyValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getCompactValue(value: unknown) {
  const text = stringifyValue(value);
  if (!text) return "-";
  return text.replace(/\s+/g, " ").trim();
}

function truncateText(text: string, max = 72) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

export function Database() {
  const [tables, setTables] = useState<string[]>([]);
  const [schema, setSchema] = useState<{ columns: Column[] } | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tableSearchOpen, setTableSearchOpen] = useState(false);
  const [tableSearch, setTableSearch] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [sqlInput, setSqlInput] = useState("");
  const [resultSearch, setResultSearch] = useState("");
  const [schemaSearch, setSchemaSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");

    if (urlToken) {
      localStorage.setItem("admin_token", urlToken);
      api.setToken(urlToken);
    }

    const token = localStorage.getItem("admin_token");
    if (!token) {
      window.location.href = "/admin/login";
      return;
    }

    loadTables();
  }, []);

  async function loadTables() {
    try {
      const res = await api.getTables();
      if (res.code === 0) {
        const nextTables = res.data.tables || [];
        setTables(nextTables);
        if (nextTables.includes("tasks")) {
          loadTableData("tasks");
        }
      } else {
        toast.error(res.message);
      }
    } catch (e) {
      toast.error("加载失败");
    } finally {
      setLoading(false);
    }
  }

  function extractRows(rawData: any) {
    if (Array.isArray(rawData)) return rawData;
    if (!rawData) return [];
    if (Array.isArray(rawData.result)) return rawData.result;
    if (Array.isArray(rawData.rows)) return rawData.rows;
    if (Array.isArray(rawData.data)) return rawData.data;
    return [];
  }

  function resetDataView() {
    setResultSearch("");
    setSchemaSearch("");
    setCurrentPage(1);
    setPreview(null);
  }

  async function loadTableData(tableName: string) {
    setSelectedTable(tableName);
    setSchema(null);
    setQueryResult(null);
    setQueryError("");
    setSqlInput(`SELECT * FROM \`${tableName}\` LIMIT 100`);
    resetDataView();

    try {
      const [schemaRes, dataRes] = await Promise.all([
        api.getTableSchema(tableName),
        api.executeQuery(`SELECT * FROM \`${tableName}\` LIMIT 100`)
      ]);

      if (schemaRes.code === 0) {
        setSchema({ columns: schemaRes.data.columns || [] });
      }

      if (dataRes.code === 0) {
        const rows = extractRows(dataRes.data);
        if (rows.length > 0) {
          setQueryResult({
            columns: Object.keys(rows[0]),
            rows,
          });
        } else {
          setQueryError("数据为空");
        }
      } else {
        setQueryError(dataRes.message);
      }
    } catch (e) {
      setQueryError("加载失败");
    }
  }

  async function executeQuery() {
    if (!sqlInput.trim()) {
      toast.error("请输入 SQL 语句");
      return;
    }

    const upperSql = sqlInput.toUpperCase();
    if (!upperSql.startsWith("SELECT") && !upperSql.startsWith("SHOW") && !upperSql.startsWith("DESCRIBE") && !upperSql.startsWith("UPDATE") && !upperSql.startsWith("INSERT") && !upperSql.startsWith("DELETE")) {
      toast.error("仅允许 SELECT/SHOW/DESCRIBE/UPDATE/INSERT/DELETE 操作");
      return;
    }

    setSchema(null);
    setQueryResult(null);
    setQueryError("");
    setSelectedTable("");
    resetDataView();

    try {
      const res = await api.executeQuery(sqlInput);
      if (res.code === 0) {
        const rows = extractRows(res.data);
        if (rows.length === 0) {
          setQueryError("数据为空");
        } else {
          setQueryResult({
            columns: Object.keys(rows[0]),
            rows: rows.slice(0, 100),
          });
        }
      } else {
        setQueryError(res.message);
      }
    } catch (e) {
      setQueryError("查询失败");
    }
  }

  function clearResults() {
    setQueryResult(null);
    setQueryError("");
    setSchema(null);
    setSelectedTable("");
    setSqlInput("");
    resetDataView();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && e.ctrlKey) {
      executeQuery();
    }
  }

  function copyText(text: string, successText: string) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        toast.success(successText);
      }).catch((err) => {
        console.error("clipboard error:", err);
        toast.error("复制失败，请检查浏览器权限");
      });
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      toast.success(successText);
    } catch (err) {
      console.error("execCommand error:", err);
      toast.error("复制失败");
    }
    document.body.removeChild(textarea);
  }

  function copySchemaToClipboard() {
    if (!schema || !selectedTable) return;
    const text = `${selectedTable}\n${schema.columns.map((c) => `${c.name}\t${c.type}`).join("\n")}`;
    copyText(text, "已复制表结构");
  }

  function openCellPreview(column: string, value: unknown, rowIndex: number) {
    setPreview({
      title: `${column} 字段预览`,
      description: `第 ${rowIndex + 1} 行`,
      content: stringifyValue(value) || "-",
    });
  }

  function openRowPreview(row: Record<string, unknown>, rowIndex: number) {
    setPreview({
      title: `第 ${rowIndex + 1} 行数据预览`,
      description: selectedTable ? `来源表：${selectedTable}` : "SQL 查询结果",
      content: JSON.stringify(row, null, 2),
    });
  }

  const filteredSchemaColumns = (schema?.columns || []).filter((column) => {
    const keyword = schemaSearch.trim().toLowerCase();
    if (!keyword) return true;
    return [
      column.name,
      column.type,
      stringifyValue(column.default),
      column.primary_key ? "pk primary" : "",
    ].join(" ").toLowerCase().includes(keyword);
  });

  const filteredRows = (queryResult?.rows || []).filter((row) => {
    const keyword = resultSearch.trim().toLowerCase();
    if (!keyword) return true;
    return queryResult?.columns.some((column) => {
      return getCompactValue(row[column]).toLowerCase().includes(keyword);
    });
  });

  const totalFilteredRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredRows / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * pageSize;
  const pagedRows = filteredRows.slice(pageStart, pageStart + pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Popover open={tableSearchOpen} onOpenChange={setTableSearchOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[200px] justify-between">
              {selectedTable || "选择表..."}
              <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0">
            <Command>
              <CommandInput placeholder="搜索表名..." value={tableSearch} onValueChange={setTableSearch} />
              <CommandList>
                <CommandEmpty>未找到表</CommandEmpty>
                <CommandGroup>
                  {tables.filter((table) => table.toLowerCase().includes(tableSearch.toLowerCase())).map((table) => (
                    <CommandItem key={table} value={table} onSelect={() => {
                      loadTableData(table);
                      setTableSearchOpen(false);
                      setTableSearch("");
                    }}>
                      {table}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Button variant="secondary" size="sm" onClick={copySchemaToClipboard} disabled={!schema}>
          复制表结构
        </Button>

        <Textarea
          className="h-9 min-h-[36px] flex-1 font-mono"
          placeholder="SELECT ..."
          value={sqlInput}
          onChange={(e) => setSqlInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <Button onClick={executeQuery} size="sm">执行</Button>
        <Button variant="outline" onClick={clearResults} size="sm">清空</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {schema && (
            <div>
              <div className="flex flex-col gap-3 border-b bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-medium">{selectedTable} - 表结构</div>
                  <div className="text-xs text-muted-foreground">共 {filteredSchemaColumns.length} 个字段</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={schemaSearch}
                      onChange={(e) => setSchemaSearch(e.target.value)}
                      placeholder="检索字段名/类型..."
                      className="pl-8"
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={copySchemaToClipboard}>
                    复制结构
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">序号</TableHead>
                      <TableHead>字段名</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead className="w-24">可空</TableHead>
                      <TableHead className="w-24">主键</TableHead>
                      <TableHead>默认值</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchemaColumns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          未找到匹配字段
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSchemaColumns.map((col, index) => (
                        <TableRow key={`${col.name}-${index}`}>
                          <TableCell className="font-mono text-xs">{col.cid ?? index}</TableCell>
                          <TableCell className="font-mono">{col.name}</TableCell>
                          <TableCell className="text-muted-foreground">{col.type}</TableCell>
                          <TableCell>{col.notnull ? "否" : "是"}</TableCell>
                          <TableCell>
                            {col.primary_key ? <Badge variant="default">PK</Badge> : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="max-w-[280px] truncate text-muted-foreground">
                            {truncateText(getCompactValue(col.default), 48)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {queryResult && (
            <div>
              <div className="flex flex-col gap-3 border-b bg-muted/20 px-4 py-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground">
                    匹配 {totalFilteredRows} 行 / 原始 {queryResult.rows.length} 行
                    {queryResult.rows.length >= 100 && "，当前结果最多显示前 100 行"}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>每页</span>
                    <div className="relative">
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="h-8 cursor-pointer rounded-md border border-input bg-background pl-3 pr-8 text-sm appearance-none hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        {PAGE_SIZE_OPTIONS.map((size) => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div className="relative w-full sm:max-w-sm">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={resultSearch}
                    onChange={(e) => {
                      setResultSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="检索当前结果集..."
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="max-h-[560px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 z-10 w-16 bg-background">#</TableHead>
                      {queryResult.columns.map((col) => (
                        <TableHead key={col} className="sticky top-0 z-10 min-w-[180px] bg-background">
                          {col}
                        </TableHead>
                      ))}
                      <TableHead className="sticky top-0 z-10 w-24 bg-background">预览</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={queryResult.columns.length + 2} className="py-8 text-center text-muted-foreground">
                          未找到匹配数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedRows.map((row, pageIndex) => {
                        const rowIndex = pageStart + pageIndex;
                        return (
                          <TableRow key={rowIndex}>
                            <TableCell className="font-mono text-xs text-muted-foreground">{rowIndex + 1}</TableCell>
                            {queryResult.columns.map((col) => {
                              const compactValue = getCompactValue(row[col]);
                              const previewText = truncateText(compactValue);
                              return (
                                <TableCell key={`${rowIndex}-${col}`} className="max-w-[260px]">
                                  <button
                                    type="button"
                                    onClick={() => openCellPreview(col, row[col], rowIndex)}
                                    className="w-full text-left"
                                  >
                                    <div className="truncate font-mono text-xs text-foreground hover:text-primary">
                                      {previewText}
                                    </div>
                                  </button>
                                </TableCell>
                              );
                            })}
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => openRowPreview(row, rowIndex)}>
                                <EyeIcon className="mr-1 h-4 w-4" />
                                预览
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalFilteredRows > 0 && (
                <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground">
                    第 {safeCurrentPage} / {totalPages} 页
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safeCurrentPage <= 1}
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safeCurrentPage >= totalPages}
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {queryError && (
            <Alert variant="destructive" className="m-4">
              <AlertDescription>{queryError}</AlertDescription>
            </Alert>
          )}

          {!schema && !queryResult && !queryError && !loading && (
            <div className="py-8 text-center text-muted-foreground">选择表或输入 SQL 查询</div>
          )}

          {loading && (
            <div className="py-8 text-center text-muted-foreground">加载中...</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!preview} onOpenChange={(open) => {
        if (!open) setPreview(null);
      }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{preview?.title || "数据预览"}</DialogTitle>
            <DialogDescription>{preview?.description || "查看完整内容"}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto rounded-lg border bg-muted/20 p-3">
            <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-6">
              {preview?.content}
            </pre>
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                if (!preview) return;
                copyText(preview.content, "已复制预览内容");
              }}
            >
              复制内容
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
