"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  FaArrowLeft,
  FaPlus,
  FaMinus,
  FaWarehouse,
  FaBox,
  FaImage,
} from "react-icons/fa";

interface Product {
  _id: string;
  name: string;
  sku: string;
  category: { _id: string; name: string };
  unitPrice: number;
  unitType: string;
  isFragile: boolean;
  hasExpiryDate: boolean;
  reorderLevel: number;
  isActive: boolean;
}

interface StockBatch {
  _id: string;
  batchId: string;
  warehouseId: { _id: string; name: string };
  quantityReceived: number;
  quantityAvailable: number;
  quantityDamaged: number;
  entryDate: string;
  expiryDate: string | null;
  createdBy: { name: string };
  entryPhotos: { url: string }[];
}

interface Movement {
  _id: string;
  movementType: "entry" | "exit";
  quantity: number;
  timestamp: string;
  warehouseName: string;
  performedBy: string;
  customerName?: string;
  orderReference?: string;
  batchId?: string;
  supplierInvoice?: string;
  photoUrl?: string;
}

interface WarehouseSummary {
  warehouseId: string;
  warehouseName: string;
  totalReceived: number;
  totalAvailable: number;
  totalDispatched: number;
}

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [warehouseSummaries, setWarehouseSummaries] = useState<WarehouseSummary[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoModal, setPhotoModal] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, [productId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [productRes, batchRes, exitRes] = await Promise.all([
        fetch(`/api/products/${productId}`, { credentials: "include" }),
        fetch(`/api/stock/entry?productId=${productId}`, { credentials: "include" }),
        fetch(`/api/stock/exit?productId=${productId}`, { credentials: "include" }),
      ]);

      if (productRes.status === 401) { window.location.href = "/"; return; }

      if (productRes.ok) {
        const d = await productRes.json();
        setProduct(d.product);
      }

      // Build per-warehouse summary from batches
      if (batchRes.ok) {
        const d = await batchRes.json();
        const batches: StockBatch[] = d.stocks || [];

        const summaryMap: Record<string, WarehouseSummary> = {};
        for (const b of batches) {
          const wid = b.warehouseId._id;
          if (!summaryMap[wid]) {
            summaryMap[wid] = {
              warehouseId: wid,
              warehouseName: b.warehouseId.name,
              totalReceived: 0,
              totalAvailable: 0,
              totalDispatched: 0,
            };
          }
          summaryMap[wid].totalReceived += b.quantityReceived;
          summaryMap[wid].totalAvailable += b.quantityAvailable;
          summaryMap[wid].totalDispatched += (b.quantityReceived - b.quantityAvailable);
        }
        setWarehouseSummaries(Object.values(summaryMap));

        // Build entry movements from batches
        const entryMovements: Movement[] = batches.map((b) => ({
          _id: b._id,
          movementType: "entry" as const,
          quantity: b.quantityReceived,
          timestamp: b.entryDate,
          warehouseName: b.warehouseId.name,
          performedBy: b.createdBy.name,
          batchId: b.batchId,
          photoUrl: b.entryPhotos[0]?.url,
        }));

        // Merge with exit movements
        if (exitRes.ok) {
          const ed = await exitRes.json();
          const exitMovements: Movement[] = (ed.movements || []).map((m: any) => ({
            _id: m._id,
            movementType: "exit" as const,
            quantity: m.quantity,
            timestamp: m.timestamp,
            warehouseName: m.warehouseId?.name ?? "—",
            performedBy: m.performedBy?.name ?? "—",
            customerName: m.customerName,
            orderReference: m.orderReference,
          }));

          const all = [...entryMovements, ...exitMovements].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setMovements(all);
        } else {
          setMovements(entryMovements.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          ));
        }
      }
    } catch (err) {
      toast.error("Failed to load product details");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const totalAvailable = warehouseSummaries.reduce((s, w) => s + w.totalAvailable, 0);
  const totalReceived  = warehouseSummaries.reduce((s, w) => s + w.totalReceived, 0);
  const totalDispatched = warehouseSummaries.reduce((s, w) => s + w.totalDispatched, 0);

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 dark:bg-white/10 rounded" />
          <div className="h-32 bg-gray-200 dark:bg-white/10 rounded-xl" />
          <div className="h-48 bg-gray-200 dark:bg-white/10 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-4 md:p-8 text-center py-20">
        <FaBox className="text-5xl text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Product not found</p>
        <Button className="mt-4" onClick={() => router.push("/dashboard/inventory")}>
          Back to Products
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">

      {/* Back + actions */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/inventory")}
            className="mb-3 -ml-2"
          >
            <FaArrowLeft className="mr-2" />
            Back to Products
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{product.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5">SKU: {product.sku} · {product.category.name}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={() => router.push(`/dashboard/stock/exit?productId=${productId}`)}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <FaMinus className="mr-2" />
            Record Exit
          </Button>
          <Button
            onClick={() => router.push(`/dashboard/stock/entry?productId=${productId}`)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 dark:from-cyan-500 dark:to-cyan-500 dark:hover:from-cyan-400 dark:hover:to-cyan-400 dark:text-gray-950"
          >
            <FaPlus className="mr-2" />
            Record Entry
          </Button>
        </div>
      </div>

      {/* Product info + totals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Unit Price</p>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">₹{product.unitPrice.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Unit Type</p>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5 capitalize">{product.unitType}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Status</p>
                <span className={`inline-block mt-0.5 text-xs px-2 py-0.5 rounded font-medium ${product.isActive ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400"}`}>
                  {product.isActive ? "Active" : "Archived"}
                </span>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Fragile</p>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{product.isFragile ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Has Expiry</p>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{product.hasExpiryDate ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Reorder Level</p>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{product.reorderLevel} {product.unitType}s</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total stock snapshot */}
        <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-cyan-500/5 dark:to-cyan-500/10 border-indigo-100 dark:border-cyan-500/20">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-cyan-400 mb-4">Total Stock</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Ever Received</span>
                <span className="font-bold text-gray-900 dark:text-white">{totalReceived} <span className="font-normal text-xs capitalize">{product.unitType}s</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Dispatched</span>
                <span className="font-bold text-red-600 dark:text-red-400">{totalDispatched} <span className="font-normal text-xs capitalize">{product.unitType}s</span></span>
              </div>
              <div className="border-t dark:border-white/10 pt-3 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Available Now</span>
                <span className="font-bold text-lg text-indigo-700 dark:text-cyan-400">{totalAvailable} <span className="font-normal text-xs capitalize">{product.unitType}s</span></span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-warehouse breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FaWarehouse className="text-indigo-500 dark:text-cyan-400" />
            Stock by Warehouse
          </CardTitle>
        </CardHeader>
        <CardContent>
          {warehouseSummaries.length === 0 ? (
            <div className="text-center py-8">
              <FaWarehouse className="text-4xl text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No stock entries yet for this product</p>
              <Button
                className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600 dark:from-cyan-500 dark:to-cyan-500 dark:text-gray-950"
                onClick={() => router.push(`/dashboard/stock/entry?productId=${productId}`)}
              >
                <FaPlus className="mr-2" /> Record First Entry
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Warehouse</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Received</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Dispatched</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Available</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouseSummaries.map((w) => (
                    <tr key={w.warehouseId} className="border-b hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{w.warehouseName}</td>
                      <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{w.totalReceived} <span className="text-xs capitalize">{product.unitType}s</span></td>
                      <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">{w.totalDispatched} <span className="text-xs capitalize">{product.unitType}s</span></td>
                      <td className="py-3 px-4 text-right font-semibold text-indigo-700 dark:text-cyan-400">{w.totalAvailable} <span className="font-normal text-xs capitalize">{product.unitType}s</span></td>
                    </tr>
                  ))}
                  {warehouseSummaries.length > 1 && (
                    <tr className="bg-gray-50 dark:bg-white/5 font-semibold">
                      <td className="py-3 px-4 text-gray-900 dark:text-white">Total</td>
                      <td className="py-3 px-4 text-right text-gray-900 dark:text-white">{totalReceived}</td>
                      <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">{totalDispatched}</td>
                      <td className="py-3 px-4 text-right text-indigo-700 dark:text-cyan-400">{totalAvailable}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Movement history */}
      <Card>
        <CardHeader>
          <CardTitle>Movement History</CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-center py-8 text-gray-500 dark:text-gray-400">No movements recorded yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Warehouse</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Qty</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">By</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Reference</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Photo</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m._id} className="border-b hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">{fmt(m.timestamp)}</td>
                      <td className="py-3 px-4">
                        {m.movementType === "entry" ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400 px-2 py-1 rounded">
                            <FaPlus className="text-[10px]" /> Entry
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 px-2 py-1 rounded">
                            <FaMinus className="text-[10px]" /> Exit
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{m.warehouseName}</td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900 dark:text-white">{m.quantity} <span className="font-normal text-xs capitalize">{product.unitType}s</span></td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{m.performedBy}</td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">
                        {m.movementType === "entry" && m.batchId && <span>Batch: {m.batchId}</span>}
                        {m.movementType === "exit" && m.customerName && <span>→ {m.customerName}</span>}
                        {m.movementType === "exit" && m.orderReference && <span className="ml-1 text-gray-400">#{m.orderReference}</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {m.photoUrl ? (
                          <button onClick={() => setPhotoModal(m.photoUrl!)}>
                            <img src={m.photoUrl} alt="photo" className="w-10 h-10 object-cover rounded border dark:border-white/10 hover:opacity-80 transition-opacity mx-auto" />
                          </button>
                        ) : (
                          <FaImage className="text-gray-300 dark:text-gray-600 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo modal */}
      {photoModal && (
        <div
          className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
          onClick={() => setPhotoModal(null)}
        >
          <img src={photoModal} alt="Movement photo" className="max-w-full max-h-[90vh] rounded-lg" />
        </div>
      )}
    </div>
  );
}
