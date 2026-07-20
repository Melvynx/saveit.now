import { createFileRoute } from "@tanstack/react-router";
import { Clock, HelpCircle, Mail, MessageSquare, Twitter, Users } from "lucide-react";

import { LandingHeader } from "@/features/marketing/landing/header";
import { LandingReveal } from "@/features/marketing/landing/reveal";
import {
  LANDING_HEAD_LINKS,
  LandingStyle,
} from "@/features/marketing/landing/theme";
import { Footer } from "@/features/page/footer";
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
import { cn } from "@workspace/ui/lib/utils";

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
  head: () => ({
    links: LANDING_HEAD_LINKS,
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="landing-page landing-dusk dark bg-[#120a10] text-[#f7ede8]">
      <LandingStyle />
      <LandingHeader />
      <div className="mx-auto max-w-6xl px-6 pt-24 pb-24 sm:pt-28">
        <div className="flex flex-col gap-16">
          <LandingReveal className="text-center space-y-6">
            <Badge className="border-[#ff8f70]/20 bg-[#ff8f70]/10 text-[#ff8f70]">
              <HelpCircle className="size-3 mr-1" />
              Support
            </Badge>
            <h1 className="landing-display max-w-3xl mx-auto text-balance text-5xl tracking-tight text-[#f7ede8] sm:text-6xl">
              We're here to <em className="landing-gradient-text">help</em>
            </h1>
            <Typography variant="lead" className="max-w-2xl mx-auto">
              Have a question, need support, or want to share feedback? We would love to hear from you.
            </Typography>
          </LandingReveal>

          <div className="space-y-8">
            <h2 className="landing-display text-center text-3xl tracking-tight text-[#f7ede8] sm:text-4xl">Get in Touch</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {contactMethods.map((method) => {
                const IconComponent = method.icon;
                return (
                  <Card
                    key={method.title}
                    className={cn(
                      "h-fit rounded-2xl shadow-none",
                      method.primary
                        ? "border-[#ff8f70]/30 bg-[#ff8f70]/[0.06]"
                        : "border-white/[0.08] bg-white/[0.03]",
                    )}
                  >
                    <CardHeader className="text-center">
                      <div
                        className={cn(
                          "mx-auto mb-3 size-12 rounded-2xl flex items-center justify-center",
                          method.primary ? "bg-[#ff8f70]/15" : "bg-white/[0.06]",
                        )}
                      >
                        <IconComponent
                          className={cn(
                            "size-6",
                            method.primary ? "text-[#ff8f70]" : "text-[#a89099]",
                          )}
                        />
                      </div>
                      <CardTitle className="flex items-center justify-center gap-2">
                        {method.title}
                        {method.primary && <Badge className="bg-[#ff8f70]/15 text-[#ff8f70]">Recommended</Badge>}
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
              <h2 className="landing-display text-3xl tracking-tight text-[#f7ede8] sm:text-4xl">Frequently Asked Questions</h2>
              <Typography variant="muted" className="max-w-2xl mx-auto">
                Quick answers to common questions. Can not find what you are looking for? Contact us directly.
              </Typography>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {faqs.map(([question, answer]) => (
                <Card key={question} className="h-fit rounded-2xl border-white/[0.08] bg-white/[0.03] shadow-none">
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
            <h2 className="landing-display text-center text-3xl tracking-tight text-[#f7ede8] sm:text-4xl">Additional Resources</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="rounded-2xl border-white/[0.08] bg-white/[0.03] shadow-none">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-emerald-400/10 flex items-center justify-center">
                      <HelpCircle className="size-5 text-emerald-300" />
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
              <Card className="rounded-2xl border-white/[0.08] bg-white/[0.03] shadow-none">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-sky-400/10 flex items-center justify-center">
                      <Users className="size-5 text-sky-300" />
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
      </div>
      <Footer />
    </div>
  );
}
