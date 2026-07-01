"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FaBox, FaEye, FaEyeSlash, FaUserShield, FaWarehouse } from "react-icons/fa";
import { toast } from "sonner";

const DEMO_ACCOUNTS = [
  {
    label: "Super Admin",
    description: "Full access — all warehouses & settings",
    icon: FaUserShield,
    email: "test12@gmail.com",
    password: "test12@2003",
    color: "purple",
  },
  {
    label: "Warehouse Manager",
    description: "Scoped access — assigned warehouses only",
    icon: FaWarehouse,
    email: "beesoul98012@gmail.com",
    password: "Warehouse@123",
    color: "blue",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        window.location.replace(data.needsOnboarding ? "/onboarding" : "/dashboard");
      } else {
        setError(data.error || "Login failed. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <FaBox className="text-3xl text-purple-600" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Inventory Tracker
            </h1>
          </div>
          <p className="text-gray-500 text-sm">Smart Inventory Management System</p>
        </div>

        {/* Card — forced light */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">

          {/* Tab row */}
          <div className="flex border-b border-gray-100">
            <button className="flex-1 py-3.5 text-sm font-semibold text-purple-600 border-b-2 border-purple-600 bg-purple-50/50">
              Login
            </button>
            <button
              onClick={() => router.push("/onboarding")}
              className="flex-1 py-3.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Sign Up
            </button>
          </div>

          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome Back</h2>
            <p className="text-gray-500 text-sm mb-6">Login to access your inventory</p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-email" className="text-gray-700 text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="Enter your email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="login-password" className="text-gray-700 text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-2.5"
              >
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>

            <div className="mt-3 text-center">
              <Link
                href="/forgot-password"
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                Forgot your password?
              </Link>
            </div>

            {/* Demo accounts */}
            <div className="mt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400 font-medium">Try a demo account</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {DEMO_ACCOUNTS.map((account) => {
                  const Icon = account.icon;
                  const isPurple = account.color === "purple";
                  const hasPassword = account.password !== "";

                  return (
                    <button
                      key={account.label}
                      type="button"
                      onClick={() => {
                        setLoginEmail(account.email);
                        setLoginPassword(account.password);
                        setError("");
                        if (!account.password) {
                          toast.info("Email pre-filled. Use Forgot Password to set a password first.");
                        } else {
                          toast.success(`${account.label} credentials filled — press Login`);
                        }
                      }}
                      className={`relative flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all group
                        ${isPurple
                          ? "border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-300"
                          : "border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300"
                        }`}
                    >
                      <div className={`flex items-center gap-1.5 ${isPurple ? "text-purple-600" : "text-blue-600"}`}>
                        <Icon className="text-sm" />
                        <span className="text-xs font-semibold">{account.label}</span>
                      </div>
                      <span className="text-xs text-gray-500 leading-tight">{account.description}</span>
                      {!hasPassword && (
                        <span className="text-xs text-amber-600 font-medium">Reset password first →</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-gray-400 text-center mt-2">
                Click a role to prefill credentials, then press Login
              </p>
            </div>
          </div>
        </div>

        <p className="text-center mt-6 text-xs text-gray-400">
          © 2025 Inventory Tracker. Smart inventory management for modern businesses.
        </p>
      </div>
    </div>
  );
}
