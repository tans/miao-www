"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, type AISettings } from "@/lib/api";
import { toast } from "sonner";

const EMPTY_FORM: AISettings = {
  ai_api_key: "",
  ai_api_endpoint: "",
  ai_model: "",
};

export function ModelConfig() {
  const [form, setForm] = useState<AISettings>(EMPTY_FORM);
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
      const res = await api.getAISettings();
      if (res.code === 0) {
        setForm({
          ai_api_key: res.data?.ai_api_key || "",
          ai_api_endpoint: res.data?.ai_api_endpoint || "",
          ai_model: res.data?.ai_model || "",
        });
      } else {
        setError(res.message || "加载失败");
      }
    } catch (e) {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }

  function updateField<K extends keyof AISettings>(key: K, value: AISettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    try {
      const payload: AISettings = {
        ai_api_key: form.ai_api_key.trim(),
        ai_api_endpoint: form.ai_api_endpoint.trim(),
        ai_model: form.ai_model.trim(),
      };
      const res = await api.updateAISettings(payload);
      if (res.code === 0) {
        toast.success("模型配置已保存");
        setForm({
          ai_api_key: res.data?.ai_api_key || payload.ai_api_key,
          ai_api_endpoint: res.data?.ai_api_endpoint || payload.ai_api_endpoint,
          ai_model: res.data?.ai_model || payload.ai_model,
        });
      } else {
        toast.error(res.message || "保存失败");
      }
    } catch (e) {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  }

  const hasApiKey = Boolean(form.ai_api_key.trim());

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">API Key</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <div className="font-medium">{hasApiKey ? "已配置" : "未配置"}</div>
            <Badge variant={hasApiKey ? "default" : "secondary"}>{hasApiKey ? "启用" : "待设置"}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">接口地址</CardTitle>
          </CardHeader>
          <CardContent className="text-sm font-mono break-all">
            {form.ai_api_endpoint || "默认后端配置"}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">模型</CardTitle>
          </CardHeader>
          <CardContent className="text-sm font-mono">
            {form.ai_model || "默认后端配置"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>模型配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">加载中...</div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <Input
                  type="password"
                  value={form.ai_api_key}
                  placeholder="sk-..."
                  onChange={(e) => updateField("ai_api_key", e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">接口地址</label>
                <Input
                  value={form.ai_api_endpoint}
                  placeholder="https://api.openai.com/v1/responses"
                  onChange={(e) => updateField("ai_api_endpoint", e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">模型名称</label>
                <Input
                  value={form.ai_model}
                  placeholder="gpt-4.1-mini"
                  onChange={(e) => updateField("ai_model", e.target.value)}
                  autoComplete="off"
                />
              </div>

              <Alert>
                <AlertDescription>
                  保存后会立即影响小程序“AI帮写”。留空时，后端仍会回退到环境变量配置。
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="outline" type="button" onClick={loadSettings} disabled={saving}>
                  重新加载
                </Button>
                <Button type="button" onClick={handleSave} disabled={saving}>
                  {saving ? "保存中..." : "保存配置"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
