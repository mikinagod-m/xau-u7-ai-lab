const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.json({
    bot: "XAU-U7 AI Lab",
    status: "running"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
