"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FaBox, FaLightbulb } from "react-icons/fa";

export default function AuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Login form state
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
        credentials: "include", // Ensure cookies are included
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const data = await response.json();
      console.log("Login response:", response.status, data);
      console.log("Response headers:", response.headers);

      if (response.ok) {
        console.log("Login successful, response data:", data);
        
        // Force a hard reload to the dashboard
        if (data.needsOnboarding) {
          console.log("Redirecting to onboarding...");
          window.location.replace("/onboarding");
        } else {
          console.log("Redirecting to dashboard...");
          window.location.replace("/dashboard");
        }
      } else {
        setError(data.error || "Login failed. Please try again.");
        setLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <FaBox className="text-4xl text-purple-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              InsydTracker
            </h1>
          </div>
          <p className="text-gray-600">Smart Inventory Management System</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                onClick={() => setError("")}
                className={`flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white`}
              >
                Login
              </Button>
              <Button
                type="button"
                onClick={() => router.push("/onboarding")}
                className={`flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200`}
              >
                Sign Up
              </Button>
            </div>
            <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
            <p className="text-center text-gray-600 text-sm mt-2">Login to access your inventory</p>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email Address</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="Enter your email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-start gap-2">
                <FaLightbulb className="text-yellow-500 text-lg flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-700 font-medium mb-1">Demo Account</p>
                  <p className="text-xs text-gray-600">Log in to access your inventory dashboard and manage your warehouses and products.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-gray-600">
          <p>© 2025 InsydTracker. Smart inventory management for modern businesses.</p>
        </div>
      </div>
    </div>
  );
}
