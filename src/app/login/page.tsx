"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";

const demoAccounts = [
  { role: "Staff", email: "staff@neoconnect.local", password: "password123" },
  { role: "Secretariat", email: "secretariat@neoconnect.local", password: "password123" },
  { role: "Case Manager", email: "manager@neoconnect.local", password: "password123" },
  { role: "Admin", email: "admin@neoconnect.local", password: "password123" },
];

type AuthMode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState(demoAccounts[0].email);
  const [password, setPassword] = useState(demoAccounts[0].password);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const endpoint = mode === "signin" ? "/api/auth/login" : "/api/auth/register";
    const payload =
      mode === "signin"
        ? { email, password }
        : {
            name,
            department,
            email,
            password,
          };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || (mode === "signin" ? "Login failed" : "Could not create account"));
      setLoading(false);
      return;
    }

    if (mode === "signup") {
      setSuccess("Account created. You're signed in now.");
    }

    await refreshUser();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.2),_transparent_24%),linear-gradient(135deg,#022c22_0%,#f0fdf4_52%,#f8fafc_100%)] px-4 py-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[36px] border border-white/20 bg-slate-950/85 p-8 text-white shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Internal Workspace</p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight">A calmer way to handle complaints, suggestions, polls, and follow-up.</h1>
          <p className="mt-5 max-w-2xl text-base text-slate-300">
            NeoConnect gives teams one place to log staff concerns, track ownership, publish updates, and keep routine committee work from turning into inbox chaos.
          </p>
        </div>

        <Card className="border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle>{mode === "signin" ? "Sign in" : "Create account"}</CardTitle>
            <CardDescription>
              {mode === "signin"
                ? "Use an existing account to open the workspace."
                : "Create a new staff account and start using the workspace right away."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
              <button
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${mode === "signin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
                onClick={() => {
                  setMode("signin");
                  setError("");
                  setSuccess("");
                }}
                type="button"
              >
                Sign in
              </button>
              <button
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
                onClick={() => {
                  setMode("signup");
                  setEmail("");
                  setPassword("");
                  setError("");
                  setSuccess("");
                }}
                type="button"
              >
                Create account
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {mode === "signup" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input id="department" value={department} onChange={(event) => setDepartment(event.target.value)} />
                  </div>
                </>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
              {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              <Button className="w-full" disabled={loading} type="submit">
                {loading ? (mode === "signin" ? "Signing in..." : "Creating account...") : mode === "signin" ? "Open workspace" : "Create account"}
              </Button>
            </form>

            {mode === "signin" ? (
              <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">Demo accounts</p>
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:border-emerald-400"
                    onClick={() => {
                      setEmail(account.email);
                      setPassword(account.password);
                      setError("");
                      setSuccess("");
                    }}
                    type="button"
                  >
                    <span>{account.role}</span>
                    <span className="text-slate-500">{account.email}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                New accounts are added to the current app store and can sign in immediately with the email and password you choose.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
