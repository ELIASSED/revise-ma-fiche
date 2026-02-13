import { legalConfig } from "./config";

type GroqMessage = { role: "system" | "user" | "assistant"; content: string };

export async function groqChat(messages: GroqMessage[]) {
  if (!legalConfig.groqApiKey) {
    throw new Error("GROQ_API_KEY manquant.");
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${legalConfig.groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: legalConfig.groqModel,
      messages,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq error: ${text}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  return content.trim();
}
