```js
const express = require("express");
const fs = require("fs");
const QRCode = require("qrcode");
const crypto = require("crypto");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 📦 DB o‘qish
function getData() {
  try {
    const data = fs.readFileSync("db.json", "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// 📦 DB yozish
function saveData(data) {
  fs.writeFileSync("db.json", JSON.stringify(data, null, 2));
}

// 🔥 1️⃣ QR GENERATOR
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
  } catch {
    res.send("Xatolik ❌");
  }
});

// 📝 2️⃣ REGISTER PAGE
app.get("/register/:id", (req, res) => {
  const id = req.params.id;

  res.send(`
    <html>
      <body style="text-align:center;">
        <h2>Ro‘yxatdan o‘tish</h2>
        <form method="POST" action="/register/${id}">
          <input name="name" placeholder="Ism" required /><br><br>
          <input name="phone" placeholder="Telefon" required /><br><br>
          <input name="telegram" placeholder="Telegram" /><br><br>
          <input name="instagram" placeholder="Instagram" /><br><br>
          <button type="submit">Saqlash</button>
        </form>
      </body>
    </html>
  `);
});

// 💾 3️⃣ SAVE USER
app.post("/register/:id", (req, res) => {
  const id = req.params.id;
  const data = getData();

  if (data[id]) {
    return res.send("Bu QR allaqachon ishlatilgan ❌");
  }

  const secret = crypto.randomBytes(8).toString("hex");

  data[id] = {
    name: req.body.name,
    phone: req.body.phone,
    telegram: req.body.telegram,
    instagram: req.body.instagram,
    secret: secret
  };

  saveData(data);

  res.send(`
    <h2>✅ Saqlandi!</h2>
    <p>Edit linkni saqlab qo‘ying:</p>
    <a href="/edit/${id}?key=${secret}">
      Edit qilish
    </a>
  `);
});

// ✏️ 4️⃣ EDIT PAGE
app.get("/edit/:id", (req, res) => {
  const id = req.params.id;
  const key = req.query.key;

  const data = getData();
  const user = data[id];

  if (!user || user.secret !== key) {
    return res.send("Ruxsat yo‘q ❌");
  }

  res.send(`
    <html>
      <body style="text-align:center;">
        <h2>Edit</h2>
        <form method="POST" action="/edit/${id}?key=${key}">
          <input name="name" value="${user.name}" /><br><br>
          <input name="phone" value="${user.phone}" /><br><br>
          <input name="telegram" value="${user.telegram}" /><br><br>
          <input name="instagram" value="${user.instagram}" /><br><br>
          <button>Saqlash</button>
        </form>
      </body>
    </html>
  `);
});

// 🔄 5️⃣ UPDATE USER
app.post("/edit/:id", (req, res) => {
  const id = req.params.id;
  const key = req.query.key;

  const data = getData();
  const user = data[id];

  if (!user || user.secret !== key) {
    return res.send("Ruxsat yo‘q ❌");
  }

  data[id] = {
    ...user,
    name: req.body.name,
    phone: req.body.phone,
    telegram: req.body.telegram,
    instagram: req.body.instagram
  };

  saveData(data);

  res.send("✅ Yangilandi!");
});

// 🔗 6️⃣ USER PAGE
app.get("/:id", (req, res) => {
  const data = getData();
  const user = data[req.params.id];

  if (!user) {
    return res.send("Topilmadi ❌");
  }

  res.send(`
    <html>
      <head>
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

// 🏠 TEST
app.get("/", (req, res) => {
  res.send("Server ishlayapti 🚀");
});

// 🚀 START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server ishlayapti: " + PORT);
});
```
