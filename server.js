const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const QRCode = require("qrcode");

const app = express();

// ===== MIDDLEWARE =====
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: true
}));

// ===== DB =====
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB ulandi"))
  .catch(err => console.log("❌ MongoDB xato:", err));

// ===== MODEL =====
const UserSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  name: String,
  phone: String,
  telegram: String,
  instagram: String,
  owner: Number,
  activated: { type: Boolean, default: false }
});

const User = mongoose.model("User", UserSchema);

// ===== BOT =====
const bot = require("./bot");

// ===== WEBHOOK =====
app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// ===== HOME =====
app.get("/", (req, res) => {
  res.send("🚀 Server ishlayapti");
});

// ===== LOGIN =====
app.get("/login", (req, res) => {
  res.send(`
    <h2>Login</h2>
    <form method="POST">
      <input name="username" placeholder="login"><br><br>
      <input name="password" type="password" placeholder="parol"><br><br>
      <button>Kirish</button>
    </form>
  `);
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "12345") {
    req.session.auth = true;
    return res.redirect("/admin");
  }

  res.send("❌ Login xato");
});

// ===== ADMIN =====
app.get("/admin", async (req, res) => {
  if (!req.session.auth) return res.redirect("/login");

  const users = await User.find();

  let html = `
    <h2>Admin Panel</h2>

    <form method="POST" action="/add">
      <input name="code" placeholder="Code (A001)" required>
      <button>Qo‘shish</button>
    </form>

    <br><a href="/generate">100 ta kod yarat</a>
    <br><a href="/qr">QR ko‘rish</a>

    <hr>
  `;

  users.forEach(u => {
    html += `
      <p>
        ${u.code} — ${u.name || "bo‘sh"} 
        [${u.activated ? "✅" : "❌"}]
        <a href="/delete/${u.code}">❌</a>
      </p>
    `;
  });

  res.send(html);
});

// ===== ADD =====
app.post("/add", async (req, res) => {
  await User.create({
    code: req.body.code.toUpperCase(),
    activated: false
  });

  res.redirect("/admin");
});

// ===== DELETE =====
app.get("/delete/:code", async (req, res) => {
  await User.findOneAndDelete({ code: req.params.code });
  res.redirect("/admin");
});

// ===== GENERATE (cheksiz) =====
app.get("/generate", async (req, res) => {
  const last = await User.findOne().sort({ code: -1 });

  let start = 1;

  if (last && last.code) {
    const num = parseInt(last.code.replace("A", ""));
    start = num + 1;
  }

  for (let i = start; i < start + 100; i++) {
    const code = "A" + String(i).padStart(3, "0");

    await User.create({
      code,
      activated: false
    });
  }

  res.send(`✅ ${start} dan ${start + 99} gacha yaratildi`);
});

// ===== QR PAGE =====
app.get("/qr", async (req, res) => {
  const users = await User.find().limit(100);

  let html = `
  <html>
  <head>
  <title>QR list</title>
  <style>
    body { font-family: sans-serif; text-align: center; }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
    }
    .item {
      border: 1px solid #ddd;
      padding: 10px;
    }
    img {
      width: 120px;
    }
  </style>
  </head>
  <body>

  <h2>QR Kodlar</h2>
  <div class="grid">
  `;

  for (let user of users) {
    const url = `${process.env.DOMAIN}/${user.code}`;
    const qr = await QRCode.toDataURL(url);

    html += `
      <div class="item">
        <img src="${qr}"><br>
        ${user.code}
      </div>
    `;
  }

  html += `
  </div>
  </body>
  </html>
  `;

  res.send(html);
});

// ===== USER PAGE (ENG OXIRIDA) =====
app.get("/:code", async (req, res) => {
  const code = req.params.code.toUpperCase();

  const user = await User.findOne({ code });

  if (!user) return res.send("Topilmadi ❌");

  if (!user.activated) {
    return res.redirect(`https://t.me/osonqr_bot?start=${code}`);
  }

  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<style>
body {
  margin: 0;
  font-family: sans-serif;
  background: #0f172a;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.card {
  width: 90%;
  max-width: 380px;
  background: #1e293b;
  border-radius: 25px;
  padding: 25px;
  text-align: center;
}

.logo-img {
  width: 90px;
  border-radius: 20px;
  margin-bottom: 10px;
}

.name {
  font-size: 26px;
  font-weight: bold;
}

.phone {
  opacity: 0.7;
  margin-bottom: 20px;
}

.btn {
  display: block;
  padding: 15px;
  margin: 10px 0;
  border-radius: 14px;
  text-decoration: none;
  color: white;
}

.call { background: #22c55e; }
.tg { background: #229ED9; }
.ig { background: linear-gradient(45deg,#feda75,#d62976,#962fbf); }
</style>
</head>

<body>

<div class="card">

<img src="https://i.postimg.cc/sDkRyrwC/photo_2026_03_23_21_54_07.jpg" class="logo-img">

<div class="name">${user.name || "Ism yo‘q"}</div>
<div class="phone">${user.phone || ""}</div>

${user.phone ? `<a class="btn call" href="tel:${user.phone}">📞 Qo‘ng‘iroq</a>` : ""}
${user.telegram ? `<a class="btn tg" href="https://t.me/${user.telegram}">Telegram</a>` : ""}
${user.instagram ? `<a class="btn ig" href="https://instagram.com/${user.instagram}">Instagram</a>` : ""}

</div>

</body>
</html>
`);
});

// ===== START =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server:", PORT));

module.exports = { User };
