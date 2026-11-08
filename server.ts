import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.post("/api/gemini/advisor", async (req, res) => {
  try {
    const { prompt, context } = req.body;
    const systemInstruction = `You are MikraPay AI, an expert, witty, and friendly financial advisor for a private group of friends using the MikraPay eWallet. 
You give concise, actionable, and smart financial guidance in Vietnamese and English (primarily English unless asked in Vietnamese), helping friends manage their money, track group expenses, save for goals, and avoid overspending. Keep answers friendly and under 150 words.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `User Context / Balances & Transactions: ${JSON.stringify(context || {})}\n\nUser Question: ${prompt}`,
      config: {
        systemInstruction,
      }
    });

    res.json({ text: response.text || "I'm here to help you manage your funds!" });
  } catch (error: any) {
    console.error("Gemini Advisor Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI advice." });
  }
});

import { createServer as createViteServer } from "vite";
async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MikraPay Server running on http://localhost:${PORT}`);
  });
}

startServer();
