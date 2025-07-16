"use client";

import { SubmitButton } from "@/features/form/loading-button";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useState } from "react";

interface CreateApiKeyFormProps {
  onSubmit: (formData: FormData) => Promise<void>;
}

export function CreateApiKeyForm({ onSubmit }: CreateApiKeyFormProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    await onSubmit(formData);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create New API Key</CardTitle>
          <CardDescription>
            Generate a new API key to access the SaveIt.now API.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => setIsOpen(true)}>Create API Key</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New API Key</CardTitle>
        <CardDescription>
          Choose a descriptive name for your API key to help you identify it later.
        </CardDescription>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Key Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g., My Mobile App, Production Server"
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <SubmitButton>Create Key</SubmitButton>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}