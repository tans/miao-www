"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type SystemSettings as SystemSettingsData } from "@/lib/api";
import { toast } from "sonner";

const DEFAULT_HELP_CENTER_DOC_URL = "https://docs.qq.com/doc/DSGZhUG1YSmx2WUpR";

export function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettingsData | null>(null);
  const [helpCenterDocUrl, setHelpCenterDocUrl] = useState(DEFAULT_HELP_CENTER_DOC_URL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      window.location.href = "/admin/login";
      return;
    }

    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError("");

    try {
      const res = await api.getSettings();
      if (res.code === 0 && res.data) {
        setSettings(res.data);
        setHelpCenterDocUrl(res.data.help_center_doc_url || DEFAULT_HELP_CENTER_DOC_URL);
      } else {
        setError(res.message || "加载失败");
      }
    } catch (e) {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    const nextUrl = helpCenterDocUrl.trim();
    if (!nextUrl) {
      toast.error("请填写帮助中心腾讯文档链接");
      return;
    }
    if (!/^https:\/\/docs\.qq\.com\/doc\//.test(nextUrl)) {
      toast.error("链接格式应为 https://docs.qq.com/doc/...");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await api.updateSettings({
        help_center_doc_url: nextUrl,
      });
      if (res.code === 0) {
        toast.success("帮助中心链接已保存");
        const nextSettings = res.data || {
          ...(settings || {}),
          help_center_doc_url: nextUrl,
        } as SystemSettingsData;
        setSettings(nextSettings);
        setHelpCenterDocUrl(nextSettings.help_center_doc_url || nextUrl);
      } else {
        toast.error(res.message || "保存失败");
      }
    } catch (e) {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  }

  const previewUrl = helpCenterDocUrl.trim();

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>帮助中心</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">加载中...</div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="help-center-doc-url">腾讯文档链接</Label>
                <Input
                  id="help-center-doc-url"
                  value={helpCenterDocUrl}
                  placeholder={DEFAULT_HELP_CENTER_DOC_URL}
                  onChange={(e) => setHelpCenterDocUrl(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                小程序“我的 - 帮助中心”会读取这里的链接，并半屏打开腾讯文档小程序。
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <Button asChild variant="outline" type="button" disabled={!previewUrl}>
                  <a href={previewUrl || DEFAULT_HELP_CENTER_DOC_URL} target="_blank" rel="noreferrer">
                    预览文档
                  </a>
                </Button>
                <div className="flex items-center gap-3">
                  <Button variant="outline" type="button" onClick={loadSettings} disabled={saving}>
                    重新加载
                  </Button>
                  <Button type="button" onClick={handleSave} disabled={saving}>
                    {saving ? "保存中..." : "保存设置"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
