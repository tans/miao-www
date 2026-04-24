"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ChevronDownIcon } from "lucide-react";

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
}

interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
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
        const tables = res.data.tables || [];
        setTables(tables);
        // Auto-select tasks table if exists
        if (tables.includes("tasks")) {
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

  async function loadTableData(tableName: string) {
    setSelectedTable(tableName);
    setSchema(null);
    setQueryResult(null);
    setQueryError("");
    setSqlInput(`SELECT * FROM \`${tableName}\` LIMIT 100`);

    try {
      const [schemaRes, dataRes] = await Promise.all([
        api.getTableSchema(tableName),
        api.executeQuery(`SELECT * FROM \`${tableName}\` LIMIT 100`)
      ]);

      if (schemaRes.code === 0) {
        // Backend returns { table_name, columns } but frontend expects { columns }
        setSchema({ columns: schemaRes.data.columns });
      }
      if (dataRes.code === 0) {
        // dataRes.data可能是数组，也可能是{result: [...]}，也可能是{rows: [...]}
        const rawData = dataRes.data;
        let rows: any[] = [];
        if (Array.isArray(rawData)) {
          rows = rawData;
        } else if (rawData) {
          if (Array.isArray(rawData.result)) {
            rows = rawData.result;
          } else if (Array.isArray(rawData.rows)) {
            rows = rawData.rows;
          } else if (Array.isArray(rawData.data)) {
            rows = rawData.data;
          }
        }
        if (rows.length > 0) {
          setQueryResult({
            columns: Object.keys(rows[0]),
            rows,
          });
        } else {
          setQueryError("数据为空: " + JSON.stringify(rawData)?.slice(0, 100));
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

    try {
      const res = await api.executeQuery(sqlInput);
      if (res.code === 0) {
        const rawData = res.data;
        let rows: any[] = [];
        if (Array.isArray(rawData)) {
          rows = rawData;
        } else if (rawData) {
          if (Array.isArray(rawData.result)) {
            rows = rawData.result;
          } else if (Array.isArray(rawData.rows)) {
            rows = rawData.rows;
          } else if (Array.isArray(rawData.data)) {
            rows = rawData.data;
          }
        }
        if (rows.length === 0) {
          setQueryError("数据为空: " + JSON.stringify(rawData)?.slice(0, 100));
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
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && e.ctrlKey) {
      executeQuery();
    }
  }

  function copySchemaToClipboard() {
    if (!schema || !selectedTable) return;
    const text = `${selectedTable}\n${schema.columns.map(c => `${c.name}\t${c.type}`).join("\n")}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        toast.success("已复制到剪贴板");
      }).catch((err) => {
        console.error("clipboard error:", err);
        toast.error("复制失败，请检查浏览器权限");
      });
    } else {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        toast.success("已复制到剪贴板");
      } catch (err) {
        console.error("execCommand error:", err);
        toast.error("复制失败");
      }
      document.body.removeChild(textarea);
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Popover open={tableSearchOpen} onOpenChange={setTableSearchOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[200px] justify-between">
              {selectedTable || "选择表..."}
              <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="搜索表名..." value={tableSearch} onValueChange={setTableSearch} />
              <CommandList>
                <CommandEmpty>未找到表</CommandEmpty>
                <CommandGroup>
                  {tables.filter(t => t.toLowerCase().includes(tableSearch.toLowerCase())).map(table => (
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
          className="font-mono h-9 min-h-[36px] flex-1"
          placeholder="SELECT ..."
          value={sqlInput}
          onChange={(e) => setSqlInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <Button onClick={executeQuery} size="sm">执行</Button>
        <Button variant="outline" onClick={clearResults} size="sm">清空</Button>
      </div>

      {/* Results */}
      <Card>
        <CardContent className="p-0">
          {schema && (
            <div>
              <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b text-sm font-medium">
                <span>{selectedTable} - 表结构</span>
                <Button variant="ghost" size="sm" onClick={copySchemaToClipboard}>
                  复制结构
                </Button>
              </div>
              <div className="w-full overflow-x-auto">
                <Table className="w-full table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">字段名</TableHead>
                      <TableHead className="whitespace-nowrap">类型</TableHead>
                      <TableHead className="whitespace-nowrap">可空</TableHead>
                      <TableHead className="whitespace-nowrap">默认值</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schema.columns.map((col) => (
                      <TableRow key={col.name}>
                        <TableCell className="font-mono whitespace-nowrap truncate max-w-[150px]">{col.name}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap truncate max-w-[150px]">{col.type}</TableCell>
                        <TableCell className="whitespace-nowrap">{col.notnull ? "否" : "是"}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap truncate max-w-[150px]">{col.default || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {queryResult && (
            <div>
              <div className="px-4 py-2 bg-muted/30 border-b text-sm text-muted-foreground">
                返回 {queryResult.rows.length} 行
                {queryResult.rows.length >= 100 && " (仅显示前100行)"}
              </div>
              <div className="w-full overflow-x-auto max-h-[500px]">
                <Table className="w-full table-fixed">
                  <TableHeader>
                    <TableRow>
                      {queryResult.columns.map((col) => (
                        <TableHead key={col} className="whitespace-nowrap">{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queryResult.rows.map((row, i) => (
                      <TableRow key={i}>
                        {queryResult.columns.map((col) => (
                          <TableCell key={col} className="whitespace-nowrap truncate max-w-[200px]">{row[col] ?? "-"}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {queryError && (
            <Alert variant="destructive" className="m-4">
              <AlertDescription>{queryError}</AlertDescription>
            </Alert>
          )}

          {!schema && !queryResult && !queryError && !loading && (
            <div className="text-center py-8 text-muted-foreground">选择表或输入 SQL 查询</div>
          )}

          {loading && (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
