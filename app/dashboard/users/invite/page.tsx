"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FaArrowLeft, FaEnvelope, FaUser, FaPhone, FaWarehouse } from "react-icons/fa";

export default function InviteUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [warehouses, setWarehouses] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    role: "warehouse_manager",
    assignedWarehouses: [] as string[],
    message: "",
  });

  useEffect(() => {
    // Fetch warehouses for selection
    const fetchWarehouses = async () => {
      try {
        const response = await fetch("/api/warehouses");
        if (response.ok) {
          const data = await response.json();
          setWarehouses(data.warehouses || []);
        }
      } catch (error) {
        console.error("Error fetching warehouses:", error);
      }
    };

    fetchWarehouses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch("/api/users/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setFormData({
          email: "",
          name: "",
          phone: "",
          role: "warehouse_manager",
          assignedWarehouses: [],
          message: "",
        });
        
        // Show success message for 3 seconds then redirect
        setTimeout(() => {
          router.push("/dashboard");
        }, 3000);
      } else {
        setError(data.error || "Failed to send invitation");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
      console.error("Error sending invitation:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWarehouseToggle = (warehouseCode: string) => {
    setFormData((prev) => ({
      ...prev,
      assignedWarehouses: prev.assignedWarehouses.includes(warehouseCode)
        ? prev.assignedWarehouses.filter((code) => code !== warehouseCode)
        : [...prev.assignedWarehouses, warehouseCode],
    }));
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-4"
        >
          <FaArrowLeft className="mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Invite Team Member</h1>
        <p className="text-gray-600 mt-1">
          Send an invitation to a new warehouse manager
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6 rounded">
          <div className="flex items-center gap-2">
            <span className="text-green-800 font-medium">
              ✅ Invitation sent successfully! Redirecting...
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded">
          <div className="flex items-center gap-2">
            <span className="text-red-800 font-medium">❌ {error}</span>
          </div>
        </div>
      )}

      {/* Invitation Form */}
      <Card>
        <CardHeader>
          <CardTitle>Invitation Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaEnvelope className="inline mr-2" />
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="manager@example.com"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaUser className="inline mr-2" />
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="John Doe"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaPhone className="inline mr-2" />
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="+1234567890"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="warehouse_manager">Warehouse Manager</option>
                <option value="super_admin">Super Admin</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.role === "warehouse_manager"
                  ? "Can manage assigned warehouses only"
                  : "Full system access - use carefully!"}
              </p>
            </div>

            {/* Assigned Warehouses (only for warehouse_manager) */}
            {formData.role === "warehouse_manager" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaWarehouse className="inline mr-2" />
                  Assign Warehouses *
                </label>
                <div className="border border-gray-300 rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                  {warehouses.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No warehouses available. Create warehouses first.
                    </p>
                  ) : (
                    warehouses.map((warehouse) => (
                      <label
                        key={warehouse._id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.assignedWarehouses.includes(
                            warehouse._id
                          )}
                          onChange={() =>
                            handleWarehouseToggle(warehouse._id)
                          }
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {warehouse.name}
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                {formData.role === "warehouse_manager" &&
                  formData.assignedWarehouses.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      Please select at least one warehouse
                    </p>
                  )}
                <p className="text-xs text-gray-500 mt-2">
                  💡 Manager will only see and manage these warehouses
                </p>
              </div>
            )}

            {/* Personal Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Personal Message (Optional)
              </label>
              <textarea
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Welcome to our team! Looking forward to working with you."
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  loading ||
                  (formData.role === "warehouse_manager" &&
                    formData.assignedWarehouses.length === 0)
                }
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {loading ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 mb-2">
            📧 What happens next?
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Invitation email will be sent to the provided address</li>
            <li>• They'll receive a secure link to create their account</li>
            <li>• Link expires in 3 days</li>
            <li>• You'll be notified when they accept the invitation</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
