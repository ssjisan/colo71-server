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

console.log("Environment:", process.env.NODE_ENV);
console.log("MONGO_URI exists:", Boolean(process.env.MONGO_URI));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => {
    console.error("MongoDB connection failed:", err.name, err.message);
  });

// Middlewares
const allowedOrigins = [
  "https://colo71-server.vercel.app",
  "https://colo71-admin.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: allowedOrigins,
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
