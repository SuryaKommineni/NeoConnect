"use client";

import { startTransition, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/auth-provider";
import { formatDate } from "@/lib/utils";
import type { ComplaintCase } from "@/lib/types";

type Manager = { id: string; name: string };

export default function CasesPage() {
  const { user } = useAuth();
  const [cases, setCases] = useState<ComplaintCase[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [noteText, setNoteText] = useState<Record<string, string>>({});

  async function loadData() {
    const [casesRes, usersRes] = await Promise.all([
      fetch("/api/cases"),
      user?.role === "secretariat" || user?.role === "admin" ? fetch("/api/users") : Promise.resolve(null),
    ]);

    const casesData = await casesRes.json();
    setCases(casesData.cases || []);

    if (usersRes) {
      const usersData = await usersRes.json();
      setManagers(usersData.users || []);
    }
  }

  useEffect(() => {
    let active = true;
    const shouldLoadManagers = user?.role === "secretariat" || user?.role === "admin";

    Promise.all([fetch("/api/cases"), shouldLoadManagers ? fetch("/api/users") : Promise.resolve(null)]).then(async ([casesRes, usersRes]) => {
      const casesData = await casesRes.json();
      const usersData = usersRes ? await usersRes.json() : { users: [] };

      if (!active) {
        return;
      }

      startTransition(() => {
        setCases(casesData.cases || []);
        setManagers(usersData.users || []);
      });
    });

    return () => {
      active = false;
    };
  }, [user?.role]);

  async function assignCase(caseId: string, assignedToId: string) {
    await fetch(`/api/cases/${caseId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId }),
    });
    await loadData();
  }

  async function updateStatus(caseId: string, status: ComplaintCase["status"]) {
    await fetch(`/api/cases/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadData();
  }

  async function addNote(caseId: string) {
    if (!noteText[caseId]) {
      return;
    }
    await fetch(`/api/cases/${caseId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteText[caseId] }),
    });
    setNoteText((current) => ({ ...current, [caseId]: "" }));
    await loadData();
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Case Management"
        title="Manage every complaint lifecycle"
        description="Secretariat can assign incoming cases, case managers can respond and update statuses, and the 7-working-day escalation rule stays visible on overdue items."
      />

      <div className="space-y-5">
        {cases.map((caseItem) => (
          <Card key={caseItem.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{caseItem.trackingId}</Badge>
                <Badge className="bg-white">{caseItem.status}</Badge>
                <Badge className="bg-white">{caseItem.category}</Badge>
                <Badge className="bg-white">{caseItem.department}</Badge>
              </div>
              <CardTitle className="mt-3">{caseItem.title}</CardTitle>
              <CardDescription>{caseItem.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Submitter</p>
                  <p className="mt-2 text-sm font-medium text-slate-800">{caseItem.submitterName}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Assigned to</p>
                  <p className="mt-2 text-sm font-medium text-slate-800">{caseItem.assignedToName || "Unassigned"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Severity</p>
                  <p className="mt-2 text-sm font-medium text-slate-800">{caseItem.severity}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Updated</p>
                  <p className="mt-2 text-sm font-medium text-slate-800">{formatDate(caseItem.updatedAt)}</p>
                </div>
              </div>

              {(user?.role === "secretariat" || user?.role === "admin") && managers.length > 0 ? (
                <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                  <Select defaultValue={caseItem.assignedToId || ""} onChange={(event) => void assignCase(caseItem.id, event.target.value)}>
                    <option value="">Assign a case manager</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name}
                      </option>
                    ))}
                  </Select>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Assigned at: {caseItem.assignedAt ? formatDate(caseItem.assignedAt) : "Not yet assigned"}
                  </div>
                </div>
              ) : null}

              {(user?.role === "caseManager" || user?.role === "secretariat" || user?.role === "admin") && (
                <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={caseItem.status} onChange={(event) => void updateStatus(caseItem.id, event.target.value as ComplaintCase["status"])}>
                      {["New", "Assigned", "In Progress", "Pending", "Resolved", "Escalated"].map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Add case note</Label>
                    <div className="flex gap-2">
                      <Input value={noteText[caseItem.id] || ""} onChange={(event) => setNoteText((current) => ({ ...current, [caseItem.id]: event.target.value }))} placeholder="Record progress, response, or closure context" />
                      <Button type="button" onClick={() => void addNote(caseItem.id)}>
                        Save note
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {(user?.role === "caseManager" || user?.role === "secretariat" || user?.role === "admin") ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Resolution summary</Label>
                    <Textarea defaultValue={caseItem.resolutionSummary || ""} onBlur={(event) => void fetch(`/api/cases/${caseItem.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resolutionSummary: event.target.value }) }).then(loadData)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Action taken</Label>
                    <Textarea defaultValue={caseItem.actionTaken || ""} onBlur={(event) => void fetch(`/api/cases/${caseItem.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actionTaken: event.target.value }) }).then(loadData)} />
                  </div>
                  <div className="space-y-2">
                    <Label>What changed</Label>
                    <Textarea defaultValue={caseItem.impactChange || ""} onBlur={(event) => void fetch(`/api/cases/${caseItem.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ impactChange: event.target.value }) }).then(loadData)} />
                  </div>
                </div>
              ) : null}

              {caseItem.notes.length > 0 ? (
                <div className="space-y-2">
                  <Label>Response log</Label>
                  {caseItem.notes.map((note) => (
                    <div key={note.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm text-slate-800">{note.body}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {note.authorName} · {formatDate(note.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
