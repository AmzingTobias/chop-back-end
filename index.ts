import express, { Express, Request, Response } from "express";
import pool from "./data/data";

const app: Express = express();
const port = process.env.PORT;

app.get("/", (request: Request, response: Response) => {
  response.send("Chop server");
});

const server = app.listen(port, () => {
  console.log(`[Chop server]: Server is running on port: ${port}`);
});

server.on("close", () => {
  console.log("[Chop server]: Server is exiting");
  pool.end();
});
