import { PutObjectCommand } from "@aws-sdk/client-s3";
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
  return `https://s3.${env.AWS_REGION}.amazonaws.com/${env.AWS_S3_BUCKET_NAME}/${uniqueFileName}`;
}
