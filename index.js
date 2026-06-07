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

app.post("/webhook", async (req, res) => {
  try {
    const secret = req.query.secret;

    if (secret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({
        error: "invalid secret"
      });
    }

    const signal = req.body;

    const response = await openai.responses.create({
      model: "gpt-5",
      input: `
Grade this XAUUSD setup.

${JSON.stringify(signal)}

Return:
- Grade (A+,A,B,C)
- Confidence %
- Decision (TRADE / WAIT)
- One sentence reason
`
    });

    const analysis = response.output_text;

    await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: process.env.LAB_TELEGRAM_CHAT_ID,
        text:
`🧪 XAU-U7 AI LAB

${analysis}`
      }
    );

    res.json({
      success: true,
      analysis
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
