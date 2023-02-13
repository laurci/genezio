import { AUTH_TOKEN } from "./index";
import axios from "axios";
import fs from "fs";

export const uploadToS3GenezioBackend = async (filePath: string) => {
    const region = "eu-central-1";
    const projectName = "test-s3-upload-speed-manual-upload";
    const className = "helloClass";
    const authToken = AUTH_TOKEN;
    
    const json = JSON.stringify({
        projectName: projectName,
        className: className,
        filename: filePath,
        region : region,
    });
    
    let sum = 0;
    let avg = 0;
    for (let i = 0; i < 10; i++) {
        const response: any = await axios({
            method: "GET",
            url: "https://dev.api.genez.io/core/deployment-url",
            data: json,
            headers: {Authorization: `Bearer ${authToken}`},
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        }).catch((error: Error) => {
            throw error;
        });
        
        const fileContent = fs.readFileSync(filePath);
        
        const start = new Date().getTime();
        // upload
        await axios({
            method: "PUT",
            url: response.data.presignedURL,
            data: fileContent,
            headers: {"Content-Type": "application/octet-stream"},
            maxContentLength: Infinity,
            maxBodyLength: Infinity    
        }).catch((error : Error) => {
            throw error
        });
        const end = new Date().getTime();
        sum += (end - start);
        console.log("[BECNHMARK] diff time: ", (end - start) / 1000, " s");
    }

    avg = sum / 10;
    console.log("[BECNHMARK] avg time: ", avg / 1000, " s")
}
