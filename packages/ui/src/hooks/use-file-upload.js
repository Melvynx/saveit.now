"use client";
import { useCallback, useRef, useState, } from "react";
export const useFileUpload = (options = {}) => {
    const { maxFiles = Infinity, maxSize = Infinity, accept = "*", multiple = false, initialFiles = [], onFilesChange, onFilesAdded, } = options;
    const [state, setState] = useState({
        files: initialFiles.map((file) => ({
            file,
            id: file.id,
            preview: file.url,
        })),
        isDragging: false,
        errors: [],
    });
    const inputRef = useRef(null);
    const validateFile = useCallback((file) => {
        if (file instanceof File) {
            if (file.size > maxSize) {
                return `File "${file.name}" exceeds the maximum size of ${formatBytes(maxSize)}.`;
            }
        }
        else {
            if (file.size > maxSize) {
                return `File "${file.name}" exceeds the maximum size of ${formatBytes(maxSize)}.`;
            }
        }
        if (accept !== "*") {
            const acceptedTypes = accept.split(",").map((type) => type.trim());
            const fileType = file instanceof File ? file.type || "" : file.type;
            const fileExtension = `.${file instanceof File ? file.name.split(".").pop() : file.name.split(".").pop()}`;
            const isAccepted = acceptedTypes.some((type) => {
                if (type.startsWith(".")) {
                    return fileExtension.toLowerCase() === type.toLowerCase();
                }
                if (type.endsWith("/*")) {
                    const baseType = type.split("/")[0];
                    return fileType.startsWith(`${baseType}/`);
                }
                return fileType === type;
            });
            if (!isAccepted) {
                return `File "${file instanceof File ? file.name : file.name}" is not an accepted file type.`;
            }
        }
        return null;
    }, [accept, maxSize]);
    const createPreview = useCallback((file) => {
        if (file instanceof File) {
            return URL.createObjectURL(file);
        }
        return file.url;
    }, []);
    const generateUniqueId = useCallback((file) => {
        if (file instanceof File) {
            return `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        }
        return file.id;
    }, []);
    const clearFiles = useCallback(() => {
        setState((prev) => {
            // Clean up object URLs
            prev.files.forEach((file) => {
                if (file.preview &&
                    file.file instanceof File &&
                    file.file.type.startsWith("image/")) {
                    URL.revokeObjectURL(file.preview);
                }
            });
            if (inputRef.current) {
                inputRef.current.value = "";
            }
            const newState = {
                ...prev,
                files: [],
                errors: [],
            };
            onFilesChange?.(newState.files);
            return newState;
        });
    }, [onFilesChange]);
    const addFiles = useCallback((newFiles) => {
        if (!newFiles || newFiles.length === 0)
            return;
        const newFilesArray = Array.from(newFiles);
        const errors = [];
        // Clear existing errors when new files are uploaded
        setState((prev) => ({ ...prev, errors: [] }));
        // In single file mode, clear existing files first
        if (!multiple) {
            clearFiles();
        }
        // Check if adding these files would exceed maxFiles (only in multiple mode)
        if (multiple &&
            maxFiles !== Infinity &&
            state.files.length + newFilesArray.length > maxFiles) {
            errors.push(`You can only upload a maximum of ${maxFiles} files.`);
            setState((prev) => ({ ...prev, errors }));
            return;
        }
        const validFiles = [];
        newFilesArray.forEach((file) => {
            // Only check for duplicates if multiple files are allowed
            if (multiple) {
                const isDuplicate = state.files.some((existingFile) => existingFile.file.name === file.name &&
                    existingFile.file.size === file.size);
                // Skip duplicate files silently
                if (isDuplicate) {
                    return;
                }
            }
            // Check file size
            if (file.size > maxSize) {
                errors.push(multiple
                    ? `Some files exceed the maximum size of ${formatBytes(maxSize)}.`
                    : `File exceeds the maximum size of ${formatBytes(maxSize)}.`);
                return;
            }
            const error = validateFile(file);
            if (error) {
                errors.push(error);
            }
            else {
                validFiles.push({
                    file,
                    id: generateUniqueId(file),
                    preview: createPreview(file),
                });
            }
        });
        // Only update state if we have valid files to add
        if (validFiles.length > 0) {
            // Call the onFilesAdded callback with the newly added valid files
            onFilesAdded?.(validFiles);
            setState((prev) => {
                const newFiles = !multiple
                    ? validFiles
                    : [...prev.files, ...validFiles];
                onFilesChange?.(newFiles);
                return {
                    ...prev,
                    files: newFiles,
                    errors,
                };
            });
        }
        else if (errors.length > 0) {
            setState((prev) => ({
                ...prev,
                errors,
            }));
        }
        // Reset input value after handling files
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    }, 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
        state.files.length,
        maxFiles,
        multiple,
        maxSize,
        validateFile,
        createPreview,
        generateUniqueId,
        clearFiles,
        onFilesChange,
        onFilesAdded,
    ]);
    const removeFile = useCallback((id) => {
        setState((prev) => {
            const fileToRemove = prev.files.find((file) => file.id === id);
            if (fileToRemove &&
                fileToRemove.preview &&
                fileToRemove.file instanceof File &&
                fileToRemove.file.type.startsWith("image/")) {
                URL.revokeObjectURL(fileToRemove.preview);
            }
            const newFiles = prev.files.filter((file) => file.id !== id);
            onFilesChange?.(newFiles);
            return {
                ...prev,
                files: newFiles,
                errors: [],
            };
        });
    }, [onFilesChange]);
    const clearErrors = useCallback(() => {
        setState((prev) => ({
            ...prev,
            errors: [],
        }));
    }, []);
    const handleDragEnter = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setState((prev) => ({ ...prev, isDragging: true }));
    }, []);
    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget.contains(e.relatedTarget)) {
            return;
        }
        setState((prev) => ({ ...prev, isDragging: false }));
    }, []);
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setState((prev) => ({ ...prev, isDragging: false }));
        // Don't process files if the input is disabled
        if (inputRef.current?.disabled) {
            return;
        }
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            // In single file mode, only use the first file
            if (!multiple) {
                const file = e.dataTransfer.files[0];
                if (file) {
                    addFiles([file]);
                }
            }
            else {
                addFiles(e.dataTransfer.files);
            }
        }
    }, [addFiles, multiple]);
    const handleFileChange = useCallback((e) => {
        if (e.target.files && e.target.files.length > 0) {
            addFiles(e.target.files);
        }
    }, [addFiles]);
    const openFileDialog = useCallback(() => {
        if (inputRef.current) {
            inputRef.current.click();
        }
    }, []);
    const getInputProps = useCallback((props = {}) => {
        return {
            ...props,
            type: "file",
            onChange: handleFileChange,
            accept: props.accept || accept,
            multiple: props.multiple !== undefined ? props.multiple : multiple,
            ref: inputRef,
        };
    }, [accept, multiple, handleFileChange]);
    return [
        state,
        {
            addFiles,
            removeFile,
            clearFiles,
            clearErrors,
            handleDragEnter,
            handleDragLeave,
            handleDragOver,
            handleDrop,
            handleFileChange,
            openFileDialog,
            getInputProps,
        },
    ];
};
// Helper function to format bytes to human-readable format
export const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0)
        return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + (sizes?.[i] ?? ""));
};
