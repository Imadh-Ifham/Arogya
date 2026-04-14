import cors from "cors";
import express from "express";
import { apiRouter } from "./routes/index.js";
import { logger } from "./shared/logger.js";
import { errorHandler } from "./shared/http/error-handler.js";
import { notFoundHandler } from "./shared/http/not-found.js";

export function buildApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use((req, _res, next) => {
    logger.info({ method: req.method, path: req.path }, "Incoming request");
    next();
  });

  app.use("/api/v1/telemedicine", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
