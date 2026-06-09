import { createFileRoute } from "@tanstack/react-router";
import { Clock, HelpCircle, Mail, MessageSquare, Twitter, Users } from "lucide-react";

import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import { MaxWidthContainer } from "@/features/page/page";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";

const contactMethods = [
  {
    icon: Mail,
    title: "Email Support",
    description: "Get help with your account, billing, or technical issues.",
    contact: "help@saveit.now",
    responseTime: "Within 24 hours",
    primary: true,
  },
  {
    icon: Twitter,
    title: "Twitter",
    description: "Follow us for updates and quick questions.",
    contact: "@saveitnow",
    responseTime: "Usually same day",
    href: "https://twitter.com/saveitnow",
    primary: false,
  },
  {
    icon: MessageSquare,
    title: "Feature Requests",
    description: "Suggest new features or improvements.",
    contact: "Share your ideas",
    responseTime: "We review all suggestions",
    href: "/feedback",
    primary: false,
  },
];

const faqs = [
  ["How do I import bookmarks from Chrome?", "You can import bookmarks from Chrome by going to Settings > Import & Export and selecting the Chrome option. We support HTML exports from Chrome."],
  ["Is there a limit to how many bookmarks I can save?", "Free accounts can save up to 100 bookmarks. Pro accounts have unlimited bookmark storage."],
  ["Can I share bookmarks with my team?", "Yes! Pro accounts include collaboration features that allow you to share bookmarks and folders with team members."],
  ["Do you offer refunds?", "We offer a 7-day unconditional refund policy. If you are not satisfied, contact us within 7 days of your purchase."],
];

export const Route = createFileRoute("/contact")({
  component: ContactPage,
});

function ContactPage() {
  return (
    <div>
      <Header />
      <MaxWidthContainer className="py-16">
        <div className="flex flex-col gap-16">
          <div className="text-center space-y-6">
            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
              <HelpCircle className="size-3 mr-1" />
              Support
            </Badge>
            <Typography variant="h1" className="max-w-3xl mx-auto">
              We're here to help
            </Typography>
            <Typography variant="lead" className="max-w-2xl mx-auto text-muted-foreground">
              Have a question, need support, or want to share feedback? We would love to hear from you.
            </Typography>
          </div>

          <div className="space-y-8">
            <Typography variant="h2" className="text-center">Get in Touch</Typography>
            <div className="grid gap-6 md:grid-cols-3">
              {contactMethods.map((method) => {
                const IconComponent = method.icon;
                return (
                  <Card key={method.title} className={`h-fit ${method.primary ? "border-primary/40 bg-primary/5" : ""}`}>
                    <CardHeader className="text-center">
                      <div className={`mx-auto mb-3 size-12 rounded-lg flex items-center justify-center ${method.primary ? "bg-primary/20" : "bg-muted"}`}>
                        <IconComponent className={`size-6 ${method.primary ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <CardTitle className="flex items-center justify-center gap-2">
                        {method.title}
                        {method.primary && <Badge className="bg-primary/20 text-primary">Recommended</Badge>}
                      </CardTitle>
                      <CardDescription className="text-center">{method.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                      <div className="space-y-2">
                        <div className="font-medium text-sm">{method.contact}</div>
                        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {method.responseTime}
                        </div>
                      </div>
                      <Button variant={method.primary ? "default" : "outline"} asChild className="w-full">
                        {method.href ? (
                          <a href={method.href} target={method.href.startsWith("http") ? "_blank" : undefined} rel={method.href.startsWith("http") ? "noreferrer" : undefined}>
                            Contact
                          </a>
                        ) : (
                          <a href={`mailto:${method.contact}`}>Send Email</a>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="space-y-8">
            <div className="text-center space-y-4">
              <Typography variant="h2">Frequently Asked Questions</Typography>
              <Typography variant="muted" className="max-w-2xl mx-auto">
                Quick answers to common questions. Can not find what you are looking for? Contact us directly.
              </Typography>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {faqs.map(([question, answer]) => (
                <Card key={question} className="h-fit">
                  <CardHeader>
                    <CardTitle className="text-lg">{question}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">{answer}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <Typography variant="h2" className="text-center">Additional Resources</Typography>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <HelpCircle className="size-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle>Help Center</CardTitle>
                      <CardDescription>Comprehensive guides and tutorials</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" asChild className="w-full">
                    <a href="/help">Visit Help Center</a>
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Users className="size-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle>Community</CardTitle>
                      <CardDescription>Connect with other SaveIt users</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" asChild className="w-full">
                    <a href="https://discord.gg/saveit" target="_blank" rel="noopener noreferrer">
                      Join Discord
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </MaxWidthContainer>
      <Footer />
    </div>
  );
}
