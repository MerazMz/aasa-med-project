"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { 
  convertQuantityFromBase,
  convertPriceFromBase,
  convertQuantityToBase,
  convertPriceToBase,
  getBaseUnit,
  getUnitAbbreviation, 
  getUnitGroup,
  getConversionFactorToBase,
  SupportedUnit 
} from "@/lib/conversions";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  baseUnit: string;
  stockQuantity: string;
  basePrice: string;
  seller?: { name: string; email: string } | null;
  sellerId?: string | null;
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
  user: { name: string; email: string; role: string };
  items: OrderItem[];
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"quotations" | "products" | "users" | "simulation">("quotations");
  
  // Dynamic datasets
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  // Status controls
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // --- FORM STATES ---
  // Product Form
  const [prodName, setProdName] = useState("");
  const [prodSku, setProdSku] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodUnit, setProdUnit] = useState<SupportedUnit>("GRAM");
  const [prodQty, setProdQty] = useState("");
  const [prodPrice, setProdPrice] = useState("");

  // User Form
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState<"ADMIN" | "SELLER" | "BUYER">("BUYER");

  // Simulation Cart State (Buyer simulation)
  const [search, setSearch] = useState("");
  const [selectedUnits, setSelectedUnits] = useState<{ [productId: string]: SupportedUnit }>({});
  const [cart, setCart] = useState<{
    [productId: string]: {
      product: Product;
      quantity: number;
      unit: SupportedUnit;
    };
  }>({});

  // --- API FETCH FUNCTIONS ---
  const [currentUser, setCurrentUser] = useState<any>(null);

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

  const fetchProducts = async (searchTerm = "") => {
    try {
      // Admins should pull all products, search term passed
      const res = await fetch(`/api/products?search=${encodeURIComponent(searchTerm)}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
        
        // Initialize display unit selection mapping
        const unitsMap: { [productId: string]: SupportedUnit } = {};
        data.products.forEach((p: Product) => {
          unitsMap[p.id] = p.baseUnit as SupportedUnit;
        });
        setSelectedUnits(prev => ({ ...unitsMap, ...prev }));
      }
    } catch (err) {
      console.error("Failed to fetch products", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error("Failed to fetch current user", err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchProducts(search);
    fetchUsers();
    fetchCurrentUser();
  }, [search]);

  // --- ACTION HANDLERS ---
  
  // 1. Quotation management
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");

      setMessage(`Order status updated to ${newStatus}`);
      await fetchOrders();
      await fetchProducts(search); // stock may change
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // 2. Product creation
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const qty = parseFloat(prodQty);
    const price = parseFloat(prodPrice);

    if (isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) {
      setError("Quantity and Price must be positive numbers");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: prodName,
          sku: prodSku,
          description: prodDesc || null,
          inputUnit: prodUnit,
          inputQuantity: qty,
          inputPrice: price,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create product");

      setMessage("Product listed successfully!");
      setProdName("");
      setProdSku("");
      setProdDesc("");
      setProdQty("");
      setProdPrice("");
      await fetchProducts(search);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // 3. Product deletion
  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product? All referencing order items will be deleted cascade.")) return;
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete product");

      setMessage("Product deleted successfully");
      await fetchProducts(search);
      await fetchOrders();
    } catch (err: any) {
      setError(err.message || "Failed to delete product");
    } finally {
      setLoading(false);
    }
  };

  // 4. User creation
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userName,
          email: userEmail,
          password: userPassword,
          role: userRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");

      setMessage("User created successfully!");
      setUserName("");
      setUserEmail("");
      setUserPassword("");
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // 5. User deletion
  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user? All listed products, orders, and associated items will be deleted cascade!")) return;
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");

      setMessage("User and all associated data deleted successfully");
      await fetchUsers();
      await fetchProducts(search);
      await fetchOrders();
    } catch (err: any) {
      setError(err.message || "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  // --- SIMULATION CART HANDLERS ---
  const handleAddToCart = (product: Product, quantity: number, unit: SupportedUnit) => {
    if (quantity <= 0 || isNaN(quantity)) return;
    setCart(prev => ({
      ...prev,
      [product.id]: { product, quantity, unit }
    }));
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  const handleCheckoutSimulation = async () => {
    setError("");
    setMessage("");
    setLoading(true);

    const items = Object.values(cart).map(c => ({
      productId: c.product.id,
      orderedQuantity: c.quantity,
      orderedUnit: c.unit,
    }));

    if (items.length === 0) {
      setError("Your simulation cart is empty");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to place quotation");

      setMessage("Simulation quotation request placed successfully!");
      setCart({});
      await fetchOrders();
      await fetchProducts(search);
    } catch (err: any) {
      setError(err.message || "Failed to checkout");
    } finally {
      setLoading(false);
    }
  };

  // Calculation totals for the simulated cart
  const cartTotal = Object.values(cart).reduce((sum, item) => {
    const basePrice = parseFloat(item.product.basePrice);
    const factor = getConversionFactorToBase(item.unit);
    const pricePerUnit = basePrice * factor;
    return sum + item.quantity * pricePerUnit;
  }, 0);

  return (
    <div className="flex flex-col min-h-screen bg-[#faf7f2] font-sans">
      <Navbar />

      {/* Tab Switcher */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex space-x-6 overflow-x-auto">
          <button
            onClick={() => { setActiveTab("quotations"); setError(""); setMessage(""); }}
            className={`py-4 text-xs md:text-sm font-semibold tracking-wide border-b-2 transition-all whitespace-nowrap ${
              activeTab === "quotations" ? "border-black text-black" : "border-transparent text-zinc-400 hover:text-zinc-900"
            }`}
          >
            Quotation Requests
          </button>
          <button
            onClick={() => { setActiveTab("products"); setError(""); setMessage(""); }}
            className={`py-4 text-xs md:text-sm font-semibold tracking-wide border-b-2 transition-all whitespace-nowrap ${
              activeTab === "products" ? "border-black text-black" : "border-transparent text-zinc-400 hover:text-zinc-900"
            }`}
          >
            Products Catalog
          </button>
          <button
            onClick={() => { setActiveTab("users"); setError(""); setMessage(""); }}
            className={`py-4 text-xs md:text-sm font-semibold tracking-wide border-b-2 transition-all whitespace-nowrap ${
              activeTab === "users" ? "border-black text-black" : "border-transparent text-zinc-400 hover:text-zinc-900"
            }`}
          >
            User Management
          </button>
          <button
            onClick={() => { setActiveTab("simulation"); setError(""); setMessage(""); }}
            className={`py-4 text-xs md:text-sm font-semibold tracking-wide border-b-2 transition-all whitespace-nowrap ${
              activeTab === "simulation" ? "border-black text-black" : "border-transparent text-zinc-400 hover:text-zinc-900"
            }`}
          >
            Buyer Simulation
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-12 space-y-8">
        
        {/* Status Alerts */}
        {error && (
          <div className="p-4 text-sm rounded-xl bg-red-50 border border-red-200 text-red-600 max-w-md">
            {error}
          </div>
        )}
        {message && (
          <div className="p-4 text-sm rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 max-w-md">
            {message}
          </div>
        )}

        {/* ==================== TAB 1: QUOTATION REQUESTS ==================== */}
        {activeTab === "quotations" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-zinc-950">System Quotations Audit</h1>
              <button 
                onClick={fetchOrders}
                className="p-1.5 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all"
                title="Refresh"
              >
                Refresh
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center text-zinc-400">
                No orders/quotations have been placed in the system.
              </div>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-6">
                  
                  {/* Order Meta Header */}
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
                        Placed by: {o.user.name} <span className="text-zinc-400 font-normal">({o.user.email} • {o.user.role})</span>
                      </div>
                      <div className="text-xs text-zinc-400">Date: {new Date(o.createdAt).toLocaleString()}</div>
                    </div>

                    <div className="flex flex-col sm:items-end gap-2">
                      <span className="text-xl font-bold font-mono text-zinc-900">
                        Total: ₹{parseFloat(o.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                      
                      <div className="flex gap-2">
                        {o.status === "PENDING" && (
                          <>
                            <button
                              disabled={loading}
                              onClick={() => handleUpdateOrderStatus(o.id, "APPROVED")}
                              className="px-3 py-1.5 bg-black hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              disabled={loading}
                              onClick={() => handleUpdateOrderStatus(o.id, "REJECTED")}
                              className="px-3 py-1.5 border border-red-200 hover:border-red-300 text-red-600 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {o.status === "APPROVED" && (
                          <button
                            disabled={loading}
                            onClick={() => handleUpdateOrderStatus(o.id, "COMPLETED")}
                            className="px-3 py-1.5 bg-black hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Order Items Breakdown */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-sans">Item Level Verification</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-100 text-zinc-400 pb-2">
                            <th className="pb-2">Chemical / Product</th>
                            <th className="pb-2 text-right">Requested Qty</th>
                            <th className="pb-2 text-right">Base Conversion</th>
                            <th className="pb-2 text-right">Rate</th>
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
              ))
            )}
          </div>
        )}

        {/* ==================== TAB 2: PRODUCTS CATALOG ==================== */}
        {activeTab === "products" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Form to list product (Seller tool mock) */}
            <div className="lg:col-span-1 bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs h-fit space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-zinc-900">List Product as Admin</h2>
                <p className="text-zinc-500 text-xs">Lists the product under the Admin's account seller ownership.</p>
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Product Name</label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="e.g., Sodium Bicarbonate"
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">SKU / Code</label>
                  <input
                    type="text"
                    required
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    placeholder="e.g., SOD-BIC-1KG"
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Description</label>
                  <textarea
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    placeholder="Describe product"
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all min-h-[80px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Listing Unit</label>
                  <select
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value as SupportedUnit)}
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
                      value={prodQty}
                      onChange={(e) => setProdQty(e.target.value)}
                      placeholder="e.g., 100"
                      className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Price (INR)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      placeholder="e.g., 220"
                      className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-black hover:bg-zinc-800 text-white rounded-lg font-semibold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  List Product
                </button>
              </form>
            </div>

            {/* Right Column: Complete products list */}
            <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-6">
              <h2 className="text-xl font-bold text-zinc-900">System Inventory Catalog</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-150 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="pb-3">Product</th>
                      <th className="pb-3">SKU</th>
                      <th className="pb-3">Seller Owner</th>
                      <th className="pb-3 text-right">Base Stock</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-zinc-400">No products available.</td>
                      </tr>
                    ) : (
                      products.map((p) => (
                        <tr key={p.id} className="hover:bg-zinc-50/50">
                          <td className="py-4">
                            <div className="font-semibold text-zinc-900">{p.name}</div>
                            <div className="text-xs text-zinc-400 mt-0.5">Base Price: ₹{parseFloat(p.basePrice).toFixed(2)}/{getUnitAbbreviation(p.baseUnit as SupportedUnit)}</div>
                          </td>
                          <td className="py-4 font-mono text-xs text-zinc-600">{p.sku}</td>
                          <td className="py-4 text-xs text-zinc-500">
                            {p.sellerId ? (
                              <div>
                                <span className="font-bold block text-zinc-900">{p.seller?.name || "Seller User"}</span>
                                <span className="text-[10px] text-zinc-400">{p.seller?.email}</span>
                              </div>
                            ) : (
                              <span className="italic text-zinc-400">Global Admin</span>
                            )}
                          </td>
                          <td className="py-4 text-right font-mono text-zinc-900">
                            {parseFloat(p.stockQuantity).toLocaleString()} {getUnitAbbreviation(p.baseUnit as SupportedUnit)}
                          </td>
                          <td className="py-4 text-right">
                            <button
                              disabled={loading}
                              onClick={() => handleDeleteProduct(p.id)}
                              className="px-2 py-1 text-[10px] border border-red-200 hover:border-red-300 text-red-600 rounded font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ==================== TAB 3: USER MANAGEMENT ==================== */}
        {activeTab === "users" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Create User Form */}
            <div className="lg:col-span-1 bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs h-fit space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-zinc-900">Add New System User</h2>
                <p className="text-zinc-500 text-xs">Create accounts directly for Buyers, Sellers, or Admins.</p>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Full Name</label>
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="e.g., Jane Doe"
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Email Address</label>
                  <input
                    type="email"
                    required
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="e.g., jane@asamed.com"
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Password</label>
                  <input
                    type="password"
                    required
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">System Role</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as "ADMIN" | "SELLER" | "BUYER")}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                  >
                    <option value="BUYER">Buyer (Customer)</option>
                    <option value="SELLER">Seller (Merchant)</option>
                    <option value="ADMIN">Admin (Root)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-black hover:bg-zinc-800 text-white rounded-lg font-semibold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  Create User Account
                </button>
              </form>
            </div>

            {/* Right Column: Registered Users Table */}
            <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-6">
              <h2 className="text-xl font-bold text-zinc-900">System User Directory</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-150 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="pb-3">User Details</th>
                      <th className="pb-3">System Role</th>
                      <th className="pb-3">Registration Date</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-zinc-50/50">
                        <td className="py-4">
                          <div className="font-semibold text-zinc-900">{u.name}</div>
                          <div className="text-xs text-zinc-400">{u.email}</div>
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wide uppercase ${
                            u.role === "ADMIN" ? "bg-red-50 text-red-600 border border-red-200" :
                            u.role === "SELLER" ? "bg-amber-50 text-amber-600 border border-amber-200" :
                            "bg-blue-50 text-blue-600 border border-blue-200"
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-4 text-xs text-zinc-500">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 text-right">
                          {currentUser?.id === u.id ? (
                            <span className="text-[10px] text-zinc-400 font-semibold italic uppercase px-2 py-1 bg-zinc-100 rounded">Logged In</span>
                          ) : (
                            <button
                              disabled={loading}
                              onClick={() => handleDeleteUser(u.id)}
                              className="px-2 py-1 text-[10px] border border-red-200 hover:border-red-300 text-red-600 rounded font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ==================== TAB 4: BUYER SIMULATION ==================== */}
        {activeTab === "simulation" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Products Browser & Unit selector */}
            <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <h2 className="text-xl font-bold text-zinc-900">Simulate Catalog Browsing</h2>
                <input
                  type="text"
                  placeholder="Search chemicals/SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-white border border-zinc-300 rounded-lg px-3 py-1.5 text-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black max-w-xs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.length === 0 ? (
                  <div className="col-span-2 py-8 text-center text-zinc-400">No chemicals match your criteria.</div>
                ) : (
                  products.map((p) => {
                    const activeUnit = selectedUnits[p.id] || (p.baseUnit as SupportedUnit);
                    const stockVal = convertQuantityFromBase(parseFloat(p.stockQuantity), activeUnit);
                    const basePrice = parseFloat(p.basePrice);
                    const factor = getConversionFactorToBase(activeUnit);
                    const displayPrice = basePrice * factor;

                    return (
                      <div key={p.id} className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 space-y-4 hover:border-zinc-300 transition-colors">
                        <div>
                          <span className="text-[9px] font-bold tracking-wider uppercase text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">
                            {p.sku}
                          </span>
                          <h3 className="font-bold text-base text-zinc-900 mt-1">{p.name}</h3>
                          {p.description && <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{p.description}</p>}
                        </div>

                        {/* Conversions Card */}
                        <div className="bg-white border border-zinc-200 rounded-lg p-3 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-zinc-400 block uppercase font-semibold">Select Display Unit</span>
                            <select
                              value={activeUnit}
                              onChange={(e) => {
                                const newUnit = e.target.value as SupportedUnit;
                                setSelectedUnits(prev => ({ ...prev, [p.id]: newUnit }));
                              }}
                              className="mt-1 bg-white border border-zinc-200 rounded px-1.5 py-0.5 text-zinc-900 font-semibold"
                            >
                              {getUnitGroup(p.baseUnit as SupportedUnit) === "WEIGHT" ? (
                                <>
                                  <option value="GRAM">g (Grams)</option>
                                  <option value="KILOGRAM">kg (Kilograms)</option>
                                </>
                              ) : getUnitGroup(p.baseUnit as SupportedUnit) === "VOLUME" ? (
                                <>
                                  <option value="MILLILITER">mL (Milliliters)</option>
                                  <option value="LITER">L (Liters)</option>
                                </>
                              ) : (
                                <option value="ITEM">items</option>
                              )}
                            </select>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-400 block uppercase font-semibold">Calculated Stock</span>
                            <span className="font-mono font-bold text-zinc-900 block mt-1">
                              {stockVal.toLocaleString(undefined, { maximumFractionDigits: 4 })} {getUnitAbbreviation(activeUnit)}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                          <div>
                            <span className="text-[9px] font-bold text-zinc-400 block uppercase">Price per unit</span>
                            <span className="text-base font-bold font-mono text-zinc-900">
                              ₹{displayPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              <span className="text-xs text-zinc-400 font-normal"> / {getUnitAbbreviation(activeUnit)}</span>
                            </span>
                          </div>

                          <button
                            onClick={() => handleAddToCart(p, 1, activeUnit)}
                            className="bg-black hover:bg-zinc-800 text-white rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors"
                          >
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Shopping Cart Drawer Mock */}
            <div className="lg:col-span-1 bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs h-fit space-y-6">
              <h2 className="text-lg font-bold text-zinc-900">Simulated Cart</h2>
              
              {Object.keys(cart).length === 0 ? (
                <div className="text-center py-12 text-zinc-400 text-xs">Your simulation cart is empty. Add products from the catalog browser.</div>
              ) : (
                <div className="space-y-4">
                  <div className="divide-y divide-zinc-150">
                    {Object.values(cart).map((item) => {
                      const basePrice = parseFloat(item.product.basePrice);
                      const factor = getConversionFactorToBase(item.unit);
                      const pricePerUnit = basePrice * factor;
                      const subtotal = item.quantity * pricePerUnit;

                      return (
                        <div key={item.product.id} className="py-3 flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <span className="font-bold text-zinc-900 text-sm block">{item.product.name}</span>
                            <span className="text-xs text-zinc-400 block">
                              Rate: ₹{pricePerUnit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}/{getUnitAbbreviation(item.unit)}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="number"
                                step="any"
                                min="0.001"
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  handleAddToCart(item.product, val, item.unit);
                                }}
                                className="w-16 border border-zinc-300 rounded px-1.5 py-0.5 text-xs bg-white text-zinc-900"
                              />
                              <span className="text-xs font-bold text-zinc-500">{getUnitAbbreviation(item.unit)}</span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <span className="font-bold text-sm font-mono text-zinc-900">
                              ₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                            <button
                              onClick={() => handleRemoveFromCart(item.product.id)}
                              className="text-[10px] text-red-500 hover:text-red-700 uppercase tracking-wider font-semibold"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-zinc-200 pt-4 flex justify-between items-center">
                    <span className="text-sm font-bold uppercase tracking-wider text-zinc-500">Cart Total</span>
                    <span className="text-xl font-bold font-mono text-zinc-950">
                      ₹{cartTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <button
                    onClick={handleCheckoutSimulation}
                    disabled={loading}
                    className="w-full py-2 bg-black hover:bg-zinc-800 text-white rounded-lg font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
                  >
                    Submit Simulated Quotation
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
