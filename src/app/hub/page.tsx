"use client";

import { startTransition, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import { formatDate } from "@/lib/utils";

type HubData = {
  digest: { trackingId: string; title: string; summary: string; updatedAt: string }[];
  impact: { trackingId: string; raised: string; actionTaken: string; changed: string }[];
  minutes: { id: string; title: string; quarter: string; uploadedAt: string; uploadedByName: string; fileName: string; url: string }[];
};

export default function HubPage() {
  const { user } = useAuth();
  const [hub, setHub] = useState<HubData | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  async function loadHub() {
    const response = await fetch("/api/hub");
    const data = await response.json();
    setHub(data);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/hub")
      .then((response) => response.json())
      .then((data) => {
        if (!active) {
          return;
        }
        startTransition(() => {
          setHub(data);
        });
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredMinutes = hub?.minutes.filter((item) => `${item.title} ${item.quarter}`.toLowerCase().includes(search.toLowerCase())) || [];

  async function handleMinuteUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch("/api/minutes", { method: "POST", body: formData });
    const data = await response.json();
    setMessage(response.ok ? `Uploaded ${data.minute.title}` : data.error || "Upload failed");
    if (response.ok) {
      form.reset();
      await loadHub();
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Public Hub"
        title="Share the follow-through"
        description="Use this page to publish what was raised, what changed, and the meeting records people usually end up asking for later."
      />

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Quarterly Digest</CardTitle>
            <CardDescription>Short write-ups that explain how a reported issue was handled.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hub?.digest.map((item) => (
              <article key={item.trackingId} className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">{item.trackingId}</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.summary}</p>
                <p className="mt-3 text-xs text-slate-500">{formatDate(item.updatedAt)}</p>
              </article>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Impact Tracking</CardTitle>
            <CardDescription>What was reported, what the team did, and what improved.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Tracking ID</th>
                    <th className="px-4 py-3">Raised</th>
                    <th className="px-4 py-3">Action Taken</th>
                    <th className="px-4 py-3">What Changed</th>
                  </tr>
                </thead>
                <tbody>
                  {hub?.impact.map((item) => (
                    <tr key={item.trackingId} className="border-t border-slate-200 bg-white align-top">
                      <td className="px-4 py-3 font-semibold text-slate-900">{item.trackingId}</td>
                      <td className="px-4 py-3 text-slate-600">{item.raised}</td>
                      <td className="px-4 py-3 text-slate-600">{item.actionTaken}</td>
                      <td className="px-4 py-3 text-slate-600">{item.changed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Minutes Archive</CardTitle>
          <CardDescription>Search uploaded meeting PDFs and keep the archive easy to browse.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input className="pl-10" placeholder="Search by title or quarter" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredMinutes.map((item) => (
              <a key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-emerald-400" href={item.url} target="_blank">
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600">{item.quarter}</p>
                <p className="mt-2 text-xs text-slate-500">{`${item.fileName} - uploaded by ${item.uploadedByName}`}</p>
              </a>
            ))}
          </div>

          {(user?.role === "secretariat" || user?.role === "admin") && (
            <form className="grid gap-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 md:grid-cols-4" onSubmit={handleMinuteUpload}>
              <div className="space-y-2">
                <Label htmlFor="title">Document title</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quarter">Quarter</Label>
                <Input id="quarter" name="quarter" placeholder="Q2 2026" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">PDF file</Label>
                <Input id="file" name="file" type="file" accept=".pdf" required />
              </div>
              <div className="flex items-end">
                <Button type="submit">Upload minutes</Button>
              </div>
              {message ? <p className="text-sm text-slate-700 md:col-span-4">{message}</p> : null}
            </form>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
