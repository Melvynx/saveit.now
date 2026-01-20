"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { Typography } from "@workspace/ui/components/typography";

type ApiMethod = "GET" | "POST" | "PATCH" | "DELETE" | "PUT";

type ApiExamplesProps = {
  method?: ApiMethod;
  endpoint?: string;
  examples?: {
    bash?: string;
    javascript?: string;
    python?: string;
  };
  results?: {
    success?: string;
    error?: string;
  };
  className?: string;
};

const methodColors: Record<ApiMethod, string> = {
  GET: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  POST: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
  PATCH:
    "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  DELETE: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
  PUT: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
};

export function DocsApiExamples({
  method,
  endpoint,
  examples,
  results,
  className,
}: ApiExamplesProps) {
  if (!examples && !results && !method && !endpoint) {
    return null;
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {(method ?? endpoint) && (
        <div className="bg-card flex flex-col gap-3 rounded-lg border p-4">
          {method && (
            <div className="flex items-center gap-2">
              <Typography variant="muted" className="text-xs">
                Method
              </Typography>
              <Badge
                variant="outline"
                className={cn("font-mono text-xs", methodColors[method])}
              >
                {method}
              </Badge>
            </div>
          )}
          {endpoint && (
            <div className="flex flex-col gap-1">
              <Typography variant="muted" className="text-xs">
                Endpoint
              </Typography>
              <code className="text-foreground bg-muted rounded px-2 py-1 font-mono text-xs break-all">
                {endpoint}
              </code>
            </div>
          )}
        </div>
      )}

      {examples && (
        <div className="flex flex-col gap-2">
          <Typography variant="muted" className="text-xs">
            Request Examples
          </Typography>
          <Tabs defaultValue="bash" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              {examples.bash && <TabsTrigger value="bash">Bash</TabsTrigger>}
              {examples.javascript && (
                <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              )}
              {examples.python && (
                <TabsTrigger value="python">Python</TabsTrigger>
              )}
            </TabsList>
            {examples.bash && (
              <TabsContent value="bash" className="mt-2">
                <pre className="bg-muted text-foreground overflow-x-auto rounded-lg p-4 text-xs">
                  <code>{examples.bash.trim()}</code>
                </pre>
              </TabsContent>
            )}
            {examples.javascript && (
              <TabsContent value="javascript" className="mt-2">
                <pre className="bg-muted text-foreground overflow-x-auto rounded-lg p-4 text-xs">
                  <code>{examples.javascript.trim()}</code>
                </pre>
              </TabsContent>
            )}
            {examples.python && (
              <TabsContent value="python" className="mt-2">
                <pre className="bg-muted text-foreground overflow-x-auto rounded-lg p-4 text-xs">
                  <code>{examples.python.trim()}</code>
                </pre>
              </TabsContent>
            )}
          </Tabs>
        </div>
      )}

      {results && (
        <div className="flex flex-col gap-2">
          <Typography variant="muted" className="text-xs">
            Response Examples
          </Typography>
          <Tabs defaultValue="success" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              {results.success && (
                <TabsTrigger value="success">Success</TabsTrigger>
              )}
              {results.error && <TabsTrigger value="error">Error</TabsTrigger>}
            </TabsList>
            {results.success && (
              <TabsContent value="success" className="mt-2">
                <pre className="bg-muted text-foreground overflow-x-auto rounded-lg p-4 text-xs">
                  <code>{results.success.trim()}</code>
                </pre>
              </TabsContent>
            )}
            {results.error && (
              <TabsContent value="error" className="mt-2">
                <pre className="bg-muted text-foreground overflow-x-auto rounded-lg p-4 text-xs">
                  <code>{results.error.trim()}</code>
                </pre>
              </TabsContent>
            )}
          </Tabs>
        </div>
      )}
    </div>
  );
}
