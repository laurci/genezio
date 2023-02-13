import {
    S3Client,
    CreateMultipartUploadCommand,
    CompleteMultipartUploadCommand,
    Part,
  } from "@aws-sdk/client-s3";
  
import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import Axios from "axios";
import fs from "fs"
import { BUCKET_NAME, FILE_CHUNK_SIZE } from "./index";

export async function magic(filepath : string) {
    const fileContent = fs.readFileSync(filepath);
    const s3 = new S3Client({region: "eu-central-1"});
  
    const partsCount = Math.ceil(fileContent.length / FILE_CHUNK_SIZE);
    const uploadId = await initiateMultipartUpload(
        s3,
        BUCKET_NAME,
        "benchmark_ts_magic",
        "binary/octet-stream"
      );

    const presignedUrls = await generatePresignedUrlsParts(
        s3,
        uploadId,
        partsCount,
        BUCKET_NAME,
        "benchmark_ts_magic"
    );

    const start = new Date().getTime();
    const parts = await uploadParts(fileContent, presignedUrls);
    const end = new Date().getTime();
    console.log("[BENCHMARK] diff time: ", (end - start) / 1000, " s");
    await completeMultiUpload(s3, BUCKET_NAME, "benchmark_ts_magic", uploadId, parts);
}

export async function initiateMultipartUpload(
    s3: S3Client,
    bucket: string,
    key: string,
    contentType: string
  ) {
    const res = await s3.send(
      new CreateMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
      })
    );
  
    if (!res.UploadId) {
      throw new Error("UploadId undefined");
    }

    console.log("UploadId: ", res.UploadId)
  
    return res.UploadId;
  }
  
  export async function completeMultiUpload(
    s3: S3Client,
    bucket: string,
    key: string,
    uploadId: string,
    parts: Part[]
  ) {
    await s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      })
    );
  }

export async function generatePresignedUrlsParts(
  s3: S3Client,
  uploadId: string,
  parts: number,
  bucket: string,
  key: string
) {
  const baseParams = {
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
  };

  const promises = [];

  for (let index = 0; index < parts; index++) {
    promises.push(
      getSignedUrl(
        s3,
        new UploadPartCommand({
          ...baseParams,
          PartNumber: index + 1,
        }),
        { expiresIn: 3600 }
      )
    );
  }

  const res = await Promise.all(promises);

  return res.reduce((map, url, index) => {
    map[index] = url;
    return map;
  }, {} as Record<number, string>);
}

export async function uploadParts(file: Buffer, urls: Record<number, string>) {
  const axios = Axios.create();
  delete axios.defaults.headers.put["Content-Type"];

  const keys = Object.keys(urls);
  const promises = [];

  for (const indexStr of keys) {
    const index = parseInt(indexStr);
    const start = index * FILE_CHUNK_SIZE;
    const end = (index + 1) * FILE_CHUNK_SIZE;
    const blob =
      index < keys.length ? file.slice(start, end) : file.slice(start);

    promises.push(axios.put(urls[index], blob));
  }

  const resParts = await Promise.all(promises);

  return resParts.map((part, index) => ({
    ETag: (part as any).headers.etag,
    PartNumber: index + 1,
  }));
}
