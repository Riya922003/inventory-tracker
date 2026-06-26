"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FaBox, FaWarehouse, FaChartLine, FaBell, FaCheckCircle } from "react-icons/fa";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-700/50 backdrop-blur-sm bg-gray-900/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-xl font-semibold text-white">Inventory Tracker</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-gray-300 hover:text-white transition-colors">
                How it works
              </a>
              <a href="#demo" className="text-gray-300 hover:text-white transition-colors">
                Demo
              </a>
            </div>
            <Button
              onClick={() => router.push("/onboarding")}
              className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
            >
              Get started free
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen px-4 sm:px-6 lg:px-8 overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-screen py-20">
            {/* Left Side - Content */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-emerald-600 text-sm font-medium">
                  Free to use, no credit card needed
                </span>
              </div>

              {/* Main Heading */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Know what you have.
                <br />
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Know where it is.
                </span>
              </h1>

              {/* Subheading */}
              <p className="text-xl md:text-2xl text-gray-700 leading-relaxed">
                Inventory Tracker helps you manage warehouses, track stock levels,
                and stay on top of inventory  without the spreadsheet mess.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Button
                  onClick={() => router.push("/onboarding")}
                  className="px-8 py-6 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
                >
                  Sign up free
                </Button>
                <Button
                  onClick={() => router.push("/login")}
                  className="px-8 py-6 text-lg bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
                >
                  Try the demo
                </Button>
              </div>

              {/* Small text */}
              <p className="text-gray-600 text-sm">
                Takes 2 minutes to set up. No tutorial required.
              </p>
            </div>

            {/* Right Side - Hero Image */}
            <div className="relative lg:block">
              <div className="relative">
                <img
                  src="/images/hero-1.png"
                  alt="Inventory Tracker Dashboard"
                  className="w-full h-auto rounded-2xl shadow-2xl"
                />
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/10 to-blue-600/10 rounded-2xl blur-3xl -z-10"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              See exactly what's inside
            </h2>
            <p className="text-xl text-gray-500">
              Every screen built to give you the answer before you even ask the question.
            </p>
          </div>

          <div className="space-y-32">

            {/* Feature 1 — Multi-warehouse */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                  <FaWarehouse className="text-emerald-600 text-sm" />
                  <span className="text-emerald-700 text-sm font-medium">Multi-warehouse support</span>
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                  All your locations,<br />one screen
                </h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Before: a separate spreadsheet per location, emailing staff to check counts.
                  <br /><br />
                  After: every warehouse listed with live capacity bars (green, orange, or red) so you know instantly which one needs attention.
                </p>
                <ul className="space-y-3">
                  {["Capacity fill % at a glance", "Per-warehouse product counts", "Overcapacity flagged automatically"].map((point) => (
                    <li key={point} className="flex items-center gap-3 text-gray-700">
                      <FaCheckCircle className="text-emerald-500 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-100">
                <img
                  src="/images/feature-warehouse.png"
                  alt="Multi-warehouse management screen"
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Feature 2 — Low stock alerts */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-100 lg:order-first order-last">
                <img
                  src="/images/feature-alerts.png"
                  alt="Low stock and warehouse alerts screen"
                  className="w-full h-auto"
                />
              </div>
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
                  <FaBell className="text-blue-600 text-sm" />
                  <span className="text-blue-700 text-sm font-medium">Smart alerts</span>
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                  Caught before<br />you run out
                </h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Before: you find out stock is gone only when a customer asks.
                  <br /><br />
                  After: the system flags it days early. Low stock warnings, warehouse overcapacity, and expiry notices all in one panel.
                </p>
                <ul className="space-y-3">
                  {["Critical, warning, and info severity levels", "Per-product reorder thresholds", "Acknowledge or dismiss with one click"].map((point) => (
                    <li key={point} className="flex items-center gap-3 text-gray-700">
                      <FaCheckCircle className="text-emerald-500 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Feature 3 — Fast product search */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200">
                  <FaCheckCircle className="text-teal-600 text-sm" />
                  <span className="text-teal-700 text-sm font-medium">Fast product search</span>
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                  Find anything<br />in 2 seconds
                </h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Before: Ctrl+F on a 400-row spreadsheet, sorting columns manually.
                  <br /><br />
                  After: type a name, pick a filter, see results instantly. Filtered by category, status, or stock level across all your warehouses.
                </p>
                <ul className="space-y-3">
                  {["Live search as you type", "Filter by category, status, warehouse", "Low stock items highlighted in red"].map((point) => (
                    <li key={point} className="flex items-center gap-3 text-gray-700">
                      <FaCheckCircle className="text-emerald-500 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-100">
                <img
                  src="/images/feature-search.png"
                  alt="Product search and filter screen"
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Feature 4 — Clean dashboard */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-100 lg:order-first order-last">
                <img
                  src="/images/feature-dashboard.png"
                  alt="Inventory dashboard overview"
                  className="w-full h-auto"
                />
              </div>
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200">
                  <FaBox className="text-purple-600 text-sm" />
                  <span className="text-purple-700 text-sm font-medium">Dashboard overview</span>
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                  The numbers that matter,<br />above the fold
                </h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Before: open 3 tabs, cross-reference two files, do the math yourself.
                  <br /><br />
                  After: total products, total value, dead stock, at-risk items. All computed for you the moment you log in.
                </p>
                <ul className="space-y-3">
                  {["Total value calculated automatically", "Dead stock and at-risk counts", "Warehouse capacity snapshot"].map((point) => (
                    <li key={point} className="flex items-center gap-3 text-gray-700">
                      <FaCheckCircle className="text-emerald-500 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Feature 5 — Free to get started */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-50 border border-yellow-200">
                  <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-yellow-700 text-sm font-medium">Free to get started</span>
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                  No credit card.<br />No trial timer.
                </h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Before: 14-day trial, credit card upfront, onboarding call required.
                  <br /><br />
                  After: enter your company name and email. You're inside in under 2 minutes.
                </p>
                <ul className="space-y-3">
                  {["4-step setup, no technical knowledge needed", "No payment info ever required", "Start adding inventory immediately"].map((point) => (
                    <li key={point} className="flex items-center gap-3 text-gray-700">
                      <FaCheckCircle className="text-emerald-500 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-100">
                <img
                  src="/images/feature-signup.png"
                  alt="Free signup screen"
                  className="w-full h-auto"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Up and running in minutes
            </h2>
            <p className="text-xl text-gray-500">
              No onboarding calls. No setup fees. Just sign up and go.
            </p>
          </div>

          {/* Tutorial Video */}
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200 mb-16">
            <video
              src="/Video Project 5.mp4"
              controls
              playsInline
              className="w-full h-auto"
              preload="metadata"
            />
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-white font-bold text-2xl mb-6 shadow-lg">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Create your account
              </h3>
              <p className="text-gray-500">
                Sign up free. No credit card needed.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-white font-bold text-2xl mb-6 shadow-lg">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Add your warehouse
              </h3>
              <p className="text-gray-500">
                Set up locations and add your products in under 5 minutes.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-white font-bold text-2xl mb-6 shadow-lg">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Track in real time
              </h3>
              <p className="text-gray-500">
                Monitor stock levels and get alerted when things run low.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section id="demo" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Start tracking your inventory today
          </h2>
          <p className="text-xl text-gray-700 mb-10">
            Free, no setup required. Try the demo or create your account.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => router.push("/login")}
              className="px-10 py-6 text-lg bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
            >
              Try the demo
            </Button>
            <Button
              onClick={() => router.push("/onboarding")}
              className="px-10 py-6 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
            >
              Create free account
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-lg font-semibold text-gray-900">Inventory Tracker</span>
            </div>
            <p className="text-gray-600 text-sm">
              © 2025 Inventory Tracker. Smart inventory management for modern businesses.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
