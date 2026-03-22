const express = require("express");
const fs = require("fs");
const QRCode = require("qrcode");

const app = express();

// JSON o‘qish
function getData() {
  try {
    const data = fs.readFileSync("db.json", "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// 🔥 QR ROUTE
app.get("/qr/:id", async (req, res) => {
  const id = req.params.id;
  const url = `${req.protocol}://${req.get("host")}/${id}`;

  try {
    const qr = await QRCode.toDataURL(url);

    res.send(`
      <html>
        <body style="text-align:center;">
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

// 🔗 USER PAGE
app.get("/:id", (req, res) => {
  const data = getData();
  const user = data[req.params.id];

  if (!user) return res.send("Topilmadi ❌");

  res.send(`
    <h1>${user.name}</h1>
    <a href="tel:${user.phone}">📞 Qo‘ng‘iroq</a><br>
    <a href="https://t.me/${user.telegram}">Telegram</a><br>
    <a href="https://instagram.com/${user.instagram}">Instagram</a>
  `);
});

// TEST
app.get("/", (req, res) => {
  res.send("Server ishlayapti 🚀");
});

// START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server ishlayapti: " + PORT);
});
