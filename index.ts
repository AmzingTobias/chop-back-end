import express, { Express } from "express";
import pool from "./data/data";
import { productTypeRouter } from "./routes/v1/product-types.routes";
import jwt from "jsonwebtoken";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { brandRouter } from "./routes/v1/brands.routes";
import { productRouter } from "./routes/v1/products/product.routes";
import { authRouter } from "./routes/v1/auth/auth.routes";
import cookieParser from "cookie-parser";
import path from "path";
import { expressProductImagePath, imageRouter } from "./routes/v1/image.routes";
import cors from "cors";
import { baseProductRouter } from "./routes/v1/products/base-product.routes";
import { productFilterRouter } from "./routes/v1/products/filters.routes";
import { addressBookRouter } from "./routes/v1/auth/address-book.routes";
import { productQuestionsRouter } from "./routes/v1/products/product-questions.routes";
import { orderRouter } from "./routes/v1/orders.routes";
import productReviewsRouter from "./routes/v1/products/product-reviews.routes";
import productViewHistoryRouter from "./routes/v1/products/product-view-history.routes";
import expressWs from "express-ws";
import basketRouter from "./routes/v1/basket.routes";
import { TAccountAuth } from "./security/security";
import { EResponseStatusCodes } from "./common/response-types";
import discountRouter from "./routes/v1/discounts.routes";

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
  apis: ["./routes/v1/*.routes.ts", "./routes/v1/*/*.routes.ts"],
});

const app: Express = express();
const port = process.env.PORT;

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// Middleware to take the session id from cookies, if it exists, and add it to the request
app.use(
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const sessionId: string | undefined = req.cookies["sessionId"];
    req.sessionId = sessionId;
    next();
  }
);

// Setup websocket connetion support
expressWs(app, undefined, {
  wsOptions: {
    verifyClient: function (info, cb) {
      const cookieString = info.req.headers.cookie;
      const cookies: { [key: string]: string } = {};
      // Verify a user's authentication
      if (cookieString) {
        cookieString.split(";").forEach((cookie) => {
          const parts = cookie.split("=");
          const key = parts[0].trim();
          const value = parts[1]?.trim() || ""; // Handle cases where the cookie value is missing
          cookies[key] = value;
        });
      }
      if (typeof cookies["auth"] === "string") {
        jwt.verify(
          cookies["auth"],
          process.env.JWT_SECRET as string,
          (err, decode) => {
            if (err) {
              cb(false, EResponseStatusCodes.UNAUTHORIZED_CODE);
            } else {
              // Cast to any first to allow setting the user field
              if (!(info.req as any).user) {
                (info.req as any).user = {} as TAccountAuth;
              }
              // Assign the decode value to info.req.user
              (info.req as any).user = decode as TAccountAuth;
              cb(true);
            }
          }
        );
      }
    },
  },
});

// Tells express to display the static images that are found in this directory
app.use(
  expressProductImagePath,
  express.static(path.join(__dirname, "product-images"))
);

// Routes
app.use("/v1/auth/address", addressBookRouter);
app.use("/v1/auth", authRouter);

app.use("/v1/products/history", productViewHistoryRouter);
app.use("/v1/products/reviews", productReviewsRouter);
app.use("/v1/products/filters", productFilterRouter);
app.use("/v1/products/base", baseProductRouter);
app.use("/v1/products/questions", productQuestionsRouter);
app.use("/v1/products", productRouter);

app.use("/v1/discounts", discountRouter);
app.use("/v1/basket", basketRouter);
app.use("/v1/product-types", productTypeRouter);
app.use("/v1/brands", brandRouter);
app.use("/v1/images", imageRouter);
app.use("/v1/orders", orderRouter);

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
