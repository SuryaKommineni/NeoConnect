"use client";

import { startTransition, useEffect, useState } from "react";
import { AlertTriangle, Clock3, FolderKanban, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { formatDate } from "@/lib/utils";
import type { ComplaintCase, Poll } from "@/lib/types";

type HubPayload = {
  digest: { trackingId: string; title: string; summary: string; updatedAt: string }[];
};

const emptyHub: HubPayload = {
  digest: [],
};

export default function OverviewPage() {
  const { user } = useAuth();
  const [cases, setCases] = useState<ComplaintCase[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [hub, setHub] = useState<HubPayload>(emptyHub);

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    Promise.all([fetch("/api/cases"), fetch("/api/polls"), fetch("/api/hub")]).then(async ([casesRes, pollsRes, hubRes]) => {
      const [casesData, pollsData, hubData] = await Promise.all([casesRes.json(), pollsRes.json(), hubRes.json()]);

      if (!active) {
        return;
      }

      startTransition(() => {
        setCases(Array.isArray(casesData.cases) ? casesData.cases : []);
        setPolls(Array.isArray(pollsData.polls) ? pollsData.polls : []);
        setHub({
          digest: Array.isArray(hubData.digest) ? hubData.digest : [],
        });
      });
    });

    return () => {
      active = false;
    };
  }, [user]);

  const openCases = cases.filter((caseItem) => ["New", "Assigned", "In Progress", "Pending", "Escalated"].includes(caseItem.status));
  const urgentCases = cases.filter((caseItem) => caseItem.severity === "High");

  return (
    <AppShell>
      <PageHeader
        eyebrow="Overview"
        title={`Welcome back, ${user?.name?.split(" ")[0] || "team"}`}
        description="Check what needs attention today, keep older cases moving, and make it easy for people to see that feedback is not disappearing into a void."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total cases</p>
              <p className="text-3xl font-semibold text-slate-900">{cases.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Open cases</p>
              <p className="text-3xl font-semibold text-slate-900">{openCases.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-2xl bg-rose-100 p-3 text-rose-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">High severity</p>
              <p className="text-3xl font-semibold text-slate-900">{urgentCases.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active polls</p>
              <p className="text-3xl font-semibold text-slate-900">{polls.length}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent cases</CardTitle>
            <CardDescription>Newest submissions and recent updates in one place.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {cases.slice(0, 5).map((caseItem) => (
              <div key={caseItem.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{caseItem.trackingId}</Badge>
                  <Badge className="bg-white">{caseItem.status}</Badge>
                  <Badge className="bg-white">{caseItem.department}</Badge>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{caseItem.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{caseItem.description}</p>
                <p className="mt-2 text-xs text-slate-500">Updated {formatDate(caseItem.updatedAt)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quarterly digest</CardTitle>
            <CardDescription>Recent examples you can share to show what changed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hub.digest.map((item) => (
              <div key={item.trackingId} className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{item.trackingId}</p>
                <h3 className="mt-2 text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{item.summary}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
