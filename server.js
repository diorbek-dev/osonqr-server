const express = require("express");
const fs = require("fs");
const QRCode = require("qrcode");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* =======================
   📂 DATA O‘QISH
======================= */
function getData() {
  try {
    const data = fs.readFileSync("db.json", "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

/* =======================
   💾 DATA SAQLASH
======================= */
function saveData(data) {
  fs.writeFileSync("db.json", JSON.stringify(data, null, 2));
}

/* =======================
   🏠 TEST
======================= */
app.get("/", (req, res) => {
  res.send("Server ishlayapti 🚀");
});

/* =======================
   🔗 PROFILE PAGE
======================= */
app.get("/:id", (req, res) => {
  const data = getData();
  const user = data[req.params.id];

  if (!user) {
    return res.send(`
      <h2>Profil yo‘q ❌</h2>
      <a href="/register/${req.params.id}">Ro‘yxatdan o‘tish</a>
    `);
  }

  res.send(`
    <html>
    <body style="text-align:center; font-family:sans-serif;">
      <h1>${user.name}</h1>
      <p>${user.phone}</p>

      <a href="tel:${user.phone}">
        <button>📞 Qo‘ng‘iroq</button>
      </a>

      <br><br>

      <a href="/edit/${req.params.id}">
        <button>✏️ Edit</button>
      </a>
    </body>
    </html>
  `);
});

/* =======================
   📝 REGISTER PAGE
======================= */
app.get("/register/:id", (req, res) => {
  const id = req.params.id;

  res.send(`
    <h2>Ro‘yxatdan o‘tish</h2>
    <form method="POST" action="/register/${id}">
      <input name="name" placeholder="Ism" required /><br><br>
      <input name="phone" placeholder="Telefon" required /><br><br>
      <button type="submit">Saqlash</button>
    </form>
  `);
});

/* =======================
   💾 REGISTER SAVE + SECRET
======================= */
app.post("/register/:id", (req, res) => {
  const data = getData();
  const id = req.params.id;

  const secret = Math.random().toString(36).substring(2, 8);

  data[id] = {
    name: req.body.name,
    phone: req.body.phone,
    secret: secret
  };

  saveData(data);

  res.send(`
    <h2>Saqlandi ✅</h2>
    <p>🔐 Sening maxfiy koding:</p>
    <h1>${secret}</h1>
    <p>⚠️ Shu kodni saqla! Edit qilish uchun kerak bo‘ladi</p>
    <a href="/${id}">Profilga o‘tish</a>
  `);
});

/* =======================
   🔐 EDIT LOGIN (SECRET)
======================= */
app.get("/edit/:id", (req, res) => {
  res.send(`
    <h2>Parol kiriting</h2>
    <form method="POST" action="/edit/${req.params.id}">
      <input name="secret" placeholder="Secret code" required />
      <button type="submit">Kirish</button>
    </form>
  `);
});

/* =======================
   🔐 EDIT CHECK
======================= */
app.post("/edit/:id", (req, res) => {
  const data = getData();
  const id = req.params.id;
  const user = data[id];

  if (!user) return res.send("Topilmadi ❌");

  if (req.body.secret !== user.secret) {
    return res.send("Noto‘g‘ri kod ❌");
  }

  res.send(`
    <h2>Yangilash</h2>
    <form method="POST" action="/update/${id}">
      <input name="name" value="${user.name}" /><br><br>
      <input name="phone" value="${user.phone}" /><br><br>
      <input type="hidden" name="secret" value="${user.secret}" />
      <button type="submit">Saqlash</button>
    </form>
  `);
});

/* =======================
   💾 UPDATE SAVE
======================= */
app.post("/update/:id", (req, res) => {
  const data = getData();
  const id = req.params.id;
  const user = data[id];

  if (!user) return res.send("Topilmadi ❌");

  if (req.body.secret !== user.secret) {
    return res.send("Ruxsat yo‘q ❌");
  }

  data[id].name = req.body.name;
  data[id].phone = req.body.phone;

  saveData(data);

  res.redirect(`/${id}`);
});

/* =======================
   🔥 QR GENERATOR
======================= */
app.get("/qr/:id", async (req, res) => {
  const id = req.params.id;

  const url = `${req.protocol}://${req.get("host")}/${id}`;

  try {
    const qr = await QRCode.toDataURL(url);

    res.send(`
      <html>
      <body style="text-align:center; font-family:sans-serif;">
        <h2>QR Code</h2>
        <img src="${qr}" /><br><br>
        <p>${url}</p>
      </body>
      </html>
    `);
  } catch {
    res.send("Xatolik ❌");
  }
});

/* =======================
   🚀 SERVER
======================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server ishlayapti: " + PORT);
});
