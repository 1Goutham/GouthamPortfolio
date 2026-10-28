"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Goutham's side of the Margin wall: everything pinned, newest first, and a
 * way to take any of it down. Needs MARGIN_ADMIN_KEY; the key stays in this
 * tab only.
 */
export default function WallAdmin() {
  const [key, setKey] = useState("");
  const [draft, setDraft] = useState("");
  const [sketches, setSketches] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    try {
      const k = sessionStorage.getItem("margin-admin-key");
      if (k) setKey(k);
    } catch {}
  }, []);

  const load = useCallback(async (k) => {
    setError("");
    const r = await fetch("/api/margin", { headers: { "x-margin-key": k }, cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) {
      setKey("");
      try {
        sessionStorage.removeItem("margin-admin-key");
      } catch {}
      setError("That key isn't right.");
      return;
    }
    if (!d.configured) setError("The wall isn't set up: BLOB_READ_WRITE_TOKEN is missing.");
    setSketches(d.sketches || []);
  }, []);

  useEffect(() => {
    if (key) load(key);
  }, [key, load]);

  const remove = async (url) => {
    if (!confirm("Take this sketch off the wall? This can't be undone.")) return;
    setBusy(url);
    const r = await fetch("/api/margin", { method: "DELETE", headers: { "x-margin-key": key, "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
    setBusy("");
    if (r.ok) setSketches((s) => s.filter((x) => x.url !== url));
    else setError("Couldn't remove it. Try again.");
  };

  if (!key) {
    return (
      <main className="mx-auto max-w-sm px-6 py-24 font-outfit text-black">
        <h1 className="text-2xl font-bold">The wall</h1>
        <p className="mt-2 text-sm text-black/60">Your MARGIN_ADMIN_KEY, to manage what visitors pinned.</p>
        <form
          className="mt-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const k = draft.trim();
            if (!k) return;
            try {
              sessionStorage.setItem("margin-admin-key", k);
            } catch {}
            setKey(k);
          }}
        >
          <input
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-10 flex-1 rounded-full border border-black/15 px-4 outline-none focus:border-black"
            aria-label="Admin key"
            autoFocus
          />
          <button className="h-10 rounded-full bg-black px-5 text-sm font-medium text-white">Open</button>
        </form>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14 font-outfit text-black">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold">The wall</h1>
        <p className="text-sm text-black/55">{sketches ? `${sketches.length} pinned` : "Loading…"}</p>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <ul className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
        {sketches?.map((s) => (
          <li key={s.url} className="group relative rounded-lg border border-black/10 bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.url} alt="" className="aspect-square w-full object-contain" loading="lazy" />
            <div className="mt-2 flex items-center justify-between text-xs text-black/55">
              <span>{new Date(s.at).toLocaleString()}</span>
              <button
                type="button"
                onClick={() => remove(s.url)}
                disabled={busy === s.url}
                className="rounded-full border border-black/15 px-3 py-1 text-black hover:border-red-600 hover:bg-red-600 hover:text-white"
              >
                {busy === s.url ? "…" : "Remove"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
