import { S3 } from "aws-sdk";
import fs from "fs";
import { ManagedUpload, PutObjectRequest } from "aws-sdk/clients/s3";
import { BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } from "./index";

const s3bucket = new S3({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
});

export const uploadToS3_adv = async (s3Key: string, filePath: string) => {
    if(!filePath) {
        throw new Error("Missing required parameters");
    }

    const fileContent = fs.readFileSync(filePath);
    
    try {
        let sum = 0;
        for (let i = 0; i < 10; i++) {
            const params: PutObjectRequest = {
                Bucket: BUCKET_NAME,
                Key: s3Key+"/"+filePath+"_"+i,
                Body: fileContent,
            };

            const options: ManagedUpload.ManagedUploadOptions = {
                queueSize: 5,
                partSize: 1024 * 1024 * 5,
            }
            const start = new Date().getTime();
            const res = await s3bucket.upload(params, options).promise();
            const end = new Date().getTime();

            console.log("[BECNHMARK] diff time: ", (end - start) / 1000, " s");

            sum += (end - start);
        }
        const avg = sum / 10; 
        console.log("[BECNHMARK] avg diff time: ", avg / 1000, " s");
    } catch (error) {
        console.log(error)
        return
    }
}
