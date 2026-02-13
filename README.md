## ReviseMaFiche MVP

MVP web pour analyser une fiche de paie, payer 1 € via Stripe (Apple Pay / Google Pay), et accéder à un rapport d’anomalies.

### Prérequis
- Node 18+
- PostgreSQL
- Compte Stripe (clés + webhook)

### Installation
```bash
npm install
```

### Variables d’environnement
Configurer `.env` :
```
DATABASE_URL="postgresql://user:password@localhost:5432/revisemafiche?schema=public"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
CRON_SECRET="change-me"
SMIC_HOURLY_EUR="11.65"
SMIC_MONTHLY_EUR="1766.92"
ENABLE_OCR_SCAN="false"
```

### Base de données
```bash
npx prisma migrate dev --name init
```

### Cadre juridique (architecture optionnelle)
Le schéma et les endpoints juridiques existent si tu veux activer un moteur
juridique plus tard. Ils ne sont pas requis pour le MVP d’analyse rapide.

#### Ingestion Legifrance (pilot)
Un script pilote permet d’ingérer des articles du Code du travail via PISTE
pour tester le RAG end‑to‑end.

```bash
npm run ingest:legifrance:code -- 2025-01-01 2
```

Variables requises:
- `PISTE_ENV`
- `PISTE_CLIENT_ID`
- `PISTE_CLIENT_SECRET`

#### RAG: performance & coût (référence)
Objectif: minimiser tokens + latence.

Paramètres recommandés:
- `chunkSize`: 700 caractères
- `chunkOverlap`: 120 caractères
- `topK`: 3–5 chunks max
- `maxTokens`: 300 pour la réponse
- `temperature`: 0.2

Stratégies:
- Ne pas appeler l’IA si `0` sources
- Dédupliquer les sources
- Envoyer uniquement les paragraphes pertinents
- Cache des résultats (question + date) si possible

Si besoin, exposer ces réglages en env vars:
- `LEGAL_CHUNK_SIZE`
- `LEGAL_CHUNK_OVERLAP`
- `GROQ_MODEL`

### Lancer le projet
```bash
npm run dev
```

### Nettoyage automatique (suppression J+7)
Appeler l’endpoint avec un token :
```bash
curl -X POST http://localhost:3000/api/cron/cleanup \
  -H "Authorization: Bearer change-me"
```

### Stripe webhook
```
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
