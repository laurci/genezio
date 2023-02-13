import { PutObjectCommandInput, S3Client } from "@aws-sdk/client-s3"
import { BUCKET_NAME } from "./index";
import { Upload } from "@aws-sdk/lib-storage";
import fs from "fs";

const s3Client = new S3Client({region: "us-east-1"});

export const uploadToS3_new = async (s3Key: string, filePath: string) => {
    const fileContent = fs.readFileSync(filePath);

    let start = 0;
    let end = 0;
    for (let i = 0; i < 10; i++) {
        try {
            const target : PutObjectCommandInput = { 
                Bucket: BUCKET_NAME,
                Key: s3Key+"/"+filePath+"_"+i,
                Body: fileContent,
            };
        
                start = new Date().getTime();
    
                const parallelUploads3 = new Upload({
                    client: s3Client,
                    queueSize: 10,
                    partSize: 1024 * 1024 * 5,
                    leavePartsOnError: false,
                    params: target,
                  });
            
                // parallelUploads3.on("httpUploadProgress", (progress) => {
                //     console.log(progress);
                // });
            
                await parallelUploads3.done().then(() => {
                    end = new Date().getTime();
                    console.log("[BENCHMARK] diff time: ", (end - start) / 1000, " s");
                });
            
        } catch (error) {
            console.log(error)
        }
    }
}
