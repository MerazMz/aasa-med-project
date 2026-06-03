"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { getUnitAbbreviation, SupportedUnit } from "@/lib/conversions";

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  baseUnit: string;
  stockQuantity: string; // Decimal is returned as string from Prisma
  basePrice: string;
  createdAt: string;
}

interface User {
  name: string;
  email: string;
  role: string;
}

interface OrderItem {
  id: string;
  product: Product;
  orderedQuantity: string;
  orderedUnit: string;
  convertedQuantity: string;
  pricePerUnit: string;
  subtotal: string;
}

interface Order {
  id: string;
  totalAmount: string;
  status: string;
  createdAt: string;
  user: User;
  items: OrderItem[];
}

export default function SellerPage() {
  const [activeTab, setActiveTab] = useState<"inventory" | "quotations">("inventory");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Form states
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [inputUnit, setInputUnit] = useState<SupportedUnit>("GRAM");
  const [inputQuantity, setInputQuantity] = useState("");
  const [inputPrice, setInputPrice] = useState("");
  
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [orderActionLoading, setOrderActionLoading] = useState(false);

  // Fetch listed products
  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
      }
    } catch (err) {
      console.error("Failed to fetch products", err);
    }
  };

  // Fetch orders/quotations
  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
      }
    } catch (err) {
      console.error("Failed to fetch orders", err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const qty = parseFloat(inputQuantity);
    const price = parseFloat(inputPrice);

    if (isNaN(qty) || qty <= 0) {
      setError("Quantity must be a positive number");
      setLoading(false);
      return;
    }

    if (isNaN(price) || price <= 0) {
      setError("Price must be a positive number");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          sku,
          description: description || null,
          inputUnit,
          inputQuantity: qty,
          inputPrice: price,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to list product");
      }

      setMessage("Product listed successfully!");
      // Reset form
      setName("");
      setSku("");
      setDescription("");
      setInputQuantity("");
      setInputPrice("");
      fetchProducts();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setOrderActionLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      // Refresh both orders and products so stock levels are updated
      await fetchOrders();
      await fetchProducts();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setOrderActionLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#faf7f2] font-sans">
      <Navbar />

      {/* Tab Switcher */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex space-x-8">
          <button
            onClick={() => setActiveTab("inventory")}
            className={`py-4 text-sm font-semibold tracking-wide border-b-2 transition-all ${
              activeTab === "inventory"
                ? "border-black text-black"
                : "border-transparent text-zinc-400 hover:text-zinc-900"
            }`}
          >
            Products & Inventory
          </button>
          <button
            onClick={() => setActiveTab("quotations")}
            className={`py-4 text-sm font-semibold tracking-wide border-b-2 transition-all relative ${
              activeTab === "quotations"
                ? "border-black text-black"
                : "border-transparent text-zinc-400 hover:text-zinc-900"
            }`}
          >
            Quotation Requests
            {orders.filter(o => o.status === "PENDING").length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-extrabold bg-black text-white rounded-full">
                {orders.filter(o => o.status === "PENDING").length}
              </span>
            )}
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-12">
        {error && (
          <div className="mb-6 p-4 text-sm rounded-xl bg-red-50 border border-red-200 text-red-600 max-w-md">
            {error}
          </div>
        )}

        {activeTab === "inventory" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Form to list product */}
            <div className="lg:col-span-1 bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs h-fit space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-zinc-900">List New Product</h2>
                <p className="text-zinc-500 text-xs">Configure basic unit, pricing, and initial stock.</p>
              </div>

              {message && (
                <div className="p-3 text-xs rounded-lg bg-emerald-50 border border-emerald-150 text-emerald-700">
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Product Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Ethanol 99%"
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">SKU / Code</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g., ETH-99-L"
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description"
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all min-h-[80px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Listing Unit</label>
                  <select
                    value={inputUnit}
                    onChange={(e) => setInputUnit(e.target.value as SupportedUnit)}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                  >
                    <option value="GRAM">Grams (g)</option>
                    <option value="KILOGRAM">Kilograms (kg)</option>
                    <option value="MILLILITER">Milliliters (mL)</option>
                    <option value="LITER">Liters (L)</option>
                    <option value="ITEM">Items (count)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Initial Stock</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={inputQuantity}
                      onChange={(e) => setInputQuantity(e.target.value)}
                      placeholder="e.g., 25"
                      className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Price (INR)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={inputPrice}
                      onChange={(e) => setInputPrice(e.target.value)}
                      placeholder="e.g., 450"
                      className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-black hover:bg-zinc-800 text-white rounded-lg font-semibold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {loading ? "Adding..." : "List Product"}
                </button>
              </form>
            </div>

            {/* Right Column: Inventory levels */}
            <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-zinc-900">Current Inventory</h2>
                <button 
                  onClick={fetchProducts}
                  className="p-1.5 border border-zinc-200 rounded-lg text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 transition-all"
                  title="Refresh"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-150 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="pb-3">Product</th>
                      <th className="pb-3">SKU</th>
                      <th className="pb-3">Database Base Unit</th>
                      <th className="pb-3 text-right">Base Price (INR)</th>
                      <th className="pb-3 text-right">Base Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-zinc-400">
                          No products listed yet. Use the form on the left to add one!
                        </td>
                      </tr>
                    ) : (
                      products.map((p) => (
                        <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="py-4">
                            <div className="font-semibold text-zinc-900">{p.name}</div>
                            {p.description && <div className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{p.description}</div>}
                          </td>
                          <td className="py-4 font-mono text-xs text-zinc-600">{p.sku}</td>
                          <td className="py-4 text-xs font-semibold text-zinc-500">
                            {p.baseUnit} ({getUnitAbbreviation(p.baseUnit as SupportedUnit)})
                          </td>
                          <td className="py-4 text-right font-mono text-zinc-900">
                            ₹{parseFloat(p.basePrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                            <span className="text-[10px] text-zinc-400 ml-1">/ {getUnitAbbreviation(p.baseUnit as SupportedUnit)}</span>
                          </td>
                          <td className="py-4 text-right font-mono text-zinc-900">
                            {parseFloat(p.stockQuantity).toLocaleString('en-IN', { maximumFractionDigits: 4 })}
                            <span className="text-[10px] text-zinc-400 ml-1">{getUnitAbbreviation(p.baseUnit as SupportedUnit)}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Quotation Requests List */
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-zinc-900">Incoming Quotations</h2>
              <button 
                onClick={fetchOrders}
                className="p-1.5 border border-zinc-200 rounded-lg text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 transition-all"
                title="Refresh"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center text-zinc-400">
                No orders/quotations have been placed yet.
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((o) => (
                  <div key={o.id} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 border-b border-zinc-100 pb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-zinc-400 font-mono">ID: {o.id}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wide uppercase ${
                            o.status === "PENDING" ? "bg-amber-50 text-amber-600 border border-amber-200" :
                            o.status === "APPROVED" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                            o.status === "REJECTED" ? "bg-red-50 text-red-600 border border-red-200" :
                            "bg-zinc-100 text-zinc-600 border border-zinc-200"
                          }`}>
                            {o.status}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-zinc-900">
                          Placed by: {o.user.name} <span className="text-zinc-400 font-normal">({o.user.email})</span>
                        </div>
                        <div className="text-xs text-zinc-400">Date: {new Date(o.createdAt).toLocaleString()}</div>
                      </div>

                      <div className="flex flex-col sm:items-end gap-2">
                        <span className="text-xl font-bold font-mono text-zinc-900">
                          Total: ₹{parseFloat(o.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          {o.status === "PENDING" && (
                            <>
                              <button
                                disabled={orderActionLoading}
                                onClick={() => handleUpdateStatus(o.id, "APPROVED")}
                                className="px-3 py-1.5 bg-black hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                disabled={orderActionLoading}
                                onClick={() => handleUpdateStatus(o.id, "REJECTED")}
                                className="px-3 py-1.5 border border-red-200 hover:border-red-300 text-red-600 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {o.status === "APPROVED" && (
                            <button
                              disabled={orderActionLoading}
                              onClick={() => handleUpdateStatus(o.id, "COMPLETED")}
                              className="px-3 py-1.5 bg-black hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
                            >
                              Mark Completed
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Items Breakdown */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Quotation Breakdown</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-100 text-zinc-400 pb-2">
                              <th className="pb-2">Product / SKU</th>
                              <th className="pb-2 text-right">Requested Quantity</th>
                              <th className="pb-2 text-right">Base Conversion</th>
                              <th className="pb-2 text-right">Price per Unit</th>
                              <th className="pb-2 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-50">
                            {o.items.map((item) => (
                              <tr key={item.id} className="hover:bg-zinc-50/50">
                                <td className="py-3 font-sans">
                                  <div className="font-semibold text-zinc-950">{item.product.name}</div>
                                  <div className="text-[10px] text-zinc-400 mt-0.5">{item.product.sku}</div>
                                </td>
                                <td className="py-3 text-right text-zinc-900">
                                  {parseFloat(item.orderedQuantity)} {getUnitAbbreviation(item.orderedUnit as SupportedUnit)}
                                </td>
                                <td className="py-3 text-right text-zinc-500 font-semibold">
                                  {parseFloat(item.convertedQuantity).toLocaleString()} {getUnitAbbreviation(item.product.baseUnit as SupportedUnit)}
                                </td>
                                <td className="py-3 text-right text-zinc-900">
                                  ₹{parseFloat(item.pricePerUnit).toFixed(2)} / {getUnitAbbreviation(item.orderedUnit as SupportedUnit)}
                                </td>
                                <td className="py-3 text-right text-zinc-950 font-bold">
                                  ₹{parseFloat(item.subtotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
