import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

// Public route: no auth wrapper. Per CLAUDE.md §6 the matching RLS
// policy on Lovable must allow anonymous INSERT into `contacts` for
// the gallery resolved from the ?gallery= query parameter.
export default function PublicSignup() {
  const [params] = useSearchParams();
  const gallery_id = params.get("gallery") ?? "";
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [interest, setInterest] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gallery_id) {
      toast.error("Missing gallery in link.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("contacts").insert({
        id: crypto.randomUUID(),
        gallery_id,
        email,
        full_name: fullName,
        interest: interest || null,
        newsletter_opt_in: optIn,
      });
      if (error) throw error;
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-8">
        <header>
          <h1 className="text-5xl font-bold uppercase leading-[0.9] tracking-tight md:text-6xl">
            <span className="block">Your</span>
            <span className="block">Gallery</span>
            <span className="block text-accent-red">Manager</span>
          </h1>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            By Yusto{" "}
            <span aria-hidden className="text-accent-red">/</span> Giner
          </p>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Stay in touch</CardTitle>
            <CardDescription>
              Leave your details and we will keep you posted on shows and
              artists you might like.
            </CardDescription>
          </CardHeader>
        <CardContent>
          {done ? (
            <p className="text-sm">Thanks — we have your details.</p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="full_name" className="text-xs text-muted-foreground">
                  Full name
                </Label>
                <Input
                  id="full_name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="interest" className="text-xs text-muted-foreground">
                  What are you interested in? (optional)
                </Label>
                <textarea
                  id="interest"
                  rows={3}
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={optIn}
                  onChange={(e) => setOptIn(e.target.checked)}
                  className="h-4 w-4 accent-foreground"
                />
                Add me to the newsletter.
              </label>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Sending…" : "Send"}
              </Button>
            </form>
          )}
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
