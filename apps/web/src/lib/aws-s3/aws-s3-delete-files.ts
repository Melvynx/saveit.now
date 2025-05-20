import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "./aws-s3-client";

export const deleteFileFromS3 = async (params: { key: string }) => {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: params.key,
  });

  await s3.send(command);
};
