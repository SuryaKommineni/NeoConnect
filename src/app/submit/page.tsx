"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/auth-provider";

const categories = ["Safety", "Policy", "Facilities", "HR", "Other"];
const severities = ["Low", "Medium", "High"];

export default function SubmitPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (user?.role === "caseManager") {
    return (
      <AppShell>
        <PageHeader eyebrow="Submission" title="Submission form unavailable" description="Case managers do not create new staff complaints in this demo. Switch to a staff, secretariat, or admin account to test the full submission flow." />
      </AppShell>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const response = await fetch("/api/cases", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.error || "Submission failed");
      return;
    }

    form.reset();
    setMessage(`Complaint submitted successfully. Tracking ID: ${data.case.trackingId}`);
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Submission"
        title="Raise feedback or a complaint"
        description="Submit concerns safely, attach evidence, and generate a unique tracking ID that follows the case through assignment, response, and closure."
      />

      <Card>
        <CardContent className="p-6">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" placeholder="Summarise the issue" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" placeholder="Describe what happened and any context that helps management act quickly." required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select id="category" name="category" defaultValue="Safety">
                {categories.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input id="department" name="department" defaultValue={user?.department || ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" placeholder="Office, site, or area" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select id="severity" name="severity" defaultValue="Medium">
                {severities.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="attachment">Attachment</Label>
              <Input id="attachment" name="attachment" type="file" accept=".pdf,image/*" />
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4">
              <input id="isAnonymous" name="isAnonymous" type="checkbox" value="true" className="h-4 w-4 rounded border-slate-300" />
              <Label htmlFor="isAnonymous">Submit anonymously</Label>
            </div>
            <div className="md:col-span-2">
              <Button disabled={loading} type="submit">
                {loading ? "Submitting..." : "Submit to NeoConnect"}
              </Button>
            </div>
            {message ? <p className="md:col-span-2 text-sm text-slate-700">{message}</p> : null}
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}

