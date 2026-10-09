const dotenv = require("dotenv");

dotenv.config();

const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

// Route Imports
const serverStatusPage = require("./views/serverStatusPage.js");
const userRoutes = require("./routers/user.routes.js");
const authRoutes = require("./routers/auth.routes.js");
const pageRoutes = require("./routers/page.routes.js");
const roleRoutes = require("./routers/role.routes.js");

const storagePath = process.env.STORAGE_PATH || path.join(__dirname, "uploads");

const app = express();
const port = process.env.PORT || 8001;

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Middlewares
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

// Routers
app.use(pageRoutes);
app.use(roleRoutes);
app.use(userRoutes);
app.use(authRoutes);

// File storage
app.use("/file-storage", express.static(storagePath));

// Root route
app.get("/", (req, res) => {
  res.send(serverStatusPage);
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});
