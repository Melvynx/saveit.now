import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@workspace/ui/lib/utils";
import { Loader2 } from "lucide-react";
export const Loader = ({ className, ...props }) => {
    return _jsx(Loader2, { ...props, className: cn(className, "animate-spin") });
};
