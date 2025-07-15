import { PutObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime-types";
import { env } from "../env";
import { s3 } from "./aws-s3-client";

export async function uploadFileToS3(params: {
  file: File;
  prefix: string;
  contentType?: string;
  fileName?: string;
}) {
  const fileBuffer = await params.file.arrayBuffer();
  const buffer = Buffer.from(fileBuffer);

  const fileExtension = params.file.name.split(".").pop();
  const uniqueFileName = `${params.prefix}/${params.fileName}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: uniqueFileName,
    Body: buffer,
    ContentType: params.contentType ?? params.file.type,
  });

  try {
    await s3.send(command);
  } catch {
    console.error("Invalid s3 client send");
    return;
  }

  return `${env.R2_URL}/${uniqueFileName}`;
}

/**
 * Upload a buffer directly to S3
 */
export async function uploadBufferToS3(params: {
  buffer: Buffer;
  prefix: string;
  fileName: string;
  contentType: string;
}): Promise<string | null> {
  try {
    const fileExtension = mime.extension(params.contentType) || "bin";
    const uniqueFileName = `${params.prefix}/${params.fileName}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: uniqueFileName,
      Body: params.buffer,
      ContentType: params.contentType,
    });

    await s3.send(command);
    return `${env.R2_URL}/${uniqueFileName}`;
  } catch (error) {
    console.error(`Error uploading buffer to S3:`, error);
    return null;
  }
}

/**
 * Upload a file from a URL directly to S3
 */
export async function uploadFileFromURLToS3(params: {
  url: string;
  prefix: string;
  fileName: string;
}): Promise<string | null> {
  if (env.CI) {
    return "https://placehold.co/500x500";
  }

  try {
    const response = await fetch(params.url);
    if (!response.ok) {
      console.error(`Failed to fetch URL: ${params.url}`);
      return null;
    }

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const fileExtension = mime.extension(contentType) || "bin";
    const buffer = await response.arrayBuffer();

    const uniqueFileName = `${params.prefix}/${params.fileName}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: uniqueFileName,
      Body: Buffer.from(buffer),
      ContentType: contentType,
    });

    await s3.send(command);
    return `${env.R2_URL}/${uniqueFileName}`;
  } catch (error) {
    console.error(`Error uploading file from URL: ${params.url}`, error);
    return null;
  }
}
