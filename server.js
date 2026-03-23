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

// ===== USER PAGE (PREMIUM DESIGN) =====
app.get("/:code", async (req, res) => {
  const code = req.params.code.toUpperCase();
  const user = await User.findOne({ code });

  if (!user) return res.send("Topilmadi ❌");

  if (!user.activated) {
    return res.redirect(`https://t.me/osonqr_bot?start=${code}`);
  }

res.send(`
<!DOCTYPE html>
<html lang="uz">
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>${user.name || "Profil"}</title>

<style>
body {
  margin: 0;
  font-family: -apple-system, sans-serif;
  background: #0f172a;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  .logo-img {
  width: 80px;
  height: 80px;
  object-fit: contain;
  margin-bottom: 10px;
}
}

/* CARD */
.card {
  width: 90%;
  max-width: 400px;
  background: #1e293b;
  border-radius: 20px;
  padding: 25px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}

/* LOGO */
.logo {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 15px;
  color: #38bdf8;
}

/* NAME */
.name {
  font-size: 26px;
  font-weight: bold;
}

/* PHONE */
.phone {
  opacity: 0.7;
  margin-bottom: 20px;
}

/* BUTTON */
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 14px;
  margin: 8px 0;
  border-radius: 12px;
  text-decoration: none;
  color: white;
  font-weight: 500;
  font-size: 16px;
}

/* COLORS */
.call { background: #22c55e; }
.tg { background: #229ED9; }
.ig { 
  background: linear-gradient(45deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5);
}

/* FOOTER */
.footer {
  margin-top: 20px;
  font-size: 13px;
  opacity: 0.6;
}
</style>
</head>

<body>

<div class="card">

https://i.postimg.cc/sDkRyrwC/photo_2026_03_23_21_54_07.jpg

<div class="name">${user.name || "Ism yo‘q"}</div>
<div class="phone">${user.phone || ""}</div>

${user.phone ? `<a class="btn call" href="tel:${user.phone}">📞 Qo‘ng‘iroq</a>` : ""}
${user.telegram ? `<a class="btn tg" href="https://t.me/${user.telegram}">✈️ Telegram</a>` : ""}
${user.instagram ? `<a class="btn ig" href="https://instagram.com/${user.instagram}">📸 Instagram</a>` : ""}

<div class="footer">
Powered by OsonQR 🚀 <br>
QR orqali kontaktlaringizni ulashing
</div>

</div>

</body>
</html>
`);
});

// ===== START =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server:", PORT));

module.exports = { User };
