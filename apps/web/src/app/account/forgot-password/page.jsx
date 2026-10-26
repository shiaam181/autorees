"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to send reset link.");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Could not send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0a0a0a] p-4 text-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-[#1a1a1a] p-8 shadow-2xl border border-white/5"
      >
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-600 mb-4">
            <span className="text-xl">🔐</span>
          </div>
          <h1 className="text-3xl font-bold">Forgot Password</h1>
          <p className="text-gray-400 mt-2">Enter your email to receive a reset link.</p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-500/10 p-4 text-sm text-green-400 border border-green-500/20 text-center">
              If that email is registered, we sent a reset link.
            </div>
            <a href="/account/signin" className="block text-center text-red-500 hover:text-red-400 font-medium">
              Back to sign in
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-400">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-lg bg-[#2a2a2a] border border-white/10 px-4 py-3 text-white outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50"
                required
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-red-600 px-4 py-3 text-base font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>

            <p className="text-center text-sm text-gray-400">
              Remembered it? <a href="/account/signin" className="text-red-500 hover:text-red-400 font-medium">Sign in</a>
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
