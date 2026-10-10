"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CheckoutForm({
  tier,
  priceUsd,
  planName,
  userEmail,
  isStripeConfigured,
}: {
  tier: "pro" | "unlimited";
  priceUsd: number;
  planName: string;
  userEmail: string;
  isStripeConfigured: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format card number with spaces (e.g. 4242 4242 4242 4242)
  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardNumber(formatted);
  };

  // Format expiration (MM/YY)
  const handleExpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 2) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }
    setExp(raw);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCard = cardNumber.replace(/\s+/g, "");
    if (!name.trim()) {
      setError("Please enter the cardholder's name.");
      return;
    }
    if (cleanCard.length < 15) {
      setError("Please enter a valid 16-digit card number.");
      return;
    }
    if (exp.length < 5) {
      setError("Please enter a valid expiration date (MM/YY).");
      return;
    }
    if (cvc.length < 3) {
      setError("Please enter a valid 3-digit security code (CVC).");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/checkout/process", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tier,
          name,
          cardNumber: cleanCard,
          exp,
          cvc,
          zip,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Payment processing failed.");
      }

      // Success: redirect to dashboard with confirmation
      router.push(data.redirectUrl || `/dashboard?upgrade=success&tier=${tier}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed.");
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div>
          <h3 className="font-display text-xl font-bold text-white">Payment Method</h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            Account: <span className="font-medium text-white">{userEmail}</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <svg className="h-4 w-4 text-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>256-Bit SSL</span>
        </div>
      </div>

      {!isStripeConfigured && (
        <div className="mt-4 rounded-xl border border-mint/30 bg-mint/10 p-3.5 text-xs leading-relaxed text-zinc-300">
          <p className="font-bold text-mint">
            ⚡ Payment Sandbox Active
          </p>
          <p className="mt-1 text-[11px] text-zinc-300">
            You can test this checkout using any card (e.g. <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-mint">4242 4242 4242 4242</code>). When ready for live cards, add your <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-mint">STRIPE_SECRET_KEY</code> in Vercel.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* Name on Card */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300">
            Name on Card
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-mint focus:ring-1 focus:ring-mint"
          />
        </div>

        {/* Card Number */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300">
            Card Number
          </label>
          <div className="relative mt-1.5">
            <input
              type="text"
              required
              value={cardNumber}
              onChange={handleCardChange}
              placeholder="4242 4242 4242 4242"
              maxLength={19}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 pr-12 font-mono text-sm tracking-wider text-white placeholder-zinc-500 outline-none transition focus:border-mint focus:ring-1 focus:ring-mint"
            />
            <div className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-xs font-bold text-zinc-400">
              CARD
            </div>
          </div>
        </div>

        {/* Expiration & CVC */}
        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-zinc-300">
              Expiration Date
            </label>
            <input
              type="text"
              required
              value={exp}
              onChange={handleExpChange}
              placeholder="MM/YY"
              maxLength={5}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 font-mono text-sm text-white placeholder-zinc-500 outline-none transition focus:border-mint focus:ring-1 focus:ring-mint"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300">
              CVC / Security Code
            </label>
            <input
              type="text"
              required
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="123"
              maxLength={4}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 font-mono text-sm text-white placeholder-zinc-500 outline-none transition focus:border-mint focus:ring-1 focus:ring-mint"
            />
          </div>
        </div>

        {/* Billing Postal Code */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300">
            Billing ZIP / Postal Code
          </label>
          <input
            type="text"
            required
            value={zip}
            onChange={(e) => setZip(e.target.value.slice(0, 10))}
            placeholder="90210"
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-mint focus:ring-1 focus:ring-mint"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-3">
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-mint py-3.5 text-sm font-bold text-ink-950 transition hover:bg-mint-400 active:scale-[0.99] disabled:opacity-75"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin text-ink-950" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Processing Payment...</span>
              </>
            ) : (
              <span>Pay ${priceUsd}.00 / Month</span>
            )}
          </button>
        </div>

        <p className="text-center text-[11px] leading-relaxed text-zinc-500">
          By clicking &ldquo;Pay&rdquo;, you authorize a recurring monthly charge of ${priceUsd}.00 to your card. You can cancel at any time in your account dashboard.
        </p>
      </form>
    </div>
  );
}
