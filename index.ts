import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config();

const app: Express = express();
const port = process.env.PORT;

app.get("/", (request: Request, response: Response) => {
  response.send("Chop server");
});

app.listen(port, () => {
  console.log(`[Chop server]: Server is running on port: ${port}`);
});
