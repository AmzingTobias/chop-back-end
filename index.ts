import express, { Express } from "express";
import pool from "./data/data";
import { productTypeRouter } from "./routes/v1/product-types.routes";

import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

// Swagger Docs
const swaggerSpecv1 = swaggerJSDoc({
  swaggerDefinition: {
    info: {
      title: "V1 API documentation for chop",
      version: "1.0.0",
    },
    openapi: "3.0.0",
  },
  apis: ["./routes/v1/*.routes.ts"],
});

const app: Express = express();
const port = process.env.PORT;

app.use(express.json());

// Routes
app.use("/v1/product-types", productTypeRouter);

// Docs
app.use(
  "/v1/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpecv1, {
    customSiteTitle: "V1 Documentation",
    swaggerOptions: {
      supportedSubmitMethods: ["get"],
      layout: "BaseLayout",
    },
  })
);

// If no router was found for the request
app.use((_req, res, _next) => {
  res.status(404).send("Page not found");
});

const server = app.listen(port, () => {
  console.log(`[chop server]: Server is running on port: ${port}`);
});

server.on("close", () => {
  console.log("[chop server]: Server is exiting");
  pool.end();
});
