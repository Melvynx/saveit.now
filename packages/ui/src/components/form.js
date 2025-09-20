"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { zodResolver } from "@hookform/resolvers/zod";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@workspace/ui/lib/utils";
import * as React from "react";
import { Controller, FormProvider, useForm, useFormContext, useFormState, } from "react-hook-form";
import { Label } from "./label.js";
const Form = ({ form, onSubmit, children, className, disabled, ...props }) => {
    return (_jsx(FormProvider, { ...form, children: _jsx("form", { onSubmit: form.handleSubmit(onSubmit), ...props, className: className, children: _jsx("fieldset", { disabled: disabled ?? form.formState.isSubmitting, className: className, children: children }) }) }));
};
const FormFieldContext = React.createContext({});
const FormField = ({ ...props }) => {
    return (_jsx(FormFieldContext.Provider, { value: { name: props.name }, children: _jsx(Controller, { ...props }) }));
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
const FormItemContext = React.createContext({});
function FormItem({ className, ...props }) {
    const id = React.useId();
    return (_jsx(FormItemContext.Provider, { value: { id }, children: _jsx("div", { "data-slot": "form-item", className: cn("grid gap-2", className), ...props }) }));
}
function FormLabel({ className, ...props }) {
    const { error, formItemId } = useFormField();
    return (_jsx(Label, { "data-slot": "form-label", "data-error": !!error, className: cn("data-[error=true]:text-destructive", className), htmlFor: formItemId, ...props }));
}
function FormControl({ ...props }) {
    const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
    return (_jsx(Slot, { "data-slot": "form-control", id: formItemId, "aria-describedby": !error
            ? `${formDescriptionId}`
            : `${formDescriptionId} ${formMessageId}`, "aria-invalid": !!error, ...props }));
}
function FormDescription({ className, ...props }) {
    const { formDescriptionId } = useFormField();
    return (_jsx("p", { "data-slot": "form-description", id: formDescriptionId, className: cn("text-muted-foreground text-sm", className), ...props }));
}
function FormMessage({ className, ...props }) {
    const { error, formMessageId } = useFormField();
    const body = error ? String(error.message ?? "") : props.children;
    if (!body) {
        return null;
    }
    return (_jsx("p", { "data-slot": "form-message", id: formMessageId, className: cn("text-destructive text-sm", className), ...props, children: body }));
}
const useZodForm = ({ schema, ...formProps }) => useForm({
    ...formProps,
    resolver: zodResolver(schema),
});
export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField, useZodForm, };
