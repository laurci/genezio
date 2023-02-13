import { S3 } from "aws-sdk";
import axios from "axios";
import fs from "fs";
import { BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } from "./index";


const s3bucketPresignedURL = new S3({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: 'eu-central-1',
    signatureVersion: 'v4'
})

export const uploadToS3PresignedURL = async (s3Key: string, filePath: string) => {
    if(!filePath) {
        throw new Error("Missing required parameters");
    }

    let sum = 0;
    for (let i = 0; i < 10; i++) {
        // generate presigned url for upload in S3
        const url = s3bucketPresignedURL.getSignedUrl("putObject", {
            Bucket: BUCKET_NAME,
            Key: s3Key + "/" + filePath + "_" + i,
            Expires: 60*5,
        });
    
        const fileContent = fs.readFileSync(filePath);
    
        // upload 
        const start = new Date().getTime();
    
        await axios({
            method: "PUT",
            url: url,
            data: fileContent,
            headers: {"Content-Type": "application/octet-stream"},
            maxContentLength: Infinity,
            maxBodyLength: Infinity    
        }).catch((error : Error) => {
            throw error
        });
        const end = new Date().getTime();

        console.log("[BECNHMARK] diff time: ", (end - start) / 1000, " s")
        sum += (end - start);
    }
    const avg = sum / 10; 
    console.log("[BECNHMARK] avg diff time: ", avg / 1000, " s");
}