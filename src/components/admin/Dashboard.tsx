"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

interface DashboardStats {
  total_users: number;
  total_tasks: number;
  active_tasks: number;
  total_works: number;
  pending_tasks: number;
  pending_appeals: number;
  total_revenue: number;
  today_revenue: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      window.location.href = "/admin/login";
      return;
    }

    api.getDashboard().then((res) => {
      if (res.code === 0) {
        setStats(res.data);
      } else {
        setError(res.message);
      }
    }).catch(() => {
      setError("加载失败，请刷新页面");
    });
  }, []);

  if (error) {
    return (
      <div className="text-destructive text-sm p-4">
        {error}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        加载中...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-normal text-muted-foreground">总用户数</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_users}</div>
          <p className="text-xs text-muted-foreground">人</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-normal text-muted-foreground">总任务数</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_tasks}</div>
          <p className="text-xs text-muted-foreground">个</p>
        </CardContent>
      </Card>

      <Card className="border-primary/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-normal text-muted-foreground">进行中任务</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{stats.active_tasks}</div>
          <p className="text-xs text-muted-foreground">个</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-normal text-muted-foreground">总作品数</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_works}</div>
          <p className="text-xs text-muted-foreground">个</p>
        </CardContent>
      </Card>

      <Card className="border-yellow-500/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-normal text-muted-foreground">待审核任务</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending_tasks}</div>
          <p className="text-xs text-muted-foreground">个</p>
        </CardContent>
      </Card>

      <Card className="border-orange-500/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-normal text-muted-foreground">待处理申诉</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{stats.pending_appeals}</div>
          <p className="text-xs text-muted-foreground">个</p>
        </CardContent>
      </Card>

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
    </div>
  );
}