"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Work {
  id: number;
  task_id: number;
  creator_id: number;
  content?: string;
  materials?: Array<{
    file_path: string;
    file_type: string;
    thumbnail_path?: string;
  }>;
  review_result: number;
  created_at: string;
}

const statusMap: Record<number, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  1: { label: "待审核", variant: "secondary" },
  2: { label: "已通过", variant: "default" },
  3: { label: "未通过", variant: "destructive" },
};

export function Works() {
  const [works, setWorks] = useState<Work[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [previewImages, setPreviewImages] = useState<string[] | null>(null);

  const loadWorks = useCallback(async (page: number, keyword: string) => {
    setLoading(true);
    try {
      const params: any = { page, page_size: 20 };
      if (keyword) {
        params.keyword = keyword;
      }

      const res = await api.getWorks(params);
      if (res.code === 0) {
        setWorks(res.data.works || []);
        setTotal(res.data.total || 0);
        setTotalPages(Math.ceil((res.data.total || 0) / 20));
        setCurrentPage(page);
      } else {
        toast.error(res.message);
      }
    } catch (e) {
      toast.error("加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      window.location.href = "/admin/login";
      return;
    }

    loadWorks(1, "");
  }, [loadWorks]);

  const handleSearchChange = (value: string) => {
    setSearchKeyword(value);
    const timeoutId = setTimeout(() => {
      loadWorks(1, value);
    }, 300);
    return () => clearTimeout(timeoutId);
  };

  function handlePageChange(newPage: number) {
    loadWorks(newPage, searchKeyword);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function getImageUrls(work: Work) {
    return (work.materials || [])
      .filter((material) => material.file_type?.startsWith("image/"))
      .map((material) => material.thumbnail_path || material.file_path)
      .filter(Boolean);
  }

  return (
    <div className="max-w-[1400px]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">作品管理</h1>
        <div className="flex items-center gap-3">
          <Input
            type="search"
            placeholder="搜索作品内容/创作者..."
            className="w-64"
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : works.length === 0 ? (
            <Alert className="m-4">
              <AlertDescription>暂无数据{searchKeyword ? "，请调整搜索条件" : ""}</AlertDescription>
            </Alert>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>任务ID</TableHead>
                    <TableHead>创作者ID</TableHead>
                    <TableHead>内容</TableHead>
                    <TableHead>图片</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {works.map((work) => (
                    <TableRow key={work.id}>
                      <TableCell className="font-mono text-xs">{work.id}</TableCell>
                      <TableCell className="font-mono text-xs">{work.task_id}</TableCell>
                      <TableCell className="font-mono text-xs">{work.creator_id}</TableCell>
                      <TableCell className="max-w-64 truncate text-muted-foreground">
                        {work.content?.substring(0, 50) || "-"}
                      </TableCell>
                      <TableCell>
                        {getImageUrls(work).length > 0 ? (
                          <button
                            className="text-primary hover:underline text-sm"
                            onClick={() => setPreviewImages(getImageUrls(work))}
                          >
                            {getImageUrls(work).length} 张
                          </button>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusMap[work.review_result]?.variant || "secondary"}>
                          {statusMap[work.review_result]?.label || "未知"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(work.created_at).toLocaleDateString("zh-CN")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <a href={`/admin/work-detail?id=${work.id}`} className="text-primary hover:underline text-sm">
                            详情
                          </a>
                        </div>
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

      {/* Image Preview Modal */}
      {previewImages && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/80" onClick={() => setPreviewImages(null)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <button
              className="absolute top-4 right-4 text-white hover:text-gray-300 text-4xl font-bold"
              onClick={() => setPreviewImages(null)}
            >
              &times;
            </button>
            <div className="max-w-4xl max-h-[90vh] overflow-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {previewImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={img}
                      alt={`作品图片 ${idx + 1}`}
                      className="w-full h-auto rounded-lg object-contain max-h-[70vh]"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
