"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { toast } from "sonner";

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
  const [schemaTable, setSchemaTable] = useState("");
  const [sqlInput, setSqlInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
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
        setTables(res.data.tables || []);
      } else {
        toast.error(res.message);
      }
    } catch (e) {
      toast.error("加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadSchema(tableName: string) {
    setSchemaTable(tableName);
    setSchema(null);
    setQueryResult(null);
    setQueryError("");

    try {
      const res = await api.getTableSchema(tableName);
      if (res.code === 0) {
        setSchema(res.data.schema);
      } else {
        toast.error(res.message);
      }
    } catch (e) {
      toast.error("加载失败");
    }
  }

  async function executeQuery() {
    if (!sqlInput.trim()) {
      toast.error("请输入 SQL 语句");
      return;
    }

    const upperSql = sqlInput.toUpperCase();
    if (!upperSql.startsWith("SELECT") && !upperSql.startsWith("SHOW") && !upperSql.startsWith("DESCRIBE")) {
      toast.error("仅允许 SELECT/SHOW/DESCRIBE 查询");
      return;
    }

    setSchema(null);
    setQueryResult(null);
    setQueryError("");
    setSchemaTable("");

    try {
      const res = await api.executeQuery(sqlInput);
      if (res.code === 0) {
        const rows = res.data.result || [];
        if (rows.length === 0) {
          setQueryError("查询成功，但无返回数据");
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
    setSchemaTable("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && e.ctrlKey) {
      executeQuery();
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>执行 SQL 查询</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sql-input">SQL 语句</Label>
              <Textarea
                id="sql-input"
                ref={textareaRef}
                className="font-mono"
                rows={4}
                placeholder="SELECT * FROM users LIMIT 10;"
                value={sqlInput}
                onChange={(e) => setSqlInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={executeQuery}>执行查询</Button>
              <Button variant="outline" onClick={clearResults}>清空结果</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>数据库表</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : tables.length === 0 ? (
            <Alert className="m-4">
              <AlertDescription>暂无数据表</AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4">
              {tables.map((table) => (
                <div
                  key={table}
                  className="flex flex-col items-center gap-2 p-4 bg-muted/30 border border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-muted-foreground"
                  >
                    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                  </svg>
                  <span className="font-medium text-sm text-center">{table}</span>
                  <div className="flex gap-2">
                    <button
                      className="text-xs px-2 py-1 bg-background border border-border rounded hover:border-primary hover:text-primary transition-colors"
                      onClick={() => loadSchema(table)}
                    >
                      结构
                    </button>
                    <button
                      className="text-xs px-2 py-1 bg-background border border-border rounded hover:border-primary hover:text-primary transition-colors"
                      onClick={() => setSqlInput(`SELECT * FROM ${table} LIMIT 50;`)}
                    >
                      查询
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>查询结果</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {schema ? (
            <div className="p-4">
              <h4 className="font-medium mb-4">{schemaTable} 表结构</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>字段名</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>可空</TableHead>
                    <TableHead>默认值</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schema.columns.map((col) => (
                    <TableRow key={col.name}>
                      <TableCell className="font-mono">{col.name}</TableCell>
                      <TableCell className="text-muted-foreground">{col.type}</TableCell>
                      <TableCell>{col.nullable ? "是" : "否"}</TableCell>
                      <TableCell className="text-muted-foreground">{col.default || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : queryResult ? (
            <div>
              <div className="px-4 py-3 bg-muted/30 border-b text-sm text-muted-foreground">
                返回 {queryResult.rows.length} 行
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {queryResult.columns.map((col) => (
                        <TableHead key={col}>{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queryResult.rows.map((row, i) => (
                      <TableRow key={i}>
                        {queryResult.columns.map((col) => (
                          <TableCell key={col}>{row[col] ?? "-"}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {queryResult.rows.length >= 100 && (
                <div className="px-4 py-3 bg-muted/30 border-t text-sm text-muted-foreground">
                  仅显示前 100 行
                </div>
              )}
            </div>
          ) : queryError ? (
            <Alert variant="destructive" className="m-4">
              <AlertDescription>{queryError}</AlertDescription>
            </Alert>
          ) : (
            <div className="text-center py-8 text-muted-foreground">请在上方输入 SQL 并执行</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}