"use client";

import { useState } from "react";

type UploadState =
  | { step: "idle" }
  | { step: "uploading" }
  | { step: "ready"; jobId: string; accessToken: string }
  | { step: "error"; message: string };

export default function UploadClient() {
  const [state, setState] = useState<UploadState>({ step: "idle" });
  const [file, setFile] = useState<File | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setState({ step: "uploading" });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      setState({ step: "ready", jobId: data.jobId, accessToken: data.accessToken });
    } catch (err) {
      setState({
        step: "error",
        message:
          err instanceof Error
            ? err.message
            : "Une erreur est survenue.",
      });
    }
  }

  async function startCheckout() {
    if (state.step !== "ready") return;
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: state.jobId,
        accessToken: state.accessToken,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Paiement indisponible.");
      return;
    }

    const data = await res.json();
    window.location.href = data.url;
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-[color:var(--ink)]">
          Fiche de paie (PDF)
          <input
            type="file"
            accept="application/pdf,image/*"
            className="mt-2 block w-full rounded-xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
            }}
          />
        </label>
        <button
          type="submit"
          disabled={!file || state.step === "uploading"}
          className="w-full rounded-xl bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state.step === "uploading"
            ? "Analyse en cours..."
            : "Analyser pour 1 €"}
        </button>
      </form>

      {state.step === "ready" && (
        <div className="rounded-2xl border border-[color:var(--border)] bg-white p-4 text-sm">
          <p className="font-medium text-[color:var(--ink)]">
            Analyse prête. Paiement requis pour afficher le rapport.
          </p>
          <button
            onClick={startCheckout}
            className="mt-4 w-full rounded-xl border border-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[color:var(--accent)] transition hover:bg-[color:var(--accent)] hover:text-white"
          >
            Payer 1 €
          </button>
          <a
            href={`/report/${state.jobId}?token=${state.accessToken}`}
            className="mt-3 block text-center text-xs text-[color:var(--muted)] underline"
          >
            Voir la page rapport
          </a>
        </div>
      )}

      {state.step === "error" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {state.message}
        </div>
      )}
    </div>
  );
}
