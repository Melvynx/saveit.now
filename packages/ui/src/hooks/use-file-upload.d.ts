import type React from "react";
import { type ChangeEvent, type DragEvent, type InputHTMLAttributes } from "react";
export type FileMetadata = {
    name: string;
    size: number;
    type: string;
    url: string;
    id: string;
};
export type FileWithPreview = {
    file: File | FileMetadata;
    id: string;
    preview?: string;
};
export type FileUploadOptions = {
    maxFiles?: number;
    maxSize?: number;
    accept?: string;
    multiple?: boolean;
    initialFiles?: FileMetadata[];
    onFilesChange?: (files: FileWithPreview[]) => void;
    onFilesAdded?: (addedFiles: FileWithPreview[]) => void;
};
export type FileUploadState = {
    files: FileWithPreview[];
    isDragging: boolean;
    errors: string[];
};
export type FileUploadActions = {
    addFiles: (files: FileList | File[]) => void;
    removeFile: (id: string) => void;
    clearFiles: () => void;
    clearErrors: () => void;
    handleDragEnter: (e: DragEvent<HTMLElement>) => void;
    handleDragLeave: (e: DragEvent<HTMLElement>) => void;
    handleDragOver: (e: DragEvent<HTMLElement>) => void;
    handleDrop: (e: DragEvent<HTMLElement>) => void;
    handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
    openFileDialog: () => void;
    getInputProps: (props?: InputHTMLAttributes<HTMLInputElement>) => InputHTMLAttributes<HTMLInputElement> & {
        ref: React.Ref<HTMLInputElement>;
    };
};
export declare const useFileUpload: (options?: FileUploadOptions) => [FileUploadState, FileUploadActions];
export declare const formatBytes: (bytes: number, decimals?: number) => string;
//# sourceMappingURL=use-file-upload.d.ts.map