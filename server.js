const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");

const app = express();

// ===== MIDDLEWARE =====
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: true
}));

// ===== MONGODB =====
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB ulandi"))
  .catch(err => console.log("❌ MongoDB xato:", err));

// ===== MODEL =====
const UserSchema = new mongoose.Schema({
  code: String,
  name: String,
  phone: String,
  telegram: String,
  instagram: String,
  owner: Number
});

const User = mongoose.model("User", UserSchema);

// ===== BOT ULASH =====
const bot = require("./bot");

// ===== WEBHOOK ROUTE =====
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
      <input name="username"/><br><br>
      <input name="password" type="password"/><br><br>
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

  res.send("Xato login");
});

// ===== ADMIN =====
app.get("/admin", async (req, res) => {
  if (!req.session.auth) return res.redirect("/login");

  const data = await User.find();

  let html = `
    <h2>Admin Panel</h2>
    <a href="/logout">Chiqish</a><br><br>

    <form method="POST" action="/add">
      <input name="code" placeholder="Code"/><br>
      <input name="name" placeholder="Ism"/><br>
      <input name="phone" placeholder="Telefon"/><br>
      <input name="telegram" placeholder="Telegram"/><br>
      <input name="instagram" placeholder="Instagram"/><br>
      <button>Qo‘shish</button>
    </form>

    <hr>
  `;

  data.forEach(u => {
    html += `
      <p>${u.code} - ${u.name}
      <a href="/delete/${u.code}">❌</a></p>
    `;
  });

  res.send(html);
});

// ===== ADD =====
app.post("/add", async (req, res) => {
  await User.create(req.body);
  res.redirect("/admin");
});

// ===== DELETE =====
app.get("/delete/:code", async (req, res) => {
  await User.findOneAndDelete({ code: req.params.code });
  res.redirect("/admin");
});

// ===== USER PAGE =====
app.get("/:code", async (req, res) => {
  const user = await User.findOne({ code: req.params.code });

  if (!user) return res.send("Topilmadi");

  res.send(`
<!DOCTYPE html>
<html lang="uz">
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${user.name}</title>

<style>
body {
  margin: 0;
  font-family: 'Segoe UI', sans-serif;
  background: linear-gradient(135deg, #0f172a, #1e293b);
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.container {
  width: 100%;
  max-width: 400px;
  padding: 20px;
}

.card {
  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(15px);
  border-radius: 20px;
  padding: 25px;
  text-align: center;
  box-shadow: 0 0 30px rgba(0,0,0,0.3);
}

.name {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 5px;
}

.phone {
  opacity: 0.8;
  margin-bottom: 20px;
}

.btn {
  display: block;
  text-decoration: none;
  margin: 10px 0;
  padding: 14px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  transition: 0.3s;
}

.call {
  background: #22c55e;
}

.tg {
  background: #3b82f6;
}

.ig {
  background: #e1306c;
}

.btn:hover {
  transform: scale(1.05);
  opacity: 0.9;
}

.footer {
  margin-top: 15px;
  font-size: 12px;
  opacity: 0.5;
}
</style>

</head>

<body>

<div class="container">
  <div class="card">

    <div class="name">${user.name}</div>
    <div class="phone">${user.phone || ""}</div>

    ${user.phone ? `<a class="btn call" href="tel:${user.phone}">📞 Qo‘ng‘iroq</a>` : ""}

    ${user.telegram ? `<a class="btn tg" href="https://t.me/${user.telegram}">📲 Telegram</a>` : ""}

    ${user.instagram ? `<a class="btn ig" href="https://instagram.com/${user.instagram}">📸 Instagram</a>` : ""}

    <div class="footer">Powered by OsonQR 🚀</div>

  </div>
</div>

</body>
</html>
`);
});

// ===== START =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server:", PORT));
