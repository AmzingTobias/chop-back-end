import express, { Express } from "express";
import pool from "./data/data";
import { productTypeRouter } from "./routes/v1/product-types.routes";

const app: Express = express();
const port = process.env.PORT;

app.use(express.json());

// Routes
app.use("/v1/product-types", productTypeRouter);

// If no router was found for the request
app.use((_req, res, _next) => {
  res.status(404).send("Page not found");
});

const server = app.listen(port, () => {
  console.log(`[Chop server]: Server is running on port: ${port}`);
});

server.on("close", () => {
  console.log("[Chop server]: Server is exiting");
  pool.end();
});
