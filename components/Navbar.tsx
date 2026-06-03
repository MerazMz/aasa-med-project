"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  name: string;
  email: string;
  role: string;
}

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (err) {
        console.error("Failed to load user session", err);
      }
    }
    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to log out", err);
    }
  };

  return (
    <nav className="w-full bg-white border-b border-zinc-200 py-4 px-6 md:px-12 flex justify-between items-center">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-xl font-bold tracking-tight text-zinc-900">
          AsaMed Portal
        </Link>
        
        {user && (
          <div className="hidden md:flex gap-4 text-sm font-medium">
            {user.role === "ADMIN" && (
              <Link href="/admin" className="text-zinc-500 hover:text-zinc-900 transition-colors">
                Admin Panel
              </Link>
            )}
            {(user.role === "SELLER" || user.role === "ADMIN") && (
              <Link href="/seller" className="text-zinc-500 hover:text-zinc-900 transition-colors">
                Seller Panel
              </Link>
            )}
            {(user.role === "BUYER" || user.role === "ADMIN") && (
              <Link href="/buyer" className="text-zinc-500 hover:text-zinc-900 transition-colors">
                Buyer Catalog
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <div className="flex flex-col text-right">
              <span className="text-sm font-semibold text-zinc-900">{user.name}</span>
              <span className="text-xs text-zinc-400 font-mono tracking-wider uppercase">{user.role}</span>
            </div>
            <button
              onClick={handleLogout}
              className="py-1.5 px-3 border border-zinc-200 hover:border-zinc-300 rounded-lg text-xs font-semibold uppercase tracking-wider text-zinc-600 hover:text-zinc-900 transition-all"
            >
              Sign Out
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="py-1.5 px-3 bg-black hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
