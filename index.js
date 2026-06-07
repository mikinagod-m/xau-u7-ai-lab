const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

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

    const emoji =
      signal.direction === "LONG"
        ? "🟢"
        : "🔴";

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
      signal
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
