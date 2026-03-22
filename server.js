const express = require("express");
const fs = require("fs");

require("./bot");

const app = express();

// DB
function getData() {
  try {
    return JSON.parse(fs.readFileSync("db.json"));
  } catch {
    return {};
  }
}

// HOME
app.get("/", (req, res) => {
  res.send("🚀 Server ishlayapti");
});

// USER PAGE
app.get("/:id", (req, res) => {
  const data = getData();
  const user = data[req.params.id];

  if (!user) {
    return res.send("❌ Topilmadi");
  }

  res.send(`
    <html>
    <body style="background:#0f172a;color:white;text-align:center;font-family:sans-serif;">
      <div style="margin-top:100px;">
        <h1>${user.name}</h1>
        <p>${user.phone}</p>

        <a href="tel:${user.phone}">
          <button style="padding:10px;margin:5px;background:green;color:white;">📞 Qo‘ng‘iroq</button>
        </a>

        <a href="https://t.me/${user.telegram}">
          <button style="padding:10px;margin:5px;background:blue;color:white;">Telegram</button>
        </a>

        <a href="https://instagram.com/${user.instagram}">
          <button style="padding:10px;margin:5px;background:pink;color:white;">Instagram</button>
        </a>
      </div>
    </body>
    </html>
  `);
});

// PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server ishlayapti"));
