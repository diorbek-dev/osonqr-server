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
  owner: Number,
  activated: { type: Boolean, default: false } // 🔥 MUHIM
});

const User = mongoose.model("User", UserSchema);

// ===== BOT ULASH =====
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

  res.send("❌ Xato login");
});

// ===== ADMIN =====
app.get("/admin", async (req, res) => {
  if (!req.session.auth) return res.redirect("/login");

  const data = await User.find();

  let html = `
    <h2>Admin Panel</h2>

    <form method="POST" action="/add">
      <input name="code" placeholder="Code (A001)" required>
      <button>Qo‘shish</button>
    </form>

    <hr>
  `;

  data.forEach(u => {
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

// ===== 🔥 ENG MUHIM — USER PAGE (ENG OXIRIDA!) =====
app.get("/:code", async (req, res) => {
  const code = req.params.code.toUpperCase();

  const user = await User.findOne({ code });

  if (!user) {
    return res.send("Topilmadi ❌");
  }

  // ❌ AKTIV EMAS → BOTGA YO‘NALTIRADI
  if (!user.activated) {
    return res.redirect(`https://t.me/osonqr_bot?start=${code}`);
  }

  // ✅ AKTIV → INFO SAHIFA
  res.send(`
    <html>
    <body style="font-family:sans-serif;text-align:center;margin-top:50px">

    <h2>${user.name || "Ism yo‘q"}</h2>
    <p>${user.phone || ""}</p>

    ${user.phone ? `<a href="tel:${user.phone}">📞 Qo‘ng‘iroq</a><br><br>` : ""}
    ${user.telegram ? `<a href="https://t.me/${user.telegram}">Telegram</a><br><br>` : ""}
    ${user.instagram ? `<a href="https://instagram.com/${user.instagram}">Instagram</a>` : ""}

    </body>
    </html>
  `);
});

// ===== START =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server:", PORT));

// 🔥 EXPORT
module.exports = { User };
