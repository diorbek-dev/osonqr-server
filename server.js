const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");

const app = express();

// ===== MIDDLEWARE =====
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: true
}));

// ===== MONGODB CONNECT =====
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB ulandi"))
  .catch(err => console.log("❌ MongoDB xato:", err));

// ===== MODEL =====
const UserSchema = new mongoose.Schema({
  code: String,
  name: String,
  phone: String,
  telegram: String,
  instagram: String
});

const User = mongoose.model("User", UserSchema);

// ===== HOME =====
app.get("/", (req, res) => {
  res.send("🚀 Server ishlayapti");
});

// ===== LOGIN =====
app.get("/login", (req, res) => {
  res.send(`
    <h2>🔐 Login</h2>
    <form method="POST">
      <input name="username" placeholder="Login"/><br><br>
      <input name="password" type="password" placeholder="Parol"/><br><br>
      <button>Kirish</button>
    </form>
  `);
});

app.post("/login", (req, res) => {
  try {
    const { username, password } = req.body;

    if (username === "admin" && password === "12345") {
      req.session.auth = true;
      return res.redirect("/admin");
    }

    res.send("❌ Noto‘g‘ri login");
  } catch (err) {
    console.log(err);
    res.send("Xatolik");
  }
});

// ===== LOGOUT =====
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// ===== ADMIN =====
app.get("/admin", async (req, res) => {
  try {
    if (!req.session.auth) return res.redirect("/login");

    const data = await User.find();

    let html = `
      <h2>📊 Admin Panel</h2>
      <a href="/logout">🚪 Chiqish</a><br><br>

      <form method="POST" action="/add">
        <input name="code" placeholder="Code"/><br>
        <input name="name" placeholder="Ism"/><br>
        <input name="phone" placeholder="Telefon"/><br>
        <input name="telegram" placeholder="Telegram"/><br>
        <input name="instagram" placeholder="Instagram"/><br>
        <button>Qo‘shish</button>
      </form>

      <hr>

      <table border="1" cellpadding="5">
        <tr>
          <th>Kod</th>
          <th>Ism</th>
          <th>Telefon</th>
          <th>Telegram</th>
          <th>Instagram</th>
          <th>Action</th>
        </tr>
    `;

    data.forEach(u => {
      html += `
        <tr>
          <td>${u.code}</td>
          <td>${u.name || ""}</td>
          <td>${u.phone || ""}</td>
          <td>${u.telegram || ""}</td>
          <td>${u.instagram || ""}</td>
          <td>
            <a href="/edit/${u.code}">Edit</a>
            <a href="/delete/${u.code}">Delete</a>
          </td>
        </tr>
      `;
    });

    html += "</table>";

    res.send(html);

  } catch (err) {
    console.log(err);
    res.send("❌ Xatolik admin");
  }
});

// ===== ADD =====
app.post("/add", async (req, res) => {
  try {
    await User.create(req.body);
    res.redirect("/admin");
  } catch (err) {
    console.log(err);
    res.send("❌ Qo‘shishda xato");
  }
});

// ===== EDIT PAGE =====
app.get("/edit/:code", async (req, res) => {
  try {
    if (!req.session.auth) return res.redirect("/login");

    const user = await User.findOne({ code: req.params.code });

    if (!user) return res.send("Topilmadi");

    res.send(`
      <h2>Edit</h2>
      <form method="POST">
        <input name="name" value="${user.name || ""}"/><br>
        <input name="phone" value="${user.phone || ""}"/><br>
        <input name="telegram" value="${user.telegram || ""}"/><br>
        <input name="instagram" value="${user.instagram || ""}"/><br>
        <button>Saqlash</button>
      </form>
    `);

  } catch (err) {
    console.log(err);
    res.send("❌ Edit xato");
  }
});

// ===== EDIT =====
app.post("/edit/:code", async (req, res) => {
  try {
    await User.findOneAndUpdate(
      { code: req.params.code },
      req.body
    );
    res.redirect("/admin");
  } catch (err) {
    console.log(err);
    res.send("❌ Update xato");
  }
});

// ===== DELETE =====
app.get("/delete/:code", async (req, res) => {
  try {
    await User.findOneAndDelete({ code: req.params.code });
    res.redirect("/admin");
  } catch (err) {
    console.log(err);
    res.send("❌ Delete xato");
  }
});

// ===== USER PAGE =====
app.get("/:code", async (req, res) => {
  try {
    const user = await User.findOne({ code: req.params.code });

    if (!user) return res.send("❌ Topilmadi");

    res.send(`
      <h2>${user.name}</h2>
      <p>${user.phone}</p>
      ${user.telegram ? `<a href="https://t.me/${user.telegram}">Telegram</a><br>` : ""}
      ${user.instagram ? `<a href="https://instagram.com/${user.instagram}">Instagram</a>` : ""}
    `);

  } catch (err) {
    console.log(err);
    res.send("❌ User sahifa xato");
  }
});

// ===== GLOBAL ERROR HANDLER =====
process.on("uncaughtException", err => {
  console.log("❌ Uncaught:", err);
});

process.on("unhandledRejection", err => {
  console.log("❌ Promise:", err);
});

// ===== START =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server ishladi:", PORT));
