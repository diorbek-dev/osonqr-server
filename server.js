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
  code: { type: String, unique: true }, // 🔥 SHU YERGA QO‘SHILDI
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
app.get("/generate", async (req, res) => {
  for (let i = 1; i <= 100; i++) {
    const code = "A" + String(i).padStart(3, "0");

    // 🔥 SHU YANGI QATOR
    const exist = await User.findOne({ code });

    if (!exist) {
      await User.create({
        code,
        activated: false
      });
    }
  }

  res.send("✅ Duplicatesiz kodlar yaratildi");
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
  background: radial-gradient(circle at top, #0f172a, #020617);
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

/* CARD */
.card {
  width: 90%;
  max-width: 380px;
  background: #1e293b;
  border-radius: 25px;
  padding: 25px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
  animation: fadeIn 0.6s ease;
}

/* LOGO */
.logo-img {
  width: 90px;
  height: 90px;
  object-fit: contain;
  margin-bottom: 10px;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(255,215,0,0.4);
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
  padding: 15px;
  margin: 10px 0;

  border-radius: 14px;
  text-decoration: none;
  color: white;
  font-weight: 600;
  font-size: 16px;

  transition: 0.2s;
}

.btn:hover {
  transform: scale(1.04);
}

/* COLORS */
.call {
  background: #22c55e;
}

.tg {
  background: #229ED9;
}

.ig {
  background: linear-gradient(45deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5);
}

/* FOOTER */
.footer {
  margin-top: 20px;
  font-size: 13px;
  opacity: 0.6;
}

/* ANIMATION */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
</head>

<body>

<div class="card">

<!-- 🔥 LOGO -->
<img src="https://i.postimg.cc/sDkRyrwC/photo_2026_03_23_21_54_07.jpg" class="logo-img">

<!-- USER INFO -->
<div class="name">${user.name || "Ism yo‘q"}</div>
<div class="phone">${user.phone || ""}</div>

<!-- BUTTONS -->
${user.phone ? `
<a class="btn call" href="tel:${user.phone}">
📞 Qo‘ng‘iroq
</a>
` : ""}

${user.telegram ? `
<a class="btn tg" href="https://t.me/${user.telegram}">
✈️ Telegram
</a>
` : ""}

${user.instagram ? `
<a class="btn ig" href="https://instagram.com/${user.instagram}">
📸 Instagram
</a>
` : ""}

<!-- FOOTER -->
<div class="footer">
Powered by <b>OsonQR 🚀</b><br>
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
