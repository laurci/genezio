import { diag } from "@opentelemetry/api";
import express, { Express } from "express";
import * as log from 'loglevel';

const PORT: number = parseInt(process.env.PORT || "8080");
const app: Express = express();

app.get("/", (req, res) => {
  log.warn('HELLO');
  console.log(`Papacostea`);
  diag.warn('MY ASS');
  res.send("Hello World");
});

app.listen(PORT), () => {
  log.info(`Listening for papacostea on http://localhost:${PORT}`);
  // console.log(`Listening for requests on http://localhost:${PORT}`);
};