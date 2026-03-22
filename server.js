const express = require("express");
const fs = require("fs");
const session = require("express-session");

const app = express();

// SESSION
app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: true
}));

// BODY PARSE
app.use(express.urlencoded({ extended: true }));

// ===== DB (file) =====
function getData() {
  try {
    return JSON.parse(fs.readFileSync("db.json"));
  } catch {
    return {};
  }
}

function saveData(data) {
  fs.writeFileSync("db.json", JSON.stringify(data, null, 2));
}

// ===== HOME =====
app.get("/", (req, res) => {
  res.send("🚀 Server ishlayapti");
});

// ===== LOGIN =====
app.get("/login", (req, res) => {
  res.send(`
    <h2>🔐 Admin Login</h2>
    <form method="POST">
      <input name="username" placeholder="Login"/><br><br>
      <input name="password" type="password" placeholder="Parol"/><br><br>
      <button>Kirish</button>
    </form>
  `);
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "19072004") {
    req.session.auth = true;
    return res.redirect("/admin");
  }

  res.send("❌ Noto‘g‘ri login yoki parol");
});

// ===== LOGOUT =====
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// ===== ADMIN PANEL =====
app.get("/admin", (req, res) => {
  if (!req.session.auth) return res.redirect("/login");

  const data = getData();

  let html = `
    <h2>📊 Admin Panel</h2>
    <a href="/logout">🚪 Chiqish</a><br><br>

    <form method="POST" action="/add">
      <input name="code" placeholder="Code (A001)"/><br>
      <input name="name" placeholder="Ism"/><br>
      <input name="phone" placeholder="Telefon"/><br>
      <input name="telegram" placeholder="Telegram"/><br>
      <input name="instagram" placeholder="Instagram"/><br>
      <button>➕ Qo‘shish</button>
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

  Object.keys(data).forEach(code => {
    const u = data[code];

    html += `
      <tr>
        <td>${code}</td>
        <td>${u.name || ""}</td>
        <td>${u.phone || ""}</td>
        <td>${u.telegram || ""}</td>
        <td>${u.instagram || ""}</td>
        <td>
          <a href="/edit/${code}">✏️ Edit</a>
          <a href="/delete/${code}">❌ Delete</a>
        </td>
      </tr>
    `;
  });

  html += "</table>";

  res.send(html);
});

// ===== ADD USER =====
app.post("/add", (req, res) => {
  const data = getData();
  const { code, name, phone, telegram, instagram } = req.body;

  data[code] = { name, phone, telegram, instagram };

  saveData(data);
  res.redirect("/admin");
});

// ===== EDIT =====
app.get("/edit/:id", (req, res) => {
  if (!req.session.auth) return res.redirect("/login");

  const data = getData();
  const user = data[req.params.id];

  if (!user) return res.send("❌ Topilmadi");

  res.send(`
    <h2>Edit ${req.params.id}</h2>
    <form method="POST">
      <input name="name" value="${user.name || ""}" /><br>
      <input name="phone" value="${user.phone || ""}" /><br>
      <input name="telegram" value="${user.telegram || ""}" /><br>
      <input name="instagram" value="${user.instagram || ""}" /><br>
      <button>Saqlash</button>
    </form>
  `);
});

app.post("/edit/:id", (req, res) => {
  if (!req.session.auth) return res.redirect("/login");

  const data = getData();

  data[req.params.id] = {
    ...data[req.params.id],
    ...req.body
  };

  saveData(data);
  res.redirect("/admin");
});

// ===== DELETE =====
app.get("/delete/:id", (req, res) => {
  if (!req.session.auth) return res.redirect("/login");

  const data = getData();
  delete data[req.params.id];

  saveData(data);
  res.redirect("/admin");
});

// ===== USER PAGE (ENG OXIRIDA!) =====
app.get("/:id", (req, res) => {
  const data = getData();
  const user = data[req.params.id];

  if (!user) {
    return res.send("❌ Topilmadi");
  }

  res.send(`
    <h2>${user.name}</h2>
    <p>${user.phone}</p>
    ${user.telegram ? `<a href="https://t.me/${user.telegram}">Telegram</a><br>` : ""}
    ${user.instagram ? `<a href="https://instagram.com/${user.instagram}">Instagram</a>` : ""}
  `);
});

// ===== START =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server ishladi:", PORT));
