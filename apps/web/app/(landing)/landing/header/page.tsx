"use client";

import { SignInWith } from "@/features/auth/sign-in-with";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Typography } from "@workspace/ui/components/typography";
import {
  ArrowRight,
  Bot,
  Brain,
  Check,
  Eye,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function HeaderShowcasePage() {
  return (
    <div className="bg-background">
      <div className="py-8 px-4 text-center border-b sticky top-0 bg-background/95 backdrop-blur z-50">
        <Typography variant="h2">Hero Section Showcase</Typography>
        <Typography variant="muted">
          10 different styles for "The First Agentic Bookmark Manager"
        </Typography>
      </div>

      <div className="divide-y">
        <HeroStyle1 />
        <HeroStyle2 />
        <HeroStyle3 />
        <HeroStyle4 />
        <HeroStyle5 />
        <HeroStyle6 />
        <HeroStyle7 />
        <HeroStyle8 />
        <HeroStyle9 />
        <HeroStyle10 />
      </div>
    </div>
  );
}

function StyleLabel({ number, name }: { number: number; name: string }) {
  return (
    <div className="absolute top-4 left-4 z-10">
      <Badge variant="secondary" className="text-sm font-mono">
        #{number} — {name}
      </Badge>
    </div>
  );
}

// Style 1: Bold Gradient Text
function HeroStyle1() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-24 overflow-hidden">
      <StyleLabel number={1} name="Bold Gradient" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-orange-500/5" />
      <div className="relative max-w-5xl mx-auto text-center">
        <h1 className="text-6xl md:text-8xl font-black tracking-tight">
          The First{" "}
          <span className="bg-gradient-to-r from-primary via-purple-500 to-orange-500 bg-clip-text text-transparent">
            Agentic
          </span>
          <br />
          Bookmark Manager
        </h1>
        <p className="mt-8 text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
          Your bookmarks don't just sit there anymore.
          <br />
          <span className="text-foreground font-medium">
            They watch. They learn. They find.
          </span>
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="text-lg px-8">
            Start Free <ArrowRight className="ml-2 size-5" />
          </Button>
          <Button size="lg" variant="outline" className="text-lg px-8">
            Watch Demo
          </Button>
        </div>
      </div>
    </section>
  );
}

// Style 2: Minimal with Animated Badge
function HeroStyle2() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-24">
      <StyleLabel number={2} name="Minimal Badge" />
      <div className="max-w-4xl mx-auto text-center">
        <Badge className="mb-6 animate-pulse bg-primary/10 text-primary border-primary/20 px-4 py-2 text-sm">
          <Sparkles className="size-4 mr-2" />
          Introducing Agentic Bookmarking
        </Badge>
        <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-[1.1]">
          The First Agentic
          <br />
          <span className="text-primary">Bookmark Manager</span>
        </h1>
        <p className="mt-8 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Save any link. Your AI agent organizes, summarizes, and retrieves
          instantly. No folders. No searching. Just describe what you need.
        </p>
        <div className="mt-10">
          <SignInWith buttonProps={{ size: "lg" }} type="google" />
        </div>
        <div className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Check className="size-4 text-green-500" /> Free forever
          </span>
          <span className="flex items-center gap-2">
            <Check className="size-4 text-green-500" /> No credit card
          </span>
        </div>
      </div>
    </section>
  );
}

// Style 3: Split with Visual
function HeroStyle3() {
  return (
    <section className="relative min-h-screen flex items-center px-6 py-24">
      <StyleLabel number={3} name="Split Layout" />
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <Badge variant="outline" className="mb-4">
            First of its kind
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold leading-[1.1]">
            <span className="text-primary">Agentic</span>
            <br />
            Bookmark
            <br />
            Manager
          </h1>
          <p className="mt-6 text-xl text-muted-foreground">
            Your bookmarks work autonomously. They watch, learn, and find—so you
            don't have to.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Button size="lg">Get Started Free</Button>
            <Button size="lg" variant="ghost">
              See how it works <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/20 via-purple-500/20 to-orange-500/20 p-8 flex items-center justify-center">
            <div className="grid grid-cols-3 gap-4">
              <div className="size-20 rounded-2xl bg-primary/30 animate-pulse" />
              <div className="size-20 rounded-2xl bg-purple-500/30 animate-pulse delay-100" />
              <div className="size-20 rounded-2xl bg-orange-500/30 animate-pulse delay-200" />
              <div className="size-20 rounded-2xl bg-orange-500/30 animate-pulse delay-300" />
              <div className="size-20 rounded-2xl bg-primary/30 animate-pulse delay-400" />
              <div className="size-20 rounded-2xl bg-purple-500/30 animate-pulse delay-500" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Style 4: Dark Dramatic
function HeroStyle4() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-24 bg-foreground text-background">
      <StyleLabel number={4} name="Dark Dramatic" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.15),transparent_70%)]" />
      <div className="relative max-w-4xl mx-auto text-center">
        <p className="text-primary font-mono text-sm tracking-widest uppercase mb-6">
          The future of bookmarking
        </p>
        <h1 className="text-6xl md:text-8xl font-black">
          AGENTIC
          <br />
          <span className="text-primary">BOOKMARKS</span>
        </h1>
        <p className="mt-8 text-xl text-background/70 max-w-xl mx-auto">
          Autonomous. Intelligent. Proactive.
          <br />
          Your AI agent handles everything.
        </p>
        <div className="mt-10">
          <Button size="lg" variant="secondary" className="text-lg px-8">
            Enter the Future
          </Button>
        </div>
      </div>
    </section>
  );
}

// Style 5: Playful with Icons
function HeroStyle5() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-24 overflow-hidden">
      <StyleLabel number={5} name="Playful Icons" />
      <div className="absolute inset-0 overflow-hidden">
        <Brain className="absolute top-20 left-[10%] size-12 text-primary/20 animate-bounce" />
        <Eye className="absolute top-40 right-[15%] size-10 text-purple-500/20 animate-bounce delay-100" />
        <Zap className="absolute bottom-32 left-[20%] size-14 text-orange-500/20 animate-bounce delay-200" />
        <Bot className="absolute bottom-20 right-[10%] size-16 text-primary/20 animate-bounce delay-300" />
      </div>
      <div className="relative max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-6">
          <Bot className="size-5 text-primary" />
          <span className="text-sm font-medium">Meet your bookmark agent</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold">
          The First
          <br />
          <span className="inline-flex items-center gap-4">
            <span className="bg-primary text-primary-foreground px-4 py-2 rounded-xl">
              Agentic
            </span>
          </span>
          <br />
          Bookmark Manager
        </h1>
        <p className="mt-8 text-xl text-muted-foreground">
          🧠 Autonomous · 👁️ Observant · ⚡ Proactive
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Button size="lg">Try Free</Button>
        </div>
      </div>
    </section>
  );
}

// Style 6: Text-Heavy Editorial
function HeroStyle6() {
  return (
    <section className="relative min-h-screen flex items-center px-6 py-24">
      <StyleLabel number={6} name="Editorial" />
      <div className="max-w-6xl mx-auto">
        <p className="text-sm font-mono text-muted-foreground mb-4">
          001 / Agentic Bookmarking
        </p>
        <h1 className="text-7xl md:text-9xl font-serif font-light leading-[0.9] tracking-tight">
          The First
          <br />
          <em className="text-primary">Agentic</em>
          <br />
          Bookmark
          <br />
          Manager
        </h1>
        <div className="mt-12 grid md:grid-cols-2 gap-8 max-w-2xl">
          <p className="text-muted-foreground">
            Your bookmarks don't just sit there anymore. They watch. They learn.
            They find.
          </p>
          <div>
            <Button size="lg" variant="outline" className="rounded-full px-8">
              Get Started <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// Style 7: Centered with Animated Underline
function HeroStyle7() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-24">
      <StyleLabel number={7} name="Animated Underline" />
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl md:text-7xl font-semibold leading-tight">
          The First{" "}
          <span className="relative inline-block">
            <span className="relative z-10">Agentic</span>
            <span className="absolute bottom-2 left-0 w-full h-4 bg-primary/30 -skew-x-6" />
          </span>
          <br />
          Bookmark Manager
        </h1>
        <p className="mt-8 text-xl text-muted-foreground max-w-2xl mx-auto">
          Save any link—articles, videos, PDFs, tweets. Your agent organizes,
          summarizes, and retrieves instantly. No folders. No searching.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4">
          <SignInWith
            buttonProps={{ size: "lg", className: "px-12" }}
            type="google"
          />
          <Link
            href="#"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Watch the demo ↓
          </Link>
        </div>
      </div>
    </section>
  );
}

// Style 8: Stats-Focused
function HeroStyle8() {
  return (
    <section className="relative min-h-screen flex items-center px-6 py-24">
      <StyleLabel number={8} name="Stats Focused" />
      <div className="max-w-6xl mx-auto w-full">
        <div className="grid lg:grid-cols-[2fr,1fr] gap-12">
          <div>
            <Badge className="mb-6">World's First</Badge>
            <h1 className="text-5xl md:text-6xl font-bold leading-[1.1]">
              Agentic
              <br />
              Bookmark Manager
            </h1>
            <p className="mt-6 text-xl text-muted-foreground max-w-lg">
              Your bookmarks work while you sleep. Autonomous organization.
              Instant retrieval.
            </p>
            <div className="mt-8">
              <Button size="lg">Start Free Today</Button>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-8">
            <div className="border-l-2 border-primary pl-6">
              <p className="text-4xl font-bold">0s</p>
              <p className="text-muted-foreground">Organization time</p>
            </div>
            <div className="border-l-2 border-purple-500 pl-6">
              <p className="text-4xl font-bold">&lt;1s</p>
              <p className="text-muted-foreground">Search & retrieval</p>
            </div>
            <div className="border-l-2 border-orange-500 pl-6">
              <p className="text-4xl font-bold">∞</p>
              <p className="text-muted-foreground">Content types</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Style 9: Glassmorphism Card
function HeroStyle9() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-24 bg-gradient-to-br from-primary/10 via-background to-purple-500/10">
      <StyleLabel number={9} name="Glassmorphism" />
      <div className="max-w-3xl mx-auto">
        <div className="backdrop-blur-xl bg-background/60 border rounded-3xl p-12 shadow-2xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-primary mb-6">
              <Sparkles className="size-5" />
              <span className="text-sm font-medium">First of its kind</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              The First Agentic
              <br />
              <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                Bookmark Manager
              </span>
            </h1>
            <p className="mt-6 text-muted-foreground max-w-md mx-auto">
              Your bookmarks watch, learn, and find. Save once, retrieve
              instantly—forever.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="rounded-full px-8">
                Get Started Free
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-8">
                See Demo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Style 10: Typographic Experiment
function HeroStyle10() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-24 overflow-hidden">
      <StyleLabel number={10} name="Typographic" />
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
        <span className="text-[40vw] font-black">A</span>
      </div>
      <div className="relative max-w-5xl mx-auto text-center">
        <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">
          <span className="block text-2xl md:text-3xl font-normal text-muted-foreground mb-4">
            The First
          </span>
          <span className="block text-7xl md:text-9xl font-black text-primary tracking-tighter">
            AGENTIC
          </span>
          <span className="block mt-4">Bookmark Manager</span>
        </h1>
        <div className="mt-12 flex flex-col items-center gap-2">
          <p className="text-muted-foreground">
            Autonomous · Observant · Proactive
          </p>
          <div className="mt-6">
            <Button size="lg" className="text-lg px-10 py-6 rounded-full">
              Meet Your Agent
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
