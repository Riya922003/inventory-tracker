"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FaChartBar,
  FaChartLine,
  FaWarehouse,
  FaExchangeAlt,
  FaDollarSign,
  FaExclamationTriangle,
  FaFileAlt,
  FaDownload,
  FaEye,
  FaPlus,
} from "react-icons/fa";

const reportTypes = [
  {
    id: "aging",
    title: "Aging Report",
    icon: FaChartBar,
    description: "See which products are aging and need action",
    color: "from-purple-500 to-purple-600",
    route: "/dashboard/reports/aging",
  },
  {
    id: "xyz",
    title: "XYZ Analysis",
    icon: FaChartLine,
    description: "Identify fast vs slow-moving products",
    color: "from-blue-500 to-blue-600",
    route: "/dashboard/reports/xyz",
  },
  {
    id: "warehouse",
    title: "Warehouse Utilization",
    icon: FaWarehouse,
    description: "Check space usage across locations",
    color: "from-green-500 to-green-600",
    route: "/dashboard/reports/warehouse",
  },
  {
    id: "movement",
    title: "Movement History",
    icon: FaExchangeAlt,
    description: "Track all stock ins, outs, and transfers",
    color: "from-orange-500 to-orange-600",
    route: "/dashboard/reports/movement",
  },
  {
    id: "valuation",
    title: "Valuation Report",
    icon: FaDollarSign,
    description: "Total inventory value over time",
    color: "from-indigo-500 to-indigo-600",
    route: "/dashboard/reports/valuation",
  },
  {
    id: "damage",
    title: "Damage Report",
    icon: FaExclamationTriangle,
    description: "Track damaged goods & losses",
    color: "from-red-500 to-red-600",
    route: "/dashboard/reports/damage",
  },
];

const recentReports = [
  {
    id: 1,
    title: "Aging Report - December 2025",
    generatedOn: "26 Dec 2025",
    generatedBy: "Admin",
    type: "aging",
  },
  {
    id: 2,
    title: "XYZ Analysis - Q4 2025",
    generatedOn: "20 Dec 2025",
    generatedBy: "Admin",
    type: "xyz",
  },
];

export default function ReportsPage() {
  const router = useRouter();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-1">Generate insights and export data</p>
      </div>

      {/* Quick Reports */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            return (
              <Card
                key={report.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(report.route)}
              >
                <CardContent className="p-6">
                  <div
                    className={`w-12 h-12 rounded-lg bg-gradient-to-br ${report.color} flex items-center justify-center mb-4`}
                  >
                    <Icon className="text-2xl text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {report.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {report.description}
                  </p>
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    Generate →
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Reports */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Reports
        </h2>
        <Card>
          <CardContent className="p-6">
            {recentReports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FaFileAlt className="mx-auto text-4xl text-gray-300 mb-2" />
                <p>No reports generated yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FaFileAlt className="text-2xl text-purple-600" />
                      <div>
                        <p className="font-semibold text-gray-900">
                          {report.title}
                        </p>
                        <p className="text-sm text-gray-600">
                          Generated on {report.generatedOn} by {report.generatedBy}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <FaEye className="mr-2" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <FaDownload className="mr-2" />
                        PDF
                      </Button>
                      <Button size="sm" variant="outline">
                        <FaDownload className="mr-2" />
                        Excel
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Custom Report Builder */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Custom Report Builder
              </h2>
              <p className="text-sm text-gray-600">
                Build your own reports with custom filters and metrics
              </p>
            </div>
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <FaPlus className="mr-2" />
              Create Custom
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
