"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FaBox, FaArrowLeft, FaEnvelope } from "react-icons/fa";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(data.message);
        setEmail("");
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
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
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-5">
            <Link href="/login" className="text-gray-400 hover:text-gray-600 transition-colors">
              <FaArrowLeft />
            </Link>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
              <p className="text-gray-500 text-sm mt-0.5">
                We'll send a reset link to your email
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {message ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-start gap-3">
                <FaEnvelope className="text-green-500 text-lg flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-800 font-semibold text-sm">Check your inbox</p>
                  <p className="text-green-700 text-sm mt-1">{message}</p>
                </div>
              </div>
              <div className="mt-4 text-center">
                <Link href="/login" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                  Back to Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-gray-700 text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>

              <p className="text-center text-sm text-gray-500">
                Remember your password?{" "}
                <Link href="/login" className="text-purple-600 hover:text-purple-700 font-medium">
                  Back to Login
                </Link>
              </p>
            </form>
          )}
        </div>

        <p className="text-center mt-6 text-xs text-gray-400">
          © 2025 Inventory Tracker. Smart inventory management for modern businesses.
        </p>
      </div>
    </div>
  );
}
