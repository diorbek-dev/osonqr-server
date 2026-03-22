const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();

app.use(express.json());
app.use(cors());

// 📥 DB yuklash
let db = {};
try {
  db = JSON.parse(fs.readFileSync("db.json"));
} catch (e) {
  db = {};
}

// 📥 SAQLASH
app.post("/save", (req, res) => {
  const { code, name, phone, telegram, instagram } = req.body;

  db[code] = {
    name,
    phone,
    telegram,
    instagram,
  };

  fs.writeFileSync("db.json", JSON.stringify(db, null, 2));

  console.log("SAQLANDI:", code, db[code]);

  res.send("ok");
});

// 🌐 VIEW PAGE
app.get("/:code", (req, res) => {
  const code = req.params.code;

  if (!db[code]) {
    return res.send("❌ Bu QR hali aktiv emas");
  }

  const data = db[code];

  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.name}</title>

    <style>
      body {
        font-family: sans-serif;
        text-align: center;
        padding: 40px;
        background: #f2f2f2;
      }

      h1 {
        margin-bottom: 20px;
      }

      .btn {
        display: block;
        width: 250px;
        margin: 10px auto;
        padding: 12px;
        border-radius: 8px;
        text-decoration: none;
        color: white;
        font-weight: bold;
      }

      .call { background: green; }
      .tg { background: #0088cc; }
      .insta { background: purple; }
    </style>
  </head>

  <body>

    <h1>${data.name}</h1>

    <a href="tel:${data.phone}" class="btn call">📞 Qo‘ng‘iroq</a>

    <a href="https://t.me/${data.telegram}" class="btn tg">Telegram</a>

    <a href="https://instagram.com/${data.instagram}" class="btn insta">Instagram</a>

  </body>
  </html>
  `);
});

// 🚀 SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server ishlayapti:", PORT);
});
