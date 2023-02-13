import { Command } from "commander";
import { exit } from "process";
import fs from 'fs';
import * as dotenv from 'dotenv'
import { uploadToS3 } from "./uploadToS3";
import { uploadToS3_adv } from "./uploadToS3_adv";
import { uploadToS3PresignedURL } from "./uploadToS3PresignedURL";
import { uploadToS3_new } from "./uploadToS3_new";
import { uploadToS3GenezioBackend } from "./uploadToS3GenezioBackend";
import { magic } from "./uploadMagic";
dotenv.config()

export const BUCKET_NAME = process.env.BUCKET_NAME || "";
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
export const AUTH_TOKEN = process.env.AUTH_TOKEN || "";
export const FILE_CHUNK_SIZE=5*1024*1024;

const program = new Command();

program
  .option('-f, --file [path]', 'path to file')

program.parse(process.argv);

const options = program.opts();

if (options.file)  {
    //Check if file exists
    const fileExists = fs.existsSync(options.file);
    if(!fileExists) {
        console.log("File not found");
        exit(1);
    }

    // Experiment 1 - Direct credentials
    // uploadToS3("benchmark_ts", options.file);

    // uploadToS3_adv("benchmark_ts_adv", options.file);

    uploadToS3_new("benchmark_ts_new", options.file);

    // Experiment 2 - Using Presigned URL
    // uploadToS3PresignedURL("benchmark_ts_presigned", options.file);

    // Experiment 3 - Using Genez.io Backend
    // uploadToS3GenezioBackend(options.file);

    // Experiment 4
    // magic(options.file);


} else {
    console.log("Missing required parameters");
    exit(1);
}
