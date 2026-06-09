"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@workspace/ui/lib/utils";
import * as React from "react";
import type {
  SubmitHandler,
  UseFormProps,
  UseFormReturn,
} from "react-hook-form";
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import type * as z from "zod";
import { Label } from "./label";

export type FormProps<T extends FieldValues> = Omit<
  React.ComponentProps<"form">,
  "onSubmit"
> & {
  form: UseFormReturn<T>;
  onSubmit: SubmitHandler<T>;
  disabled?: boolean;
};

const Form = <T extends FieldValues>({
  form,
  onSubmit,
  children,
  className,
  disabled,
  ...props
}: FormProps<T>) => {
  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        {...props}
        className={className}
      >
        <fieldset
          disabled={disabled ?? form.formState.isSubmitting}
          className={className}
        >
          {children}
        </fieldset>
      </form>
    </FormProvider>
  );
};

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue,
);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: fieldContext.name });
  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue,
);

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div
        data-slot="form-item"
        className={cn("grid gap-2", className)}
        {...props}
      />
    </FormItemContext.Provider>
  );
}

function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  const { error, formItemId } = useFormField();

  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn("data-[error=true]:text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  );
}

type FormControlProps = Omit<React.HTMLAttributes<HTMLElement>, "children"> & {
  children: React.ReactElement<Record<string, unknown>>;
};

function FormControl({ children, ...props }: FormControlProps) {
  const { error, formItemId, formDescriptionId, formMessageId } =
    useFormField();
  const childProps = children.props;

  return React.cloneElement(children, {
    ...props,
    ...childProps,
    "data-slot": "form-control",
    id: (childProps.id as string | undefined) ?? props.id ?? formItemId,
    "aria-describedby":
      (childProps["aria-describedby"] as string | undefined) ??
      (!error
        ? `${formDescriptionId}`
        : `${formDescriptionId} ${formMessageId}`),
    "aria-invalid":
      (childProps["aria-invalid"] as boolean | undefined) ?? !!error,
  });
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField();

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error.message ?? "") : props.children;

  if (!body) {
    return null;
  }

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn("text-destructive text-sm", className)}
      {...props}
    >
      {body}
    </p>
  );
}

type UseZodFormProps<
  Input extends FieldValues,
  Output extends FieldValues,
  Z extends z.ZodType<Output, Input>,
> = Exclude<UseFormProps<z.output<Z>>, "resolver"> & {
  schema: Z;
};

const useZodForm = <
  Input extends FieldValues,
  Output extends FieldValues,
  Z extends z.ZodType<Output, Input>,
>({
  schema,
  ...formProps
}: UseZodFormProps<Input, Output, Z>) =>
  useForm({
    ...formProps,
    resolver: zodResolver(schema as never) as never,
  });

export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
  useZodForm,
};
