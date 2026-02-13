"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type JobResponse = {
  jobStatus: string;
  paymentStatus: string | null;
  result: {
    score: number;
    anomalies: {
      code: string;
      title: string;
      description: string;
      severity: "low" | "medium" | "high";
      confidence: number;
    }[];
    extracted: Record<string, string | number | null>;
  } | null;
  errorMessage?: string;
};

export default function ReportClient({ jobId }: { jobId: string }) {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [data, setData] = useState<JobResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const canFetch = useMemo(() => Boolean(jobId && token), [jobId, token]);

  useEffect(() => {
    if (!canFetch) return;

    let active = true;

    const fetchData = async () => {
      const res = await fetch(`/api/jobs/${jobId}?token=${token}`);
      const payload = await res.json();
      if (active) {
        setData(payload);
        setLoading(false);
      }
    };

    const kickoff = setTimeout(() => {
      setLoading(true);
      void fetchData();
    }, 0);

    const interval = setInterval(() => {
      void fetchData();
    }, 4000);

    return () => {
      active = false;
      clearTimeout(kickoff);
      clearInterval(interval);
    };
  }, [canFetch, jobId, token]);

  async function startCheckout() {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, accessToken: token }),
    });
    if (!res.ok) {
      const payload = await res.json();
      alert(payload.error || "Paiement indisponible.");
      return;
    }
    const payload = await res.json();
    window.location.href = payload.url;
  }

  if (!canFetch) {
    return (
      <div className="card rounded-3xl p-8">
        <h1 className="text-2xl font-semibold">Lien incomplet</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Le lien d’accès au rapport est invalide. Reviens depuis la page
          d’analyse.
        </p>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="card rounded-3xl p-8">
        <h1 className="text-2xl font-semibold">Chargement du rapport…</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Analyse en cours ou paiement en attente.
        </p>
      </div>
    );
  }

  if (data.jobStatus === "FAILED") {
    return (
      <div className="card rounded-3xl p-8">
        <h1 className="text-2xl font-semibold">Analyse impossible</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          {data.errorMessage || "Merci de réessayer avec un autre fichier."}
        </p>
      </div>
    );
  }

  const paid = data.paymentStatus === "PAID";

  return (
    <div className="space-y-6">
      <header className="card rounded-3xl p-8">
        <h1 className="text-2xl font-semibold">Rapport d’analyse</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Résultat informatif basé sur une extraction automatique.
        </p>
      </header>

      {!paid && (
        <div className="card rounded-3xl p-8">
          <h2 className="text-lg font-semibold">
            Paiement requis pour afficher le rapport complet
          </h2>
          <button
            onClick={startCheckout}
            className="mt-4 rounded-xl bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-white"
          >
            Payer 1 €
          </button>
        </div>
      )}

      {paid && data.result && (
        <div className="card rounded-3xl p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Score conformité</h2>
              <p className="text-sm text-[color:var(--muted)]">
                Basé sur 5 règles basiques.
              </p>
            </div>
            <div className="rounded-full border border-[color:var(--border)] px-5 py-3 text-2xl font-semibold">
              {data.result.score}/100
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {data.result.anomalies.length === 0 ? (
              <p className="text-sm text-[color:var(--muted)]">
                Aucune anomalie probable détectée.
              </p>
            ) : (
              data.result.anomalies.map((item) => (
                <div
                  key={item.code}
                  className="rounded-2xl border border-[color:var(--border)] bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{item.title}</h3>
                    <span className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
                      {item.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--muted)]">
                    {item.description}
                  </p>
                </div>
              ))
            )}
          </div>

          <p className="mt-8 text-sm text-[color:var(--muted)]">
            Besoin d’aide ? Compare avec ton employeur ou un expert paie.
          </p>
        </div>
      )}
    </div>
  );
}
