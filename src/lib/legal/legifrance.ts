type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

let tokenCache: TokenCache | null = null;

function getPisteConfig() {
  const env = process.env.PISTE_ENV === "production" ? "production" : "sandbox";
  const clientId = process.env.PISTE_CLIENT_ID || "";
  const clientSecret = process.env.PISTE_CLIENT_SECRET || "";

  const oauthBase =
    env === "production"
      ? "https://oauth.piste.gouv.fr/api/oauth/token"
      : "https://sandbox-oauth.piste.gouv.fr/api/oauth/token";

  const apiBase =
    env === "production"
      ? "https://api.piste.gouv.fr/dila/legifrance/lf-engine-app"
      : "https://sandbox-api.piste.gouv.fr/dila/legifrance/lf-engine-app";

  if (!clientId || !clientSecret) {
    throw new Error("PISTE_CLIENT_ID / PISTE_CLIENT_SECRET manquants.");
  }

  return { env, clientId, clientSecret, oauthBase, apiBase };
}

export async function getPisteToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.accessToken;
  }

  const { clientId, clientSecret, oauthBase } = getPisteConfig();

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "openid",
  });

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(oauthBase, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PISTE token error: ${text}`);
  }

  const data = await res.json();
  const expiresIn = Number(data.expires_in || 3600);
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return tokenCache.accessToken;
}

export async function pisteRequest<T>(
  path: string,
  options: Omit<RequestInit, "body"> & { method?: string; body?: unknown } = {}
) {
  const token = await getPisteToken();
  const { apiBase } = getPisteConfig();
  const url = `${apiBase}${path}`;

  const res = await fetch(url, {
    method: options.method || "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PISTE API error: ${text}`);
  }

  return (await res.json()) as T;
}

export type LegifranceSearchPayload = Record<string, unknown>;

export async function legifranceSearch(payload: LegifranceSearchPayload) {
  return pisteRequest("/search", { method: "POST", body: payload });
}

export async function legifranceGetArticle(id: string) {
  return pisteRequest("/consult/getArticle", {
    method: "POST",
    body: { id },
  });
}

export async function legifranceLegiPart(textId: string, date: number) {
  return pisteRequest("/consult/legiPart", {
    method: "POST",
    body: { textId, date },
  });
}
