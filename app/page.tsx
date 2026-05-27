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
                  Free to use — no credit card needed
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
                  onClick={() => router.push("/onboarding")}
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
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Everything you need to track inventory
            </h2>
            <p className="text-xl text-gray-600">
              Built for small teams who are tired of losing track of stock.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-8 rounded-2xl bg-white border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all">
              <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center mb-6">
                <FaWarehouse className="text-2xl text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Multi-warehouse support
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Manage multiple warehouses from a single dashboard. Move stock between locations easily.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
              <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center mb-6">
                <FaBell className="text-2xl text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Low stock alerts
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Get notified before you run out. Set thresholds per product and never miss a reorder.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white border border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all">
              <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center mb-6">
                <FaChartLine className="text-2xl text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Stock history
              </h3>
              <p className="text-gray-600 leading-relaxed">
                See every change in inventory over time. Know who updated what and when.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white border border-gray-200 hover:border-teal-300 hover:shadow-lg transition-all">
              <div className="w-14 h-14 rounded-xl bg-teal-100 flex items-center justify-center mb-6">
                <FaCheckCircle className="text-2xl text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Fast product search
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Search across all your warehouses instantly. Filter by category, status, or stock level.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all">
              <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center mb-6">
                <FaBox className="text-2xl text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Clean dashboard
              </h3>
              <p className="text-gray-600 leading-relaxed">
                All your key numbers at a glance — total items, low stock counts, warehouse breakdowns.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white border border-gray-200 hover:border-yellow-300 hover:shadow-lg transition-all">
              <div className="w-14 h-14 rounded-xl bg-yellow-100 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Free to get started
              </h3>
              <p className="text-gray-600 leading-relaxed">
                No credit card, no trial timer. Sign up and start adding your inventory right away.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Up and running in minutes
            </h2>
            <p className="text-xl text-gray-600">
              No onboarding calls. No setup fees. Just sign up and go.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-gray-300 text-gray-900 font-bold text-2xl mb-6">
                1
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                Create your account
              </h3>
              <p className="text-gray-600 text-lg">
                Sign up free. No credit card needed.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-gray-300 text-gray-900 font-bold text-2xl mb-6">
                2
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                Add your warehouse
              </h3>
              <p className="text-gray-600 text-lg">
                Set up locations and add your products in bulk.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-gray-300 text-gray-900 font-bold text-2xl mb-6">
                3
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                Track in real time
              </h3>
              <p className="text-gray-600 text-lg">
                Monitor stock levels and get alerted when things run low.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Developer Intro Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 md:p-12">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Profile Image */}
              <div className="flex-shrink-0">
                <img
                  src="/images/my-image-1.jpeg"
                  alt="Riya Gupta"
                  className="w-32 h-32 rounded-full object-cover border-4 border-purple-100"
                />
              </div>

              {/* Content */}
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Riya Gupta</h3>
                  <p className="text-emerald-600 font-medium">Built by a developer, for developers</p>
                </div>

                <p className="text-gray-700 leading-relaxed">
                  Hey devs! I'm Riya Gupta, a CS grad from VIT Bhopal. Been working on something cool — <span className="font-semibold">Inventory Tracker</span>. It's an intelligent inventory health & monitoring tool that keeps things simple (no bulky ERP headaches). You get clean dashboards, full visibility, and secure access control — all in one place.
                </p>

                <p className="text-gray-700">
                  Would genuinely love your thoughts/feedback 💙
                </p>

                <div className="pt-4">
                  <a
                    href="mailto:riya98012@gmail.com"
                    className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    riya98012@gmail.com
                  </a>
                </div>
              </div>
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
              onClick={() => router.push("/onboarding")}
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
