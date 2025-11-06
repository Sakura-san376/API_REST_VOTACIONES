require("dotenv").config();
const express = require("express");
const app = express();

const basicAuth = require('./middlewares/auth');

const path = require("path");
const YAML = require("yamljs");
const swaggerUi = require("swagger-ui-express");

const PORT = process.env.PORT || 3000;

const swaggerDocument = YAML.load(path.join(__dirname, "openapi-voting.yaml"));

// Sirve el YAML crudo (opcional)
app.get("/openapi.yaml", (_req, res) => {
  res.sendFile(path.join(__dirname, "openapi-voting.yaml"));
});

// UI interactiva
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  explorer: true,
  customSiteTitle: "Voting API Docs",
}));

app.use(express.json());

// Routers existentes
const healthRouter = require("./routes/health.routes");
app.use("/api", healthRouter);

const votersRouter = require("./routes/voters.routes");
app.use("/api/voters", basicAuth, votersRouter);

const candidatesRouter = require("./routes/candidates.routes");
app.use("/api/candidates", basicAuth, candidatesRouter);

const votesRouter = require("./routes/votes.routes");
app.use("/api/votes", basicAuth, votesRouter);


// Nuevo: salud de la base de datos
const dbRouter = require("./routes/db.routes");
app.use("/api/db", dbRouter);

// 404 centralizado
app.use((req, res, next) => {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// Manejador de errores
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const isDev = process.env.NODE_ENV !== "production";
  const payload = { error: { message: err.message || "Internal Server Error" } };
  if (isDev && err.stack) payload.error.stack = err.stack;
  res.status(status).json(payload);
});

app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});
