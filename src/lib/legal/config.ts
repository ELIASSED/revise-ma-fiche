export const legalConfig = {
  searchMode: process.env.LEGAL_SEARCH_MODE || "fulltext",
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
  chunkSize: Number(process.env.LEGAL_CHUNK_SIZE || 900),
  chunkOverlap: Number(process.env.LEGAL_CHUNK_OVERLAP || 120),
};
