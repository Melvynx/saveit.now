import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";

interface ToolCardProps {
  title: string;
  description: string;
  href: string;
  icon: string;
  features: string[];
  popular?: boolean;
  className?: string;
}

export function ToolCard({
  title,
  description,
  href,
  icon,
  features,
  popular,
  className,
}: ToolCardProps) {
  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md relative h-fit",
        popular && "border-primary",
        className,
      )}
    >
      {popular && (
        <Badge className="absolute -top-2 left-4 bg-primary text-primary-foreground">
          Most Popular
        </Badge>
      )}

      <CardHeader>
        <div className="flex items-center gap-4">
          <span className="text-3xl">{icon}</span>
          <CardTitle className="flex-1">{title}</CardTitle>
        </div>
        <CardDescription className="leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          <Typography variant="small" className="font-semibold">
            Features:
          </Typography>
          <ul className="space-y-2">
            {features.map((feature, featureIndex) => (
              <li key={featureIndex} className="flex items-start gap-3">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></span>
                <Typography variant="muted" className="text-sm">
                  {feature}
                </Typography>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>

      <CardFooter>
        <Button asChild className="w-full">
          <Link href={href}>Use Tool →</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
