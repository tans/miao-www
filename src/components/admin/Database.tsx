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
  const [tableSearch, setTableSearch] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
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

  async function loadTableData(tableName: string) {
    setSelectedTable(tableName);
    setSchemaTable(tableName);
    setSchema(null);
    setQueryResult(null);
    setQueryError("");

    // Load schema
    try {
      const schemaRes = await api.getTableSchema(tableName);
      if (schemaRes.code === 0) {
        setSchema(schemaRes.data.schema);
      }
    } catch (e) {
      console.error("加载结构失败", e);
    }

    // Load 100 rows
    try {
      const dataRes = await api.executeQuery(`SELECT * FROM \`${tableName}\` LIMIT 100`);
      if (dataRes.code === 0) {
        const rows = dataRes.data.result || [];
        if (rows.length > 0) {
          setQueryResult({
            columns: Object.keys(rows[0]),
            rows,
          });
        }
      } else {
        setQueryError(dataRes.message);
      }
    } catch (e) {
      console.error("加载数据失败", e);
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
                rows={3}
                placeholder="SELECT ..."
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
          <CardTitle>选择数据表</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">加载中...</div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="搜索表名..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-[300px]"
              />
              <select
                className="h-9 w-[300px] rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
                value={selectedTable}
                onChange={(e) => {
                  const table = e.target.value;
                  if (table) {
                    setSelectedTable(table);
                    loadTableData(table);
                  }
                }}
              >
                <option value="">选择表...</option>
                {tables.filter(t => t.toLowerCase().includes(tableSearch.toLowerCase())).map(table => (
                  <option key={table} value={table}>{table}</option>
                ))}
              </select>
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