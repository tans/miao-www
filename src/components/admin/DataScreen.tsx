"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CircleDollarSign,
  Expand,
  RefreshCw,
  ShieldAlert,
  Users,
  WalletCards,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { api, type DashboardStats } from "@/lib/api";

type FinanceStats = {
  total_revenue: number;
  today_revenue: number;
  total_transactions: number;
};

type ScreenData = {
  stats: DashboardStats;
  finance: FinanceStats;
  exceptionTotal: number;
  userRoles: {
    creator: number;
    business: number;
    admin: number;
  };
  taskStatus: {
    pending: number;
    published: number;
    ongoing: number;
    completed: number;
    paused: number;
    cancelled: number;
  };
  claimStatus: {
    claimed: number;
    submitted: number;
    approved: number;
    cancelled: number;
    expired: number;
  };
  appealStatus: {
    pending: number;
    handled: number;
  };
  merchantAuth: {
    pending: number;
    approved: number;
    rejected: number;
  };
  withdrawStatus: {
    pending: number;
    success: number;
    rejected: number;
    processing: number;
    failed: number;
  };
  refreshedAt: string;
};

const REFRESH_INTERVAL = 120000;

const roleChartConfig = {
  creator: { label: "创作者", color: "#fb923c" },
  business: { label: "商家", color: "#38bdf8" },
  admin: { label: "管理员", color: "#facc15" },
} satisfies ChartConfig;

const taskChartConfig = {
  value: { label: "任务数", color: "#fb923c" },
} satisfies ChartConfig;

const claimChartConfig = {
  value: { label: "认领数", color: "#38bdf8" },
} satisfies ChartConfig;

const authChartConfig = {
  pending: { label: "待审核", color: "#f59e0b" },
  approved: { label: "已通过", color: "#34d399" },
  rejected: { label: "已拒绝", color: "#f87171" },
} satisfies ChartConfig;

const withdrawChartConfig = {
  pending: { label: "待审核", color: "#f59e0b" },
  success: { label: "成功", color: "#34d399" },
  rejected: { label: "拒绝", color: "#f87171" },
  processing: { label: "处理中", color: "#38bdf8" },
  failed: { label: "失败", color: "#fb7185" },
} satisfies ChartConfig;

function formatNumber(value?: number) {
  return new Intl.NumberFormat("zh-CN").format(value ?? 0);
}

function formatMoney(value?: number) {
  return `¥${(value ?? 0).toFixed(2)}`;
}

function formatPercent(part?: number, total?: number) {
  if (!total) return "0%";
  return `${((part ?? 0) / total * 100).toFixed(1)}%`;
}

function normalizeClaimTotal(data: unknown) {
  if (Array.isArray(data)) {
    return data.length;
  }

  if (data && typeof data === "object") {
    const payload = data as {
      total?: number;
      claims?: unknown[];
      data?: unknown[];
    };
    if (typeof payload.total === "number") {
      return payload.total;
    }
    return (payload.claims || payload.data || []).length;
  }

  return 0;
}

async function fetchTotal<T>(request: () => Promise<{ code: number; data: T }>, pickTotal: (data: T) => number) {
  try {
    const res = await request();
    if (res.code === 0) {
      return pickTotal(res.data);
    }
  } catch (_error) {
    return 0;
  }

  return 0;
}

async function loadScreenData() {
  const [
    statsRes,
    financeRes,
    creatorTotal,
    businessTotal,
    adminTotal,
    taskPending,
    taskPublished,
    taskOngoing,
    taskCompleted,
    taskPaused,
    taskCancelled,
    claimClaimed,
    claimSubmitted,
    claimApproved,
    claimCancelled,
    claimExpired,
    appealPending,
    appealHandled,
    merchantPending,
    merchantApproved,
    merchantRejected,
    withdrawPending,
    withdrawSuccess,
    withdrawRejected,
    withdrawProcessing,
    withdrawFailed,
    exceptionTotal,
  ] = await Promise.all([
    api.getStats(),
    api.getFinanceStats(),
    fetchTotal(() => api.getUsers({ page: 1, page_size: 1, role: "creator" }), (data) => data.total || 0),
    fetchTotal(() => api.getUsers({ page: 1, page_size: 1, role: "business" }), (data) => data.total || 0),
    fetchTotal(() => api.getUsers({ page: 1, page_size: 1, role: "admin" }), (data) => data.total || 0),
    fetchTotal(() => api.getTasks({ page: 1, page_size: 1, status: "pending" }), (data) => data.total || 0),
    fetchTotal(() => api.getTasks({ page: 1, page_size: 1, status: "published" }), (data) => data.total || 0),
    fetchTotal(() => api.getTasks({ page: 1, page_size: 1, status: "ongoing" }), (data) => data.total || 0),
    fetchTotal(() => api.getTasks({ page: 1, page_size: 1, status: "completed" }), (data) => data.total || 0),
    fetchTotal(() => api.getTasks({ page: 1, page_size: 1, status: "paused" }), (data) => data.total || 0),
    fetchTotal(() => api.getTasks({ page: 1, page_size: 1, status: "cancelled" }), (data) => data.total || 0),
    fetchTotal(() => api.getClaims({ page: 1, page_size: 1, status: 1 }), normalizeClaimTotal),
    fetchTotal(() => api.getClaims({ page: 1, page_size: 1, status: 2 }), normalizeClaimTotal),
    fetchTotal(() => api.getClaims({ page: 1, page_size: 1, status: 3 }), normalizeClaimTotal),
    fetchTotal(() => api.getClaims({ page: 1, page_size: 1, status: 4 }), normalizeClaimTotal),
    fetchTotal(() => api.getClaims({ page: 1, page_size: 1, status: 5 }), normalizeClaimTotal),
    fetchTotal(() => api.getAppeals({ page: 1, page_size: 1, status: 1 }), (data) => data.total || 0),
    fetchTotal(() => api.getAppeals({ page: 1, page_size: 1, status: 2 }), (data) => data.total || 0),
    fetchTotal(() => api.getMerchantAuthApplications({ page: 1, page_size: 1, status: "pending" }), (data) => data.total || 0),
    fetchTotal(() => api.getMerchantAuthApplications({ page: 1, page_size: 1, status: "approved" }), (data) => data.total || 0),
    fetchTotal(() => api.getMerchantAuthApplications({ page: 1, page_size: 1, status: "rejected" }), (data) => data.total || 0),
    fetchTotal(() => api.getWithdrawOrders({ page: 1, page_size: 1, status: 1 }), (data) => data.total || 0),
    fetchTotal(() => api.getWithdrawOrders({ page: 1, page_size: 1, status: 2 }), (data) => data.total || 0),
    fetchTotal(() => api.getWithdrawOrders({ page: 1, page_size: 1, status: 3 }), (data) => data.total || 0),
    fetchTotal(() => api.getWithdrawOrders({ page: 1, page_size: 1, status: 4 }), (data) => data.total || 0),
    fetchTotal(() => api.getWithdrawOrders({ page: 1, page_size: 1, status: 5 }), (data) => data.total || 0),
    fetchTotal(() => api.getExceptionReports({ page: 1, page_size: 1 }), (data) => data.total || 0),
  ]);

  if (statsRes.code !== 0) {
    throw new Error(statsRes.message || "关键数据加载失败");
  }

  return {
    stats: statsRes.data,
    finance: financeRes.code === 0 ? financeRes.data : {
      total_revenue: statsRes.data.total_revenue || 0,
      today_revenue: statsRes.data.today_revenue || 0,
      total_transactions: 0,
    },
    exceptionTotal,
    userRoles: {
      creator: creatorTotal,
      business: businessTotal,
      admin: adminTotal,
    },
    taskStatus: {
      pending: taskPending,
      published: taskPublished,
      ongoing: taskOngoing,
      completed: taskCompleted,
      paused: taskPaused,
      cancelled: taskCancelled,
    },
    claimStatus: {
      claimed: claimClaimed,
      submitted: claimSubmitted,
      approved: claimApproved,
      cancelled: claimCancelled,
      expired: claimExpired,
    },
    appealStatus: {
      pending: appealPending,
      handled: appealHandled,
    },
    merchantAuth: {
      pending: merchantPending,
      approved: merchantApproved,
      rejected: merchantRejected,
    },
    withdrawStatus: {
      pending: withdrawPending,
      success: withdrawSuccess,
      rejected: withdrawRejected,
      processing: withdrawProcessing,
      failed: withdrawFailed,
    },
    refreshedAt: new Date().toISOString(),
  } satisfies ScreenData;
}

function SummaryMetric({
  title,
  value,
  hint,
  icon,
}: {
  title: string;
  value: string;
  hint: string;
  icon: ReactNode;
}) {
  return (
    <Card className="border border-white/10 bg-white/6 py-0 text-white ring-0 backdrop-blur">
      <CardContent className="flex items-center justify-between px-5 py-5">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-white/45">{title}</p>
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
          <p className="text-sm text-white/60">{hint}</p>
        </div>
        <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-[#ffd166]">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

export function DataScreen() {
  const [data, setData] = useState<ScreenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      window.location.href = "/admin/login";
      return;
    }

    let active = true;

    async function refresh(background = false) {
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const nextData = await loadScreenData();
        if (!active) return;
        setData(nextData);
        setError("");
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : "加载失败，请稍后重试";
        setError(message);
      } finally {
        if (!active) return;
        setLoading(false);
        setRefreshing(false);
      }
    }

    refresh();
    const interval = window.setInterval(() => refresh(true), REFRESH_INTERVAL);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  function handleFullScreen() {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen();
      return;
    }

    void document.exitFullscreen();
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07101d] px-6 text-white">
        <div className="space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.4em] text-[#7dd3fc]">Creative Miao</p>
          <h1 className="text-4xl font-semibold">产品数据大屏加载中</h1>
          <p className="text-white/60">正在汇总用户、任务、资金与风控数据...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07101d] px-6 text-white">
        <Card className="max-w-md border border-red-400/20 bg-white/6 py-0 ring-0">
          <CardContent className="space-y-3 px-6 py-6 text-center">
            <p className="text-lg font-semibold">关键数据暂时无法加载</p>
            <p className="text-sm text-white/70">{error || "请刷新页面后重试"}</p>
            <Button onClick={() => window.location.reload()}>重新加载</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleData = [
    { key: "creator", name: "创作者", value: data.userRoles.creator, fill: "var(--color-creator)" },
    { key: "business", name: "商家", value: data.userRoles.business, fill: "var(--color-business)" },
    { key: "admin", name: "管理员", value: data.userRoles.admin, fill: "var(--color-admin)" },
  ];

  const taskData = [
    { label: "待审核", value: data.taskStatus.pending },
    { label: "已上架", value: data.taskStatus.published },
    { label: "进行中", value: data.taskStatus.ongoing },
    { label: "已结束", value: data.taskStatus.completed },
    { label: "已暂停", value: data.taskStatus.paused },
    { label: "已取消", value: data.taskStatus.cancelled },
  ];

  const claimData = [
    { label: "已认领", value: data.claimStatus.claimed },
    { label: "已提交", value: data.claimStatus.submitted },
    { label: "已验收", value: data.claimStatus.approved },
    { label: "已取消", value: data.claimStatus.cancelled },
    { label: "已超时", value: data.claimStatus.expired },
  ];

  const authData = [
    { key: "pending", name: "待审核", value: data.merchantAuth.pending, fill: "var(--color-pending)" },
    { key: "approved", name: "已通过", value: data.merchantAuth.approved, fill: "var(--color-approved)" },
    { key: "rejected", name: "已拒绝", value: data.merchantAuth.rejected, fill: "var(--color-rejected)" },
  ];

  const withdrawData = [
    { key: "pending", label: "待审核", value: data.withdrawStatus.pending, fill: "var(--color-pending)" },
    { key: "success", label: "成功", value: data.withdrawStatus.success, fill: "var(--color-success)" },
    { key: "rejected", label: "拒绝", value: data.withdrawStatus.rejected, fill: "var(--color-rejected)" },
    { key: "processing", label: "处理中", value: data.withdrawStatus.processing, fill: "var(--color-processing)" },
    { key: "failed", label: "失败", value: data.withdrawStatus.failed, fill: "var(--color-failed)" },
  ];

  const pendingWorkload =
    data.stats.pending_tasks +
    data.appealStatus.pending +
    data.merchantAuth.pending +
    data.withdrawStatus.pending;

  const insights = [
    `规模层面：当前共有 ${formatNumber(data.stats.total_users)} 名用户，其中创作者占 ${formatPercent(data.userRoles.creator, data.stats.total_users)}，商家占 ${formatPercent(data.userRoles.business, data.stats.total_users)}。`,
    `效率层面：任务活跃率为 ${formatPercent(data.stats.active_tasks, data.stats.total_tasks)}，已验收认领 ${formatNumber(data.claimStatus.approved)} 单，认领到交付转化约 ${formatPercent(data.stats.total_works, data.stats.total_claims)}。`,
    `资金层面：累计收入 ${formatMoney(data.finance.total_revenue)}，今日收入 ${formatMoney(data.finance.today_revenue)}，总交易额 ${formatMoney(data.stats.total_transaction_amount)}。`,
    `风险层面：当前待处理工作量 ${formatNumber(pendingWorkload)} 项，包含待审任务 ${formatNumber(data.stats.pending_tasks)}、待处理申诉 ${formatNumber(data.appealStatus.pending)}、待审提现 ${formatNumber(data.withdrawStatus.pending)}，系统异常共 ${formatNumber(data.exceptionTotal)} 条。`,
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#152d4d_0%,#091221_48%,#050b14_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1920px] flex-col gap-6 px-5 py-5 xl:px-8">
        <header className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/6 px-6 py-5 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Badge className="bg-[#1d4ed8]/30 text-[#93c5fd]">Creative Miao</Badge>
              <Badge variant="outline" className="border-white/15 bg-transparent text-white/65">
                独立全屏页面
              </Badge>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">创意喵产品数据大屏</h1>
            <p className="text-sm text-white/60 md:text-base">
              围绕产品规模、任务流转、资金健康和风控压力做展示，适合单独打开后进入浏览器全屏。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Last Refresh</p>
              <p className="mt-1 text-sm text-white/80">
                {new Date(data.refreshedAt).toLocaleString("zh-CN")}
              </p>
            </div>
            <Button
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`} />
              刷新
            </Button>
            <Button
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={handleFullScreen}
            >
              <Expand className="mr-2 size-4" />
              全屏
            </Button>
            <Button
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={() => {
                window.location.href = "/admin";
              }}
            >
              返回后台
            </Button>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryMetric
            title="用户规模"
            value={formatNumber(data.stats.total_users)}
            hint={`创作者占比 ${formatPercent(data.userRoles.creator, data.stats.total_users)}`}
            icon={<Users className="size-5" />}
          />
          <SummaryMetric
            title="任务活跃"
            value={formatNumber(data.stats.active_tasks)}
            hint={`总任务 ${formatNumber(data.stats.total_tasks)}，活跃率 ${formatPercent(data.stats.active_tasks, data.stats.total_tasks)}`}
            icon={<Activity className="size-5" />}
          />
          <SummaryMetric
            title="资金表现"
            value={formatMoney(data.finance.total_revenue)}
            hint={`今日收入 ${formatMoney(data.finance.today_revenue)}`}
            icon={<CircleDollarSign className="size-5" />}
          />
          <SummaryMetric
            title="风险压力"
            value={formatNumber(pendingWorkload)}
            hint={`异常 ${formatNumber(data.exceptionTotal)} · 待处理申诉 ${formatNumber(data.appealStatus.pending)}`}
            icon={<ShieldAlert className="size-5" />}
          />
        </section>

        <section className="grid flex-1 gap-4 xl:grid-cols-[1.05fr_1.2fr_1.05fr]">
          <div className="grid gap-4">
            <Card className="border border-white/10 bg-white/6 py-0 text-white ring-0 backdrop-blur">
              <CardHeader className="pb-1 pt-5">
                <CardTitle>用户角色分布</CardTitle>
              </CardHeader>
              <CardContent className="pb-5">
                <ChartContainer config={roleChartConfig} className="h-[280px]">
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent formatter={(value) => formatNumber(Number(value))} />}
                    />
                    <Pie
                      data={roleData}
                      dataKey="value"
                      nameKey="key"
                      innerRadius={60}
                      outerRadius={92}
                      paddingAngle={4}
                    >
                      {roleData.map((entry) => (
                        <Cell key={entry.key} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent className="pt-2 text-white/70" />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-white/6 py-0 text-white ring-0 backdrop-blur">
              <CardHeader className="pb-1 pt-5">
                <CardTitle>任务状态分析</CardTitle>
              </CardHeader>
              <CardContent className="pb-5">
                <ChartContainer config={taskChartConfig} className="h-[300px]">
                  <BarChart data={taskData} layout="vertical" margin={{ left: 16, right: 16 }}>
                    <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.08)" />
                    <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "rgba(255,255,255,0.55)" }} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      width={56}
                      tick={{ fill: "rgba(255,255,255,0.7)" }}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel formatter={(value) => formatNumber(Number(value))} />}
                    />
                    <Bar dataKey="value" radius={10} fill="var(--color-value)" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4">
            <Card className="border border-white/10 bg-white/6 py-0 text-white ring-0 backdrop-blur">
              <CardHeader className="pb-1 pt-5">
                <CardTitle>关键经营指标</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 pb-5 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">总认领数</p>
                  <p className="mt-3 text-3xl font-semibold">{formatNumber(data.stats.total_claims)}</p>
                  <p className="mt-2 text-sm text-white/60">已验收 {formatNumber(data.claimStatus.approved)} 单</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">总作品数</p>
                  <p className="mt-3 text-3xl font-semibold">{formatNumber(data.stats.total_works)}</p>
                  <p className="mt-2 text-sm text-white/60">交付转化 {formatPercent(data.stats.total_works, data.stats.total_claims)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">总交易笔数</p>
                  <p className="mt-3 text-3xl font-semibold">{formatNumber(data.finance.total_transactions)}</p>
                  <p className="mt-2 text-sm text-white/60">总交易额 {formatMoney(data.stats.total_transaction_amount)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">待处理申诉</p>
                  <p className="mt-3 text-3xl font-semibold">{formatNumber(data.appealStatus.pending)}</p>
                  <p className="mt-2 text-sm text-white/60">已处理 {formatNumber(data.appealStatus.handled)} 单</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-white/6 py-0 text-white ring-0 backdrop-blur">
              <CardHeader className="pb-1 pt-5">
                <CardTitle>认领到交付流转</CardTitle>
              </CardHeader>
              <CardContent className="pb-5">
                <ChartContainer config={claimChartConfig} className="h-[320px]">
                  <BarChart data={claimData} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "rgba(255,255,255,0.7)" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "rgba(255,255,255,0.55)" }} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent formatter={(value) => formatNumber(Number(value))} />}
                    />
                    <Bar dataKey="value" radius={12} fill="var(--color-value)" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-white/6 py-0 text-white ring-0 backdrop-blur">
              <CardHeader className="pb-1 pt-5">
                <CardTitle>关键数据分析</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 pb-5">
                {insights.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm leading-6 text-white/75">
                    {item}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4">
            <Card className="border border-white/10 bg-white/6 py-0 text-white ring-0 backdrop-blur">
              <CardHeader className="pb-1 pt-5">
                <CardTitle>商家认证状态</CardTitle>
              </CardHeader>
              <CardContent className="pb-5">
                <ChartContainer config={authChartConfig} className="h-[280px]">
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent formatter={(value) => formatNumber(Number(value))} />}
                    />
                    <Pie
                      data={authData}
                      dataKey="value"
                      nameKey="key"
                      innerRadius={58}
                      outerRadius={90}
                      paddingAngle={4}
                    >
                      {authData.map((entry) => (
                        <Cell key={entry.key} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent className="pt-2 text-white/70" />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-white/6 py-0 text-white ring-0 backdrop-blur">
              <CardHeader className="pb-1 pt-5">
                <CardTitle>提现审核状态</CardTitle>
              </CardHeader>
              <CardContent className="pb-5">
                <ChartContainer config={withdrawChartConfig} className="h-[300px]">
                  <BarChart data={withdrawData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "rgba(255,255,255,0.7)" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "rgba(255,255,255,0.55)" }} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent formatter={(value) => formatNumber(Number(value))} />}
                    />
                    <Bar dataKey="value" radius={10}>
                      {withdrawData.map((entry) => (
                        <Cell key={entry.key} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-white/6 py-0 text-white ring-0 backdrop-blur">
              <CardHeader className="pb-1 pt-5">
                <CardTitle>风险与待办</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 pb-5">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/15 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
                      <AlertTriangle className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm text-white/80">待审核任务</p>
                      <p className="text-xs text-white/45">影响任务发布效率</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold">{formatNumber(data.stats.pending_tasks)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/15 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-300">
                      <WalletCards className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm text-white/80">待审核提现</p>
                      <p className="text-xs text-white/45">影响资金结算体验</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold">{formatNumber(data.withdrawStatus.pending)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/15 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-rose-400/15 text-rose-300">
                      <ShieldAlert className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm text-white/80">待处理申诉</p>
                      <p className="text-xs text-white/45">影响争议闭环效率</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold">{formatNumber(data.appealStatus.pending)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/15 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-red-400/15 text-red-300">
                      <AlertTriangle className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm text-white/80">系统异常数</p>
                      <p className="text-xs text-white/45">影响稳定性与响应效率</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold">{formatNumber(data.exceptionTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
