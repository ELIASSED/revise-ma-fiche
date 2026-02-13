import UploadClient from "./upload-client";

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4">
          <span className="text-sm uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Analyse de fiche de paie
          </span>
          <h1 className="text-4xl font-semibold leading-tight text-[color:var(--ink)] md:text-5xl">
            Détectez les anomalies possibles en 2 minutes.
          </h1>
          <p className="max-w-2xl text-lg text-[color:var(--muted)]">
            Outil automatisé, rapport clair, sans compte. 1 € par analyse.
          </p>
        </header>

        <section className="mt-10 grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="card rounded-3xl p-6 md:p-8">
            <UploadClient />
          </div>
          <aside className="card flex h-full flex-col gap-6 rounded-3xl p-6 md:p-8">
            <div>
              <h2 className="text-xl font-semibold">Ce que tu obtiens</h2>
              <ul className="mt-4 space-y-2 text-sm text-[color:var(--muted)]">
                <li>Rapport d’anomalies probables</li>
                <li>Explications simples</li>
                <li>Score de conformité</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-4 text-sm text-[color:var(--muted)]">
              <p className="font-medium text-[color:var(--ink)]">
                Confidentialité
              </p>
              <p className="mt-2">
                Les fichiers sont supprimés automatiquement après 7 jours.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
