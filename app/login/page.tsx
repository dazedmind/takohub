"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast, Toaster } from "sonner";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.message || "Invalid username or password.";
        toast.error(msg);
        setError(msg);
        setIsLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during sign in.");
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col flex-1 items-center justify-center min-h-screen p-4 bg-zinc-100 dark:bg-zinc-950">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Sign in to TakoHub
          </h1>
        </div>

        {/* Login Card */}
        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          {/* <CardHeader>
            <CardTitle className="text-base font-semibold">Sign in to your account</CardTitle>
          </CardHeader> */}
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-2.5 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="username"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block"
                >
                  Username
                </label>
                <Input
                  type="text"
                  id="username"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block"
                >
                  Password
                </label>
                <Input
                  type="password"
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-10 text-sm"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="w-full h-10 font-bold"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <Toaster position="top-center" richColors />
    </main>
  );
}
