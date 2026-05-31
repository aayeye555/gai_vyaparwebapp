import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Use regular Express json parser for APIs
app.use(express.json({ limit: "15mb" }));

// Initialize Google GenAI if key available
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Google GenAI SDK initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Google GenAI SDK:", err);
  }
} else {
  console.warn("No GEMINI_API_KEY found. AI functions will run in simulated preview mode.");
}

// ==========================================
// 1. AI ASSISTANT ENDPOINT
// ==========================================
app.post("/api/gemini/assist", async (req, res) => {
  const { prompt, context } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "No prompt provided" });
  }

  // Fallback if AI not initialized
  if (!ai) {
    return res.json({
      text: `[Preview Mode - Configure GEMINI_API_KEY for Real Outputs]\n\nBased on your query: "${prompt}", here is a suggested item description/HSN code:\n- Proposed description: professional consult & technical implementation services.\n- Recommended HSN/SAC Code: 998311 (Management and consultancy services).\n- Applicable GST Rate: 18%\n- Terms suggestion: Payment within 15 days of invoice date.`
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are an Indian business tax consultant, chartered accountant (CA), and small business copywriter assisting with VyaparFlow invoice app.
User request: ${prompt}
Relevant contextual information (e.g., current invoice/business data):
${JSON.stringify(context || {})}

Provide a highly professional, helpful, accurate response for Indian business guidelines, tax calculations, professional descriptions, or GST rule questions. Include exact GST rate suggestions (0%, 5%, 12%, 18%, 28%) and HSN/SAC classifications if relevant.`,
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in /api/gemini/assist:", error);
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

// ==========================================
// 2. AI ANALYTICS & INSIGHTS ENDPOINT
// ==========================================
app.post("/api/gemini/insights", async (req, res) => {
  const { invoices = [], expenses = [], businessName = "Our business" } = req.body;

  if (!ai) {
    // Generate a professional simulated insight profile
    const totalRev = invoices.reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0);
    const totalExp = expenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
    const netProfit = totalRev - totalExp;
    return res.json({
      text: `### 📈 VyaparFlow Indian Business Summary for **${businessName}**

#### 🏦 Financial Snapshot (Simulated)
- **Total Inflow (Revenue):** ₹${totalRev.toLocaleString("en-IN")}
- **Total Outflow (Expenses):** ₹${totalExp.toLocaleString("en-IN")}
- **Net Operating Cash:** ₹${netProfit.toLocaleString("en-IN")}

#### 💡 Suggested Business Advice
1. **Outstanding Collection**: Ensure UPI QR codes are included on your shareable WhatsApp PDFs to shorten collections times by 40%.
2. **GST Compliance**: Your primary billing looks like 18% services. Keep track of CGST & SGST components for easy return filing.
3. **Cash Flow Forecast**: Steady sales can support basic stock inventory expansion next cycle.`
    });
  }

  try {
    const totalRev = invoices.reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0);
    const totalExp = expenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Perform an automated small-business CA and business analytics study for an Indian enterprise named: "${businessName}".
Data provided:
- Invoices: ${JSON.stringify(invoices)}
- Expenses: ${JSON.stringify(expenses)}

Calculated totals:
- Net Revenue: ₹${totalRev}
- Net Expenses: ₹${totalExp}

Generate a concise, professional, highly contextual business analytics report in clean Markdown format. Give direct tax indicators, point out highest standing receivables, give suggestions on cashflow improvement, warn on low stock or inventory if relevant, and output clean GST guidelines based on IGST vs CGST/SGST balance.`,
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in /api/gemini/insights:", error);
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

// ==========================================
// 3. AI BILL OCR/SCANNER (IMAGE PARSING)
// ==========================================
app.post("/api/gemini/ocr", async (req, res) => {
  const { imageBase64, mimeType = "image/png" } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: "Missing image data" });
  }

  if (!ai) {
    // Return sample robust mock data structure
    return res.json({
      extracted: {
        vendorName: "Bharat Stationery & General Stores",
        invoiceNumber: "INV-2026-64B",
        date: "2026-05-15",
        gstin: "27AAAFB8839G1Z2",
        items: [
          { description: "HP Laserjet Pro Toner", rate: 4200, quantity: 1, gstRate: 18, amount: 4200, hsnSac: "844399" },
          { description: "Pack of Executive Note Pads (10x)", rate: 850, quantity: 1, gstRate: 12, amount: 850, hsnSac: "482010" }
        ],
        subtotal: 5050,
        gstPaid: 858,
        totalAmount: 5908,
        category: "Office Supplies",
        summary: "Scanned office stationary expense including premium ink toner."
      }
    });
  }

  try {
    const imagePart = {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    };

    const promptMessage = `You are an expert OCR and financial ledger parser. Check this purchase invoice or expense receipt and extract all relevant billing values.
Provide a clean JSON block conforming to this schema:
{
  "vendorName": "name of seller/vendor shop",
  "invoiceNumber": "invoice code",
  "date": "YYYY-MM-DD format based on receipt",
  "gstin": "15-digit Indian GSTIN code if visible, otherwise null",
  "items": [
    {
      "description": "Item description",
      "rate": number (price per item),
      "quantity": number,
      "gstRate": number (tax percentage e.g. 18 or 12 or 5),
      "amount": number,
      "hsnSac": "HSN or SAC code if visible, otherwise null"
    }
  ],
  "subtotal": subtotal amount before taxes,
  "gstPaid": total GST tax amount paid if visible,
  "totalAmount": total final billing value paid,
  "category": "Office Supplies" | "Rent" | "Salaries" | "Software & Tech" | "Travel & Transport" | "Inventory Purchase" | "Marketing" | "Consulting" | "Other Expense Category",
  "summary": "Short 1-sentence summary of purchase"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [
          imagePart,
          { text: promptMessage }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vendorName: { type: Type.STRING },
            invoiceNumber: { type: Type.STRING },
            date: { type: Type.STRING },
            gstin: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  rate: { type: Type.NUMBER },
                  quantity: { type: Type.NUMBER },
                  gstRate: { type: Type.NUMBER },
                  amount: { type: Type.NUMBER },
                  hsnSac: { type: Type.STRING }
                },
                required: ["description", "rate", "quantity"]
              }
            },
            subtotal: { type: Type.NUMBER },
            gstPaid: { type: Type.NUMBER },
            totalAmount: { type: Type.NUMBER },
            category: { type: Type.STRING },
            summary: { type: Type.STRING }
          }
        }
      }
    });

    const parsedData = JSON.parse(response.text.trim());
    res.json({ extracted: parsedData });
  } catch (error: any) {
    console.error("OCR Scanner Error:", error);
    res.status(500).json({ error: error?.message || "Parsing image failed" });
  }
});

// ==========================================
// 4. EXPORT UTILITY DATA GENERATOR
// ==========================================
app.post("/api/export/csv", (req, res) => {
  const { data = [], fields = [] } = req.body;
  if (!fields || fields.length === 0) {
    return res.status(400).send("No fields provided for export");
  }

  // Create CSV String
  let csvRows = [fields.join(",")];
  for (const item of data) {
    const vals = fields.map((f: string) => {
      let cellVal = item[f] !== undefined ? String(item[f]) : "";
      // Escape Quotes & Commas
      if (cellVal.includes(",") || cellVal.includes('"') || cellVal.includes("\n")) {
        cellVal = `"${cellVal.replace(/"/g, '""')}"`;
      }
      return cellVal;
    });
    csvRows.push(vals.join(","));
  }

  res.setHeader("Content-Type", "text/csv");
  res.attachment("vyaparflow-export.csv");
  res.status(200).send(csvRows.join("\n"));
});

// Vite/Static Web App Routing setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server matches production guidelines. Running on http://localhost:${PORT}`);
  });
}

startServer();
