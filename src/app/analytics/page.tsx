"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";

type AnalyticsData = {
  summary: {
    totalCases: number;
    openCases: number;
    escalatedCases: number;
    resolvedCases: number;
  };
  byDepartment: { department: string; count: number }[];
  byStatus: { status: string; count: number }[];
  byCategory: { category: string; count: number }[];
  hotspots: { department: string; category: string; count: number }[];
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    if (user?.role === "secretariat" || user?.role === "admin") {
      void fetch("/api/analytics")
        .then((response) => response.json())
        .then((data) => setAnalytics(data));
    }
  }, [user?.role]);

  if (user?.role !== "secretariat" && user?.role !== "admin") {
    return (
      <AppShell>
        <PageHeader eyebrow="Analytics" title="Restricted dashboard" description="The analytics dashboard is reserved for Secretariat and Admin users because it combines management-level visibility across departments." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Analytics"
        title="Spot recurring issues before they spread"
        description="Track open case concentrations by department, review case distribution across status and category, and flag hotspots when the same department-category pairing reaches five or more cases."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total cases" value={analytics?.summary.totalCases || 0} />
        <MetricCard label="Open cases" value={analytics?.summary.openCases || 0} />
        <MetricCard label="Escalated cases" value={analytics?.summary.escalatedCases || 0} />
        <MetricCard label="Resolved cases" value={analytics?.summary.resolvedCases || 0} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Open cases by department"
          description="Departments with the largest number of open cases appear tallest."
          data={analytics?.byDepartment || []}
          dataKey="count"
          xKey="department"
          fill="#16a34a"
        />
        <ChartCard
          title="Case counts by status"
          description="Current pipeline spread across New, Assigned, In Progress, Pending, Resolved, and Escalated."
          data={analytics?.byStatus || []}
          dataKey="count"
          xKey="status"
          fill="#0284c7"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartCard
          title="Case counts by category"
          description="Understand whether safety, policy, facilities, HR, or other concerns are dominating."
          data={analytics?.byCategory || []}
          dataKey="count"
          xKey="category"
          fill="#f59e0b"
        />

        <Card>
          <CardHeader>
            <CardTitle>Hotspot flagging</CardTitle>
            <CardDescription>If five or more open cases share the same department and category, highlight it here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics?.hotspots.length ? (
              analytics.hotspots.map((hotspot) => (
                <div key={`${hotspot.department}-${hotspot.category}`} className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-sm font-semibold text-rose-700">
                    {hotspot.department} · {hotspot.category}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{hotspot.count} open cases require management attention.</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-slate-700">No hotspots have reached the 5-case threshold in the current dataset.</div>
            )}
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  description,
  data,
  dataKey,
  xKey,
  fill,
}: {
  title: string;
  description: string;
  data: Record<string, string | number>[];
  dataKey: string;
  xKey: string;
  fill: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xKey} tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey={dataKey} fill={fill} radius={[12, 12, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

