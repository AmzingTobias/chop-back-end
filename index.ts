import express, { Express } from "express";
import pool from "./data/data";
import { productTypeRouter } from "./routes/v1/product-types.routes";

import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { brandRouter } from "./routes/v1/brands.routes";
import { authRouter } from "./routes/v1/auth.routes";
import cookieParser from "cookie-parser";

// Swagger Docs
const swaggerSpecv1 = swaggerJSDoc({
  swaggerDefinition: {
    info: {
      title: "API documentation for chop",
      version: "1.0.0",
    },
    swagger: "2.0",
    basePath: "/v1",
  },
  apis: ["./routes/v1/*.routes.ts"],
});

const app: Express = express();
const port = process.env.PORT;

app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/v1/auth", authRouter);
app.use("/v1/product-types", productTypeRouter);
app.use("/v1/brands", brandRouter);

// Docs
app.use(
  "/v1/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpecv1, {
    customSiteTitle: "v1 Documentation",
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
