"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LogIn } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // First, check rate limit and validate credentials via API
      const validateResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (validateResponse.status === 429) {
        const data = await validateResponse.json();
        setError(data.error || "너무 많은 로그인 시도입니다. 잠시 후 다시 시도해주세요.");
        return;
      }

      if (!validateResponse.ok) {
        const data = await validateResponse.json();
        setError(data.error || "아이디 또는 비밀번호가 올바르지 않습니다.");
        return;
      }

      // Credentials valid, now sign in with NextAuth
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("아이디 또는 비밀번호가 올바르지 않습니다.");
      } else if (result?.ok) {
        // Get session to check user role for redirect
        const session = await getSession();
        const redirectUrl = session?.user?.role === "ADMIN"
          ? "/admin/projects"
          : "/projects";
        router.push(redirectUrl);
        router.refresh();
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2 overflow-hidden">
      {/* Left Side - Abstract Solar Aesthetics */}
      <div className="hidden lg:flex relative flex-col justify-between p-12 h-full bg-zinc-950 text-white overflow-hidden">
        {/* Abstract Background with Grayscale filter for "Minimal" feel */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?q=80&w=2574&auto=format&fit=crop"
            alt="Minimal Abstract Solar"
            fill
            className="object-cover opacity-40 grayscale contrast-125 animate-in fade-in duration-1000"
            priority
          />
          {/* Subtle gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950 via-zinc-950/50 to-transparent" />
        </div>

        {/* Minimal Logo Area */}
        <div className="relative z-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
            <span className="text-sm font-medium tracking-widest uppercase text-zinc-300">JS Solar Portal</span>
          </div>
        </div>

        {/* Bottom Text - Clean & Technical */}
        <div className="relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
          <h2 className="text-3xl font-light tracking-tight text-white mb-2">
            Engineering the <span className="text-yellow-500 font-normal">Future</span>
          </h2>
          <p className="text-zinc-400 text-sm max-w-sm leading-relaxed">
            Advanced solar project management for the next generation of energy infrastructure.
          </p>
        </div>
      </div>

      {/* Right Side - Clean Minimal Form */}
      <div className="flex items-center justify-center p-8 bg-white relative">
        <div className="w-full max-w-[320px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Sign in</h1>
            <p className="text-sm text-zinc-500">Welcome back. Please enter your details.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Input */}
            <div className="space-y-2 group">
              <Label htmlFor="username" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Account ID</Label>
              <Input
                id="username"
                type="text"
                className="h-10 border-0 border-b border-zinc-200 bg-transparent px-0 shadow-none focus-visible:border-zinc-900 focus-visible:ring-0 rounded-none transition-colors placeholder:text-zinc-300"
                placeholder="admin@jssolar.kr"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2 group">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                className="h-10 border-0 border-b border-zinc-200 bg-transparent px-0 shadow-none focus-visible:border-zinc-900 focus-visible:ring-0 rounded-none transition-colors placeholder:text-zinc-300"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="text-xs text-red-500 font-medium flex items-center gap-1.5 animate-in fade-in">
                <div className="w-1 h-1 rounded-full bg-red-500" />
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-10 rounded-full bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800 transition-transform active:scale-[0.98] shadow-sm"
              disabled={isLoading}
            >
              {isLoading ? "Authenticating..." : "Continue"}
            </Button>
          </form>

          {/* Footer - Minimal Link */}
          <div className="text-center">
            <button className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors">
              Having trouble signing in?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
