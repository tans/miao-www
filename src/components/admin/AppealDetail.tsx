"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api, resolveAssetUrl } from "@/lib/api";
import { toast } from "sonner";

interface AppealDetailProps {
  appealId?: string;
}

interface Appeal {
  id: number;
  type: number;
  status: number;
  claim_id?: number;
  target_id?: number;
  task_id?: number;
  user_id: number;
  created_at: string;
  handle_at?: string;
  reason?: string;
  result?: string;
}

interface WorkMedia {
  file_path: string;
  file_type?: string;
  thumbnail_path?: string;
}

interface WorkPreview {
  id: number;
  task_id?: number;
  claim_id?: number;
  creator_id?: number;
  content?: string;
  status?: number;
  review_result?: number | null;
  review_at?: string;
  created_at?: string;
  materials?: WorkMedia[];
  images?: string[];
  videos?: string[];
}

const statusMap: Record<number, { label: string; variant: "default" | "secondary" | "outline" }> = {
  1: { label: "待处理", variant: "secondary" },
  2: { label: "已处理", variant: "default" },
  3: { label: "已关闭", variant: "outline" },
};

const typeMap: Record<number, string> = {
  1: "作品申诉",
};

const workStatusMap: Record<number, string> = {
  1: "已认领",
  2: "待验收",
  3: "已验收",
  4: "已取消",
  5: "已超时",
};

const reviewResultMap: Record<number, string> = {
  1: "通过",
  2: "未通过",
  3: "举报",
};

function resolveAppealId(appealId?: string) {
  const directId = parseInt(appealId || "", 10);
  if (Number.isFinite(directId) && directId > 0) {
    return directId;
  }

  if (typeof window !== "undefined") {
    const hashMatch = window.location.hash.match(/(?:^#|[?&])id=(\d+)/);
    const hashId = parseInt(hashMatch?.[1] || "", 10);
    if (Number.isFinite(hashId) && hashId > 0) {
      return hashId;
    }

    const searchId = parseInt(new URLSearchParams(window.location.search).get("id") || "", 10);
    if (Number.isFinite(searchId) && searchId > 0) {
      return searchId;
    }

    try {
      const cachedId = parseInt(sessionStorage.getItem("admin_last_appeal_id") || "", 10);
      if (Number.isFinite(cachedId) && cachedId > 0) {
        return cachedId;
      }
    } catch (_) {}
  }

  return NaN;
}

function resolveRelatedWorkId(appeal: Appeal | null) {
  const relatedId = appeal?.claim_id ?? appeal?.target_id;
  return Number.isFinite(relatedId) && (relatedId || 0) > 0 ? relatedId : NaN;
}

function isImageType(fileType?: string) {
  const value = (fileType || "").toLowerCase();
  return value.startsWith("image");
}

function isVideoType(fileType?: string) {
  const value = (fileType || "").toLowerCase();
  return value.startsWith("video");
}

function uniqueUrls(urls: string[]) {
  return Array.from(new Set(urls.filter(Boolean)));
}

export function AppealDetail({ appealId }: AppealDetailProps) {
  const [appeal, setAppeal] = useState<Appeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [work, setWork] = useState<WorkPreview | null>(null);
  const [workLoading, setWorkLoading] = useState(false);
  const [workError, setWorkError] = useState("");
  const [handleStatus, setHandleStatus] = useState("accepted");
  const [handleReply, setHandleReply] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      window.location.href = "/admin/login";
      return;
    }

    const id = resolveAppealId(
      appealId || new URLSearchParams(window.location.search).get("id") || ""
    );
    if (!Number.isFinite(id) || id <= 0) {
      setError("无效的申诉ID");
      setLoading(false);
      return;
    }

    loadAppeal(id);
  }, [appealId]);

  async function loadAppeal(id: number) {
    try {
      const res = await api.getAppealDetail(id);
      if (res.code === 0) {
        const nextAppeal = res.data as Appeal;
        setAppeal(nextAppeal);
        const relatedWorkId = resolveRelatedWorkId(nextAppeal);
        if (Number.isFinite(relatedWorkId) && relatedWorkId > 0) {
          void loadWork(relatedWorkId);
        } else {
          setWork(null);
          setWorkError("");
        }
      } else {
        setError(res.message);
      }
    } catch (e) {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadWork(id: number) {
    setWorkLoading(true);
    setWorkError("");
    try {
      const res = await api.getWorkDetail(id);
      if (res.code === 0) {
        setWork(res.data as WorkPreview);
      } else {
        setWork(null);
        setWorkError(res.message || "加载作品失败");
      }
    } catch (e) {
      setWork(null);
      setWorkError("加载作品失败");
    } finally {
      setWorkLoading(false);
    }
  }

  async function handleSubmit() {
    if (!handleReply.trim()) {
      toast.error("请输入处理说明");
      return;
    }

    if (!confirm("确定提交处理结果？")) return;

    const accepted = handleStatus === "accepted";
    const id = resolveAppealId(
      appealId || new URLSearchParams(window.location.search).get("id") || ""
    );
    if (!Number.isFinite(id) || id <= 0) {
      toast.error("无效的申诉ID");
      return;
    }

    try {
      const res = await api.handleAppeal(id, accepted, handleReply);
      if (res.code === 0) {
        toast.success("处理成功");
        loadAppeal(id);
      } else {
        toast.error("处理失败: " + res.message);
      }
    } catch (e) {
      toast.error("处理失败");
    }
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (loading || !appeal) {
    return <div className="text-center py-12 text-muted-foreground">加载中...</div>;
  }

  const relatedWorkId = resolveRelatedWorkId(appeal);
  const imageUrls = uniqueUrls([
    ...((work?.materials || [])
      .filter((material) => isImageType(material.file_type))
      .map((material) => resolveAssetUrl(material.thumbnail_path || material.file_path))),
    ...((work?.images || []).map((url) => resolveAssetUrl(url))),
  ]);
  const videoItems = uniqueUrls([
    ...((work?.materials || [])
      .filter((material) => isVideoType(material.file_type))
      .map((material) => resolveAssetUrl(material.file_path))),
    ...((work?.videos || []).map((url) => resolveAssetUrl(url))),
  ]).map((src) => ({ src, poster: "" }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>申诉信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground text-sm">申诉ID</span>
            <span className="font-mono text-sm">{appeal.id}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground text-sm">类型</span>
            <Badge variant="outline">{typeMap[appeal.type] || "未知"}</Badge>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground text-sm">状态</span>
            <Badge variant={statusMap[appeal.status]?.variant || "secondary"}>
              {statusMap[appeal.status]?.label || "未知"}
            </Badge>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground text-sm">关联作品ID</span>
            {Number.isFinite(relatedWorkId) && relatedWorkId > 0 ? (
              <a href={`/admin/work-detail?id=${relatedWorkId}`} className="text-primary hover:underline font-mono text-sm">
                {relatedWorkId}
              </a>
            ) : (
              <span className="text-sm">-</span>
            )}
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground text-sm">任务ID</span>
            {appeal.task_id ? (
              <a href={`/admin/task-detail?id=${appeal.task_id}`} className="text-primary hover:underline font-mono text-sm">
                {appeal.task_id}
              </a>
            ) : (
              <span className="text-sm">-</span>
            )}
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground text-sm">用户ID</span>
            <a href={`/admin/user-detail?id=${appeal.user_id}`} className="text-primary hover:underline font-mono text-sm">
              {appeal.user_id}
            </a>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground text-sm">创建时间</span>
            <span className="text-sm">{appeal.created_at ? new Date(appeal.created_at).toLocaleString("zh-CN") : "-"}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground text-sm">处理时间</span>
            <span className="text-sm">{appeal.handle_at ? new Date(appeal.handle_at).toLocaleString("zh-CN") : "-"}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>作品预览</CardTitle>
          {work?.id ? (
            <a href={`/admin/work-detail?id=${work.id}`} className="text-sm text-primary hover:underline">
              查看完整作品
            </a>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {workLoading ? (
            <div className="text-sm text-muted-foreground">作品加载中...</div>
          ) : workError ? (
            <Alert>
              <AlertDescription>{workError}</AlertDescription>
            </Alert>
          ) : !work ? (
            <div className="text-sm text-muted-foreground">暂无关联作品</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground text-sm">作品ID</span>
                  <span className="font-mono text-sm">{work.id}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground text-sm">关联认领ID</span>
                  <span className="font-mono text-sm">{work.claim_id || "-"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground text-sm">任务ID</span>
                  {work.task_id ? (
                    <a href={`/admin/task-detail?id=${work.task_id}`} className="text-primary hover:underline font-mono text-sm">
                      {work.task_id}
                    </a>
                  ) : (
                    <span className="text-sm">-</span>
                  )}
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground text-sm">创作者ID</span>
                  {work.creator_id ? (
                    <a href={`/admin/user-detail?id=${work.creator_id}`} className="text-primary hover:underline font-mono text-sm">
                      {work.creator_id}
                    </a>
                  ) : (
                    <span className="text-sm">-</span>
                  )}
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground text-sm">状态</span>
                  <Badge variant="outline">{work.status ? workStatusMap[work.status] || "未知" : "未知"}</Badge>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground text-sm">审核结果</span>
                  <span className="text-sm">
                    {work.review_result ? reviewResultMap[work.review_result] || "未知" : "待审核"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground text-sm">提交时间</span>
                  <span className="text-sm">{work.created_at ? new Date(work.created_at).toLocaleString("zh-CN") : "-"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground text-sm">审核时间</span>
                  <span className="text-sm">{work.review_at ? new Date(work.review_at).toLocaleString("zh-CN") : "-"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">作品内容</div>
                <div className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm">
                  {work.content || "无文字内容"}
                </div>
              </div>

              {imageUrls.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">图片素材</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {imageUrls.map((url, index) => (
                      <img
                        key={`${url}-${index}`}
                        src={url}
                        alt={`作品图片 ${index + 1}`}
                        className="h-40 w-full rounded-lg border object-cover bg-muted"
                      />
                    ))}
                  </div>
                </div>
              )}

              {videoItems.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">视频素材</div>
                  <div className="space-y-3">
                    {videoItems.map((item, index) => (
                      <video
                        key={`${item.src}-${index}`}
                        controls
                        src={item.src}
                        className="w-full max-h-96 rounded-lg border bg-black"
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>申诉原因</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap text-sm">{appeal.reason || "无"}</div>
        </CardContent>
      </Card>

      {appeal.result && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>处理结果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm">{appeal.result}</div>
          </CardContent>
        </Card>
      )}

      {appeal.status === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>处理申诉</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="handle-status">处理结果</Label>
              <div className="relative">
                <select
                  id="handle-status"
                  className="h-8 pl-3 pr-8 rounded-md border border-input bg-transparent text-sm appearance-none cursor-pointer hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 w-full"
                  value={handleStatus}
                  onChange={(e) => setHandleStatus(e.target.value)}
                >
                  <option value="accepted">通过申诉</option>
                  <option value="rejected">拒绝申诉</option>
                </select>
                <svg
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="handle-reply">回复说明</Label>
              <Textarea
                id="handle-reply"
                rows={4}
                placeholder="请输入处理说明..."
                value={handleReply}
                onChange={(e) => setHandleReply(e.target.value)}
              />
            </div>
            <Button onClick={handleSubmit} className="w-full">提交处理</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
