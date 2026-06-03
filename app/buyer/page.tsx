"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { 
  convertQuantityFromBase, 
  convertPriceFromBase, 
  getUnitAbbreviation, 
  getUnitGroup, 
  getConversionFactorToBase,
  SupportedUnit 
} from "@/lib/conversions";

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  baseUnit: string;
  stockQuantity: string;
  basePrice: string;
  createdAt: string;
}

interface OrderItem {
  id: string;
  productId: string;
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
  items: OrderItem[];
}

export default function BuyerPage() {
  const [activeTab, setActiveTab] = useState<"browse" | "orders">("browse");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUnits, setSelectedUnits] = useState<{ [productId: string]: SupportedUnit }>({});

  // Cart/Selection state: mapping productId to its ordered selections
  const [cart, setCart] = useState<{
    [productId: string]: {
      product: Product;
      quantity: number;
      unit: SupportedUnit;
    };
  }>({});

  const [orderError, setOrderError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState("");
  const [orderLoading, setOrderLoading] = useState(false);

  const fetchProducts = async (searchTerm = "") => {
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(searchTerm)}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
        
        // Initialize default display units for any new products
        const defaultUnits: { [productId: string]: SupportedUnit } = {};
        data.products.forEach((p: Product) => {
          defaultUnits[p.id] = p.baseUnit as SupportedUnit;
        });
        setSelectedUnits(prev => ({ ...defaultUnits, ...prev }));
      }
    } catch (err) {
      console.error("Failed to fetch products", err);
    }
  };

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
    fetchProducts(search);
  }, [search]);

  useEffect(() => {
    if (activeTab === "orders") {
      fetchOrders();
    }
  }, [activeTab]);

  // Determine allowed viewing units based on the base unit group
  const getAvailableUnits = (baseUnit: string): SupportedUnit[] => {
    const group = getUnitGroup(baseUnit as SupportedUnit);
    if (group === "WEIGHT") return ["GRAM", "KILOGRAM"];
    if (group === "VOLUME") return ["MILLILITER", "LITER"];
    return ["ITEM"];
  };

  const handleUnitChange = (productId: string, unit: SupportedUnit) => {
    setSelectedUnits(prev => ({ ...prev, [productId]: unit }));
  };

  const handleAddToCart = (product: Product) => {
    const unit = selectedUnits[product.id] || (product.baseUnit as SupportedUnit);
    setCart(prev => ({
      ...prev,
      [product.id]: {
        product,
        quantity: prev[product.id]?.quantity || 1,
        unit,
      },
    }));
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  const handleCartQtyChange = (productId: string, qtyStr: string) => {
    const val = parseFloat(qtyStr);
    if (isNaN(val) || val <= 0) return;
    setCart(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        quantity: val,
      },
    }));
  };

  const handleCartUnitChange = (productId: string, unit: SupportedUnit) => {
    setCart(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        unit,
      },
    }));
  };

  const handlePlaceOrder = async () => {
    setOrderError("");
    setOrderSuccess("");
    setOrderLoading(true);

    const items = Object.entries(cart).map(([productId, item]) => ({
      productId,
      orderedQuantity: item.quantity,
      orderedUnit: item.unit,
    }));

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to place quotation");
      }

      setOrderSuccess("Your quotation has been placed successfully!");
      setCart({});
      fetchProducts(search); // Refresh stock display
    } catch (err: any) {
      setOrderError(err.message || "An unexpected error occurred");
    } finally {
      setOrderLoading(false);
    }
  };

  // Helper to calculate total for display
  const calculateCartTotal = () => {
    return Object.values(cart).reduce((sum, item) => {
      const basePrice = parseFloat(item.product.basePrice);
      const conversionFactor = getConversionFactorToBase(item.unit);
      const pricePerUnit = basePrice * conversionFactor;
      return sum + item.quantity * pricePerUnit;
    }, 0);
  };

  const cartItemsCount = Object.keys(cart).length;

  return (
    <div className="flex flex-col min-h-screen bg-[#faf7f2] font-sans">
      <Navbar />

      {/* Tabs */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="max-w-7xl w-full mx-auto px-6 md:px-12 flex gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab("browse")}
            className={`py-4 border-b-2 transition-all ${
              activeTab === "browse"
                ? "border-black text-black"
                : "border-transparent text-zinc-400 hover:text-zinc-600"
            }`}
          >
            Browse Products
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`py-4 border-b-2 transition-all ${
              activeTab === "orders"
                ? "border-black text-black"
                : "border-transparent text-zinc-400 hover:text-zinc-600"
            }`}
          >
            My Quotations
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-12 space-y-8">
        
        {activeTab === "browse" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Catalog Grid (Left 2 columns on lg screens) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Header & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Browse Chemicals</h1>
                  <p className="text-zinc-500 text-xs">Verify rates and stock levels by toggling units.</p>
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search catalog..."
                  className="bg-white border border-zinc-300 rounded-lg px-4 py-2 text-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all w-full sm:max-w-xs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {products.length === 0 ? (
                  <div className="col-span-full bg-white border border-zinc-200 rounded-2xl p-12 text-center text-zinc-400">
                    No products found matching your search.
                  </div>
                ) : (
                  products.map((p) => {
                    const displayUnit = selectedUnits[p.id] || (p.baseUnit as SupportedUnit);
                    const availableUnits = getAvailableUnits(p.baseUnit);
                    
                    const baseQty = parseFloat(p.stockQuantity);
                    const basePrice = parseFloat(p.basePrice);
                    
                    const convertedQty = convertQuantityFromBase(baseQty, displayUnit);
                    const convertedPrice = convertPriceFromBase(basePrice, displayUnit);

                    return (
                      <div key={p.id} className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs hover:border-zinc-300 transition-all flex flex-col justify-between space-y-4">
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="inline-block px-2 py-0.5 bg-zinc-100 rounded text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                              {p.sku}
                            </span>
                            
                            <select
                              value={displayUnit}
                              onChange={(e) => handleUnitChange(p.id, e.target.value as SupportedUnit)}
                              className="bg-zinc-50 border border-zinc-200 rounded px-2 py-0.5 text-xs font-semibold text-zinc-600 focus:outline-none focus:ring-1 focus:ring-black"
                            >
                              {availableUnits.map((u) => (
                                <option key={u} value={u}>
                                  {getUnitAbbreviation(u)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <h3 className="text-base font-bold text-zinc-900">{p.name}</h3>
                          {p.description && (
                            <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2">
                              {p.description}
                            </p>
                          )}
                        </div>

                        <div className="pt-3 border-t border-zinc-100 grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Unit Price</span>
                            <div className="text-sm font-bold text-zinc-900 font-mono">
                              ₹{convertedPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                              <span className="text-[10px] text-zinc-400 font-normal ml-0.5">/{getUnitAbbreviation(displayUnit)}</span>
                            </div>
                          </div>

                          <div className="space-y-1 text-right">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Available Stock</span>
                            <div className="text-sm font-bold text-zinc-900 font-mono">
                              {convertedQty.toLocaleString("en-IN", { maximumFractionDigits: 3 })}
                              <span className="text-[10px] text-zinc-400 font-normal ml-1">{getUnitAbbreviation(displayUnit)}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleAddToCart(p)}
                          className="w-full mt-2 py-2 bg-black hover:bg-zinc-800 text-white rounded-lg font-semibold text-xs uppercase tracking-wider transition-all"
                        >
                          Select for Quotation
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Selection/Quotation Cart Drawer (Right column) */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs h-fit space-y-6">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-zinc-900">Your Quotation Request</h2>
                  <p className="text-zinc-500 text-xs">{cartItemsCount} item(s) selected.</p>
                </div>

                {orderError && (
                  <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-150 text-red-600">
                    {orderError}
                  </div>
                )}

                {orderSuccess && (
                  <div className="p-3 text-xs rounded-lg bg-emerald-50 border border-emerald-150 text-emerald-700">
                    {orderSuccess}
                  </div>
                )}

                {cartItemsCount === 0 ? (
                  <div className="py-12 text-center text-zinc-400 text-xs">
                    Select chemicals from the catalog to build your quotation.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="divide-y divide-zinc-100 max-h-[300px] overflow-y-auto pr-1">
                      {Object.entries(cart).map(([productId, item]) => {
                        const availableUnits = getAvailableUnits(item.product.baseUnit);
                        const basePrice = parseFloat(item.product.basePrice);
                        const factor = getConversionFactorToBase(item.unit);
                        const pricePerUnit = basePrice * factor;
                        const subtotal = item.quantity * pricePerUnit;

                        return (
                          <div key={productId} className="py-3 flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-sm font-semibold text-zinc-900">{item.product.name}</h4>
                                <span className="text-[10px] text-zinc-400 font-mono">{item.product.sku}</span>
                              </div>
                              <button
                                onClick={() => handleRemoveFromCart(productId)}
                                className="text-zinc-400 hover:text-red-600 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>

                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0.0001"
                                  step="any"
                                  value={item.quantity}
                                  onChange={(e) => handleCartQtyChange(productId, e.target.value)}
                                  className="w-16 bg-white border border-zinc-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-black text-center font-semibold font-mono"
                                />
                                <select
                                  value={item.unit}
                                  onChange={(e) => handleCartUnitChange(productId, e.target.value as SupportedUnit)}
                                  className="bg-zinc-50 border border-zinc-200 rounded px-2 py-1 text-xs font-semibold text-zinc-600 focus:outline-none"
                                >
                                  {availableUnits.map((u) => (
                                    <option key={u} value={u}>
                                      {getUnitAbbreviation(u)}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="text-right">
                                <div className="text-xs text-zinc-400">Rate: ₹{pricePerUnit.toFixed(2)}</div>
                                <div className="text-sm font-bold font-mono text-zinc-900">₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-4 border-t border-zinc-200 flex justify-between items-center">
                      <span className="text-sm font-semibold text-zinc-500">Estimated Total:</span>
                      <span className="text-xl font-bold font-mono text-zinc-900">
                        ₹{calculateCartTotal().toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <button
                      onClick={handlePlaceOrder}
                      disabled={orderLoading}
                      className="w-full py-3 bg-black hover:bg-zinc-800 text-white rounded-lg font-semibold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                      {orderLoading ? "Submitting Quotation..." : "Place Quotation"}
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          /* Quotation History List (orders state) */
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-6">
            <h2 className="text-xl font-bold text-zinc-900">Your Quotations / Orders</h2>

            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 text-xs">
                  You haven&apos;t placed any quotation request yet.
                </div>
              ) : (
                orders.map((o) => (
                  <div key={o.id} className="border border-zinc-100 rounded-xl p-5 hover:border-zinc-200 transition-all space-y-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <div>
                        <div className="text-xs text-zinc-400 font-mono">Quotation ID: {o.id}</div>
                        <div className="text-xs text-zinc-500">{new Date(o.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-base font-bold font-mono text-zinc-900">
                          Total: ₹{parseFloat(o.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-2xs font-extrabold tracking-wider uppercase ${
                          o.status === "PENDING" ? "bg-amber-50 text-amber-600 border border-amber-200" :
                          o.status === "APPROVED" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                          o.status === "REJECTED" ? "bg-red-50 text-red-600 border border-red-200" :
                          "bg-zinc-100 text-zinc-600 border border-zinc-200"
                        }`}>
                          {o.status}
                        </span>
                      </div>
                    </div>

                    <div className="divide-y divide-zinc-50">
                      {o.items.map((item) => (
                        <div key={item.id} className="py-2.5 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-semibold text-zinc-900">{item.product.name}</span>
                            <span className="text-[10px] text-zinc-400 font-mono ml-2">SKU: {item.product.sku}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-zinc-600">
                              {parseFloat(item.orderedQuantity)} {getUnitAbbreviation(item.orderedUnit as SupportedUnit)} @ ₹{parseFloat(item.pricePerUnit).toFixed(2)}/{getUnitAbbreviation(item.orderedUnit as SupportedUnit)}
                            </span>
                            <span className="font-mono font-bold text-zinc-900 ml-4">
                              ₹{parseFloat(item.subtotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
