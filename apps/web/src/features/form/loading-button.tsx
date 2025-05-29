"use client";

import { Button, ButtonProps } from "@workspace/ui/components/button";
import { Loader } from "@workspace/ui/components/loader";
import { cn } from "@workspace/ui/lib/utils";
import { motion } from "motion/react";
import type { ComponentPropsWithoutRef } from "react";
import { useFormStatus } from "react-dom";

export const SubmitButton = (props: ButtonProps) => {
  const { pending } = useFormStatus();

  return (
    <LoadingButton loading={pending} {...props}>
      {props.children}
    </LoadingButton>
  );
};

export const LoadingButton = ({
  loading,
  children,
  className,
  ...props
}: ButtonProps & {
  loading?: boolean;
  success?: string;
}) => {
  return (
    <Button {...props} className={cn(className, "relative")}>
      <motion.span
        className="flex items-center gap-1"
        animate={{
          opacity: loading ? 0 : 1,
          y: loading ? -10 : 0,
        }}
      >
        {children}
      </motion.span>
      <motion.span
        initial={{
          opacity: 0,
          y: 10,
        }}
        animate={{
          opacity: loading ? 1 : 0,
          y: loading ? 0 : 10,
        }}
        exit={{
          opacity: 0,
          y: 10,
        }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <Loader size={20} />
      </motion.span>
    </Button>
  );
};

export const SubmitButtonUnstyled = (
  props: ComponentPropsWithoutRef<"button">,
) => {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      type={props.type ?? "submit"}
      disabled={props.disabled ?? pending}
    />
  );
};
