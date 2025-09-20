interface ImageWithPlaceholderProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "onError"> {
    className?: string;
    fallbackImage?: string | null;
    onError?: (error: Error) => void;
}
export declare const ImageWithPlaceholder: ({ className, fallbackImage, onError, ...props }: ImageWithPlaceholderProps) => import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=image-with-placeholder.d.ts.map