"use client";

import { startTransition, useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import type { Poll } from "@/lib/types";

const chartColors = ["#16a34a", "#0284c7", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function PollsPage() {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [message, setMessage] = useState("");

  async function loadPolls() {
    const response = await fetch("/api/polls");
    const data = await response.json();
    setPolls(data.polls || []);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/polls")
      .then((response) => response.json())
      .then((data) => {
        if (!active) {
          return;
        }
        startTransition(() => {
          setPolls(data.polls || []);
        });
      });

    return () => {
      active = false;
    };
  }, []);

  async function vote(pollId: string, optionId: string) {
    const response = await fetch(`/api/polls/${pollId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId }),
    });
    const data = await response.json();
    setMessage(response.ok ? "Vote recorded." : data.error || "Unable to vote");
    await loadPolls();
  }

  async function createPoll(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const options = String(formData.get("options"))
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean);

    const response = await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: formData.get("question"),
        options,
      }),
    });
    const data = await response.json();
    setMessage(response.ok ? `Created poll: ${data.poll.question}` : data.error || "Unable to create poll");
    if (response.ok) {
      form.reset();
      await loadPolls();
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Polling"
        title="Run quick pulse checks"
        description="Create a simple poll, let each person vote once, and keep the result visible without turning it into a full survey project."
      />

      {(user?.role === "secretariat" || user?.role === "admin") && (
        <Card>
          <CardHeader>
            <CardTitle>Create poll</CardTitle>
            <CardDescription>Enter one question and put each option on its own line.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto]" onSubmit={createPoll}>
              <div className="space-y-2">
                <Label htmlFor="question">Question</Label>
                <Input id="question" name="question" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="options">Options</Label>
                <textarea id="options" name="options" className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" placeholder={"Option A\nOption B\nOption C"} required />
              </div>
              <div className="flex items-end">
                <Button type="submit">Publish poll</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {message ? <p className="text-sm text-slate-700">{message}</p> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        {polls.map((poll) => {
          const hasVoted = user ? poll.voters.includes(user.id) : false;
          return (
            <Card key={poll.id}>
              <CardHeader>
                <CardTitle>{poll.question}</CardTitle>
                <CardDescription>Created by {poll.createdByName}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-[1fr_220px]">
                <div className="space-y-3">
                  {poll.options.map((option) => (
                    <button
                      key={option.id}
                      className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                      disabled={hasVoted}
                      onClick={() => void vote(poll.id, option.id)}
                      type="button"
                    >
                      <span className="font-medium text-slate-800">{option.label}</span>
                      <span className="text-sm text-slate-500">{option.votes} votes</span>
                    </button>
                  ))}
                </div>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={poll.options} dataKey="votes" nameKey="label" outerRadius={80}>
                        {poll.options.map((option, index) => (
                          <Cell key={option.id} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
