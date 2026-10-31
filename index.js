const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

// Existing route imports
const serverStatusPage = require("./views/serverStatusPage.js");
const userRoutes = require("./routers/user.routes.js");
const authRoutes = require("./routers/auth.routes.js");
const pageRoutes = require("./routers/page.routes.js");
const roleRoutes = require("./routers/role.routes.js");
const galleryRoutes = require("./routers/gallery.routes.js");
const blogRoutes = require("./routers/blog.routes.js");
const editorRoutes = require("./routers/editor.routes.js")

// Facility Visit Scheduler route
const facilityVisitRoutes = require("./routers/facilityVisit.routes.js");

const storagePath =
  process.env.STORAGE_PATH || path.resolve(__dirname, "../file-storage");

const app = express();
const port = process.env.PORT || 8081;

console.log("MONGO_URI exists:", Boolean(process.env.MONGO_URI));

const allowedOrigins = [
  "https://admin.colo71.com",
  "https://demo.colo71.com",
  "https://colo71.com",
  "http://localhost:5173",
  "http://localhost:3004",
];

// Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn("CORS origin rejected:", origin);
      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(morgan("dev"));
app.use(express.json({ limit: "20kb" }));
app.use(cookieParser());

// Existing routes — preserved
app.use(pageRoutes);
app.use(roleRoutes);
app.use(userRoutes);
app.use(authRoutes);
app.use(facilityVisitRoutes);
app.use(galleryRoutes);
app.use(blogRoutes);
app.use(editorRoutes);

// File storage
app.use("/file-storage", express.static(storagePath));

// Root route
app.get("/", (req, res) => {
  res.send(serverStatusPage);
});

// Start server after MongoDB connects
async function startServer() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is missing. Server startup aborted.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully");

    app.listen(port, () => {
      console.log(`Server is listening on port ${port}`);
    });
  } catch (err) {
    console.error("MongoDB connection failed:", err.name, err.message);

    process.exit(1);
  }
}

startServer();
