const QRCode = require("qrcode");
const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.json());

// Ma'lumotni o‘qish
function getData() {
  try {
    const data = fs.readFileSync("db.json", "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
}

// Asosiy sahifa
app.get("/:id", (req, res) => {
  const data = getData();
  const user = data[req.params.id];

  if (!user) {
    return res.send("Topilmadi ❌");
  }

  res.send(`
  <html>
    <head>
      <title>${user.name}</title>
      <style>
        body {
          font-family: sans-serif;
          text-align: center;
          padding: 40px;
        }
        .btn {
          display: block;
          margin: 10px auto;
          padding: 12px;
          border-radius: 8px;
          text-decoration: none;
          color: white;
          font-weight: bold;
          width: 200px;
        }
        .call { background: green; }
        .tg { background: #0088cc; }
        .insta { background: purple; }
      </style>
    </head>
    <body>
      <h1>${user.name}</h1>

      <a href="tel:${user.phone}" class="btn call">📞 Qo‘ng‘iroq</a>
      <a href="https://t.me/${user.telegram}" class="btn tg">Telegram</a>
      <a href="https://instagram.com/${user.instagram}" class="btn insta">Instagram</a>
    </body>
  </html>
  `);
});

// Test route
app.get("/", (req, res) => {
  res.send("Server ishlayapti 🚀");
});

// PORT (ENG MUHIM)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server ishlayapti: " + PORT);
});
app.get("/qr/:id", async (req, res) => {
  const id = req.params.id;
  const url = `${req.protocol}://${req.get("host")}/${id}`;

  try {
    const qr = await QRCode.toDataURL(url);

    res.send(`
      <html>
        <body style="text-align:center; font-family:sans-serif;">
          <h2>QR Code</h2>
          <img src="${qr}" />
          <p>${url}</p>
        </body>
      </html>
    `);
  } catch (err) {
    res.send("Xatolik ❌");
  }
});
