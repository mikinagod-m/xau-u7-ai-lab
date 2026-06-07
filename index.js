const express = require("express");
const OpenAI = require("openai");
const axios = require("axios");

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get("/", (req, res) => {
  res.json({
    bot: "XAU-U7 AI Lab",
    status: "running"
  });
});

function gradeRank(grade) {
  const ranks = { "C": 1, "B": 2, "A": 3, "A+": 4 };
  return ranks[grade] || 0;
}

app.post("/webhook", async (req, res) => {
  try {
    const secret = req.query.secret;

    if (secret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ error: "invalid secret" });
    }

    const signal = req.body;

    const goldResponse = await axios.get("https://www.goldapi.io/api/XAU/USD", {
      headers: {
        "x-access-token": process.env.GOLD_API_KEY,
        "Content-Type": "application/json"
      }
    });

    const goldPrice = goldResponse.data.price;

    const aiResponse = await openai.responses.create({
      model: "gpt-5",
      input: `
You are grading a 3-minute XAUUSD trade setup.

Signal:
${JSON.stringify(signal)}

Live Gold Price:
${goldPrice}

Return ONLY valid JSON:
{
  "grade": "A+ or A or B or C",
  "confidence": 0,
  "decision": "TRADE or WAIT",
  "reason": "short reason"
}

Rules:
- Only A+ or A should be TRADE.
- Confidence must be at least 75 for TRADE.
- Reject if entry is too far from live gold price.
- Reject if RR is below 2.
- Reject if HTF bias, BOS, MSS, liquidity sweep or VWAP are weak.
`
    });

    let result;
    try {
      result = JSON.parse(aiResponse.output_text);
    } catch {
      result = {
        grade: "C",
        confidence: 0,
        decision: "WAIT",
        reason: "AI returned invalid JSON"
      };
    }

    const minGrade = process.env.MIN_AI_GRADE || "A";
    const minConfidence = Number(process.env.MIN_CONFIDENCE || 75);

    const approved =
      result.decision === "TRADE" &&
      gradeRank(result.grade) >= gradeRank(minGrade) &&
      Number(result.confidence) >= minConfidence;

    if (!approved) {
      return res.json({
        success: true,
        sent: false,
        reason: "Trade rejected by AI filter",
        ai: result,
        signal,
        goldPrice
      });
    }

    const emoji = signal.direction === "LONG" ? "🟢" : "🔴";

    const telegramMessage =
`${emoji} XAU-U8 ${signal.direction}

🎯 Entry: ${signal.entry}
🛑 SL: ${signal.sl}
💰 TP: ${signal.tp}
⚖️ RR: ${signal.rr}`;

    await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: process.env.LAB_TELEGRAM_CHAT_ID,
        text: telegramMessage
      }
    );

    res.json({
      success: true,
      sent: true,
      ai: result,
      signal,
      goldPrice
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message
    });
  }
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
