"use client";

import { SignInWith } from "@/features/auth/sign-in-with";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Typography } from "@workspace/ui/components/typography";
import { ArrowRight, Bot } from "lucide-react";

export default function HeaderShowcase2Page() {
  return (
    <div className="bg-background">
      <div className="py-8 px-4 text-center border-b sticky top-0 bg-background/95 backdrop-blur z-50">
        <Typography variant="h2">Hero Section Showcase #2</Typography>
        <Typography variant="muted">
          10 more styles — Editorial, Typographic, Modern (no AI slop gradients)
        </Typography>
      </div>

      <div className="divide-y">
        <HeroStyle11 />
        <HeroStyle12 />
        <HeroStyle13 />
        <HeroStyle14 />
        <HeroStyle15 />
        <HeroStyle16 />
        <HeroStyle17 />
        <HeroStyle18 />
        <HeroStyle19 />
        <HeroStyle20 />
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

// Style 11: Brutalist Typography
function HeroStyle11() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-24 bg-background">
      <StyleLabel number={11} name="Brutalist" />
      <div className="max-w-6xl mx-auto">
        <div className="border-4 border-foreground p-8 md:p-16">
          <p className="font-mono text-sm mb-4">[WORLD PREMIERE]</p>
          <h1 className="text-6xl md:text-[10rem] font-black leading-[0.85] tracking-tighter uppercase">
            Agentic
            <br />
            <span className="text-primary">Book</span>marks
          </h1>
          <div className="mt-8 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <p className="text-xl max-w-md font-mono">
              Your bookmarks finally do something.
              <br />
              They watch. They learn. They find.
            </p>
            <Button size="lg" className="rounded-none px-12 font-mono">
              ENTER →
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// Style 12: Newspaper Editorial
function HeroStyle12() {
  return (
    <section className="relative min-h-screen flex items-center px-6 py-24">
      <StyleLabel number={12} name="Newspaper" />
      <div className="max-w-5xl mx-auto w-full">
        <div className="border-b-4 border-double border-foreground pb-4 mb-8">
          <p className="text-center font-serif text-sm tracking-[0.3em] uppercase">
            The Bookmark Times
          </p>
        </div>
        <div className="text-center">
          <p className="font-serif text-lg italic mb-4">Breaking News</p>
          <h1 className="text-5xl md:text-8xl font-serif font-bold leading-[0.95]">
            First Agentic
            <br />
            Bookmark Manager
            <br />
            <span className="text-4xl md:text-6xl font-normal italic">
              Changes Everything
            </span>
          </h1>
          <p className="mt-8 font-serif text-xl text-muted-foreground max-w-xl mx-auto italic">
            "Your bookmarks don't just sit there anymore. They watch. They
            learn. They find."
          </p>
          <div className="mt-8 pt-8 border-t">
            <Button
              variant="outline"
              size="lg"
              className="font-serif rounded-none"
            >
              Read the Full Story
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// Style 13: Stacked Mono
function HeroStyle13() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-24">
      <StyleLabel number={13} name="Stacked Mono" />
      <div className="max-w-4xl mx-auto text-center">
        <div className="font-mono space-y-2">
          <p className="text-muted-foreground text-sm">{"// introducing"}</p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            <span className="block text-muted-foreground">the_first</span>
            <span className="block text-primary text-6xl md:text-8xl">
              AGENTIC
            </span>
            <span className="block text-muted-foreground">
              bookmark_manager
            </span>
          </h1>
          <p className="text-muted-foreground text-sm mt-4">
            {"// autonomous • observant • proactive"}
          </p>
        </div>
        <div className="mt-12 p-6 border border-dashed rounded-lg max-w-md mx-auto">
          <p className="font-mono text-sm text-muted-foreground mb-4">
            {">"} your bookmarks work while you sleep
          </p>
          <Button className="font-mono">{">"} initialize_agent()</Button>
        </div>
      </div>
    </section>
  );
}

// Style 14: Bold Statement
function HeroStyle14() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-24">
      <StyleLabel number={14} name="Bold Statement" />
      <div className="max-w-5xl mx-auto text-center">
        <h1 className="text-5xl md:text-8xl font-black leading-[1.1]">
          Bookmarks that
          <br />
          <span className="relative inline-block">
            actually
            <svg
              className="absolute -bottom-2 left-0 w-full"
              viewBox="0 0 200 12"
              fill="none"
            >
              <path
                d="M2 10C50 2 150 2 198 10"
                stroke="currentColor"
                strokeWidth="4"
                className="text-primary"
              />
            </svg>
          </span>{" "}
          work.
        </h1>
        <p className="mt-12 text-2xl text-muted-foreground">
          The first agentic bookmark manager.
        </p>
        <p className="mt-2 text-lg text-muted-foreground/70">
          They watch. They learn. They find.
        </p>
        <div className="mt-10">
          <SignInWith buttonProps={{ size: "lg" }} type="google" />
        </div>
      </div>
    </section>
  );
}

// Style 15: Vertical Japanese-inspired
function HeroStyle15() {
  return (
    <section className="relative min-h-screen flex items-center px-6 py-24">
      <StyleLabel number={15} name="Vertical Flow" />
      <div className="max-w-6xl mx-auto w-full grid md:grid-cols-[1fr,auto,1fr] gap-8 items-center">
        <div className="text-right">
          <p className="text-sm text-muted-foreground mb-2">世界初</p>
          <p className="text-sm text-muted-foreground">World's First</p>
        </div>
        <div className="text-center">
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight">
            <span className="block">Agentic</span>
            <span className="block text-4xl md:text-5xl text-muted-foreground font-light mt-4">
              Bookmark
            </span>
            <span className="block text-4xl md:text-5xl text-muted-foreground font-light">
              Manager
            </span>
          </h1>
        </div>
        <div className="text-left">
          <p className="text-sm text-muted-foreground mb-4">
            Autonomous
            <br />
            Observant
            <br />
            Proactive
          </p>
          <Button variant="outline" size="sm">
            Begin <ArrowRight className="ml-2 size-3" />
          </Button>
        </div>
      </div>
    </section>
  );
}

// Style 16: Manifesto
function HeroStyle16() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-24">
      <StyleLabel number={16} name="Manifesto" />
      <div className="max-w-3xl mx-auto">
        <div className="space-y-6 text-xl md:text-2xl leading-relaxed">
          <p className="text-muted-foreground">
            You've saved thousands of links.
          </p>
          <p className="text-muted-foreground">You can find maybe fifty.</p>
          <p className="text-muted-foreground">The rest? Lost forever.</p>
          <p className="text-foreground font-semibold text-3xl md:text-4xl pt-4">
            Until now.
          </p>
          <h1 className="text-4xl md:text-6xl font-black pt-4">
            The First Agentic
            <br />
            <span className="text-primary">Bookmark Manager</span>
          </h1>
          <p className="text-muted-foreground pt-4">
            Your bookmarks finally work for you.
            <br />
            They watch. They learn. They find.
          </p>
        </div>
        <div className="mt-12">
          <Button size="lg">Start the revolution</Button>
        </div>
      </div>
    </section>
  );
}

// Style 17: Letter Spacing Hero
function HeroStyle17() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-24">
      <StyleLabel number={17} name="Letter Spacing" />
      <div className="max-w-5xl mx-auto text-center">
        <p className="text-sm tracking-[0.5em] text-muted-foreground uppercase mb-8">
          Introducing
        </p>
        <h1 className="font-light">
          <span className="block text-4xl md:text-6xl tracking-[0.2em]">
            THE FIRST
          </span>
          <span className="block text-7xl md:text-[12rem] font-black tracking-tight text-primary leading-none my-4">
            AGENTIC
          </span>
          <span className="block text-4xl md:text-6xl tracking-[0.2em]">
            BOOKMARK MANAGER
          </span>
        </h1>
        <p className="mt-12 text-lg text-muted-foreground tracking-wide">
          Autonomous · Observant · Proactive
        </p>
        <div className="mt-8">
          <Button
            variant="outline"
            size="lg"
            className="tracking-widest rounded-none px-12"
          >
            EXPLORE
          </Button>
        </div>
      </div>
    </section>
  );
}

// Style 18: Conversation Style
function HeroStyle18() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-24">
      <StyleLabel number={18} name="Conversation" />
      <div className="max-w-2xl mx-auto">
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <span className="text-sm">You</span>
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-none p-4 text-lg">
              Where did I save that article about productivity?
            </div>
          </div>
          <div className="flex gap-4 flex-row-reverse">
            <div className="size-10 rounded-full bg-primary flex items-center justify-center shrink-0">
              <Bot className="size-5 text-primary-foreground" />
            </div>
            <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-none p-4 text-lg">
              Found it. Saved 3 months ago. Here you go.
            </div>
          </div>
        </div>
        <div className="mt-16 text-center">
          <h1 className="text-4xl md:text-6xl font-bold">
            The First Agentic
            <br />
            Bookmark Manager
          </h1>
          <p className="mt-6 text-xl text-muted-foreground">
            Your agent remembers what you forgot.
          </p>
          <div className="mt-8">
            <Button size="lg">Meet your agent</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// Style 19: Rotating Words
function HeroStyle19() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-24">
      <StyleLabel number={19} name="Highlight Box" />
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl md:text-7xl font-bold leading-tight">
          The First{" "}
          <span className="inline-block bg-foreground text-background px-4 py-1 -rotate-1">
            Agentic
          </span>
          <br />
          Bookmark Manager
        </h1>
        <div className="mt-8 flex flex-wrap justify-center gap-3 text-lg">
          <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">
            watches
          </span>
          <span className="bg-purple-500/10 text-purple-500 px-3 py-1 rounded-full">
            learns
          </span>
          <span className="bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full">
            finds
          </span>
        </div>
        <p className="mt-8 text-xl text-muted-foreground max-w-lg mx-auto">
          Your bookmarks don't just sit there anymore. They work autonomously—so
          you don't have to.
        </p>
        <div className="mt-10">
          <SignInWith buttonProps={{ size: "lg" }} type="google" />
        </div>
      </div>
    </section>
  );
}

// Style 20: Giant Letter Background (Like #10 but refined)
function HeroStyle20() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-24 overflow-hidden">
      <StyleLabel number={20} name="Giant Letter v2" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <span className="text-[50vw] font-black text-foreground/[0.03] leading-none">
          A
        </span>
      </div>
      <div className="relative max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end gap-8">
          <div className="flex-1">
            <p className="text-sm font-mono text-muted-foreground mb-4">
              001 — First of its kind
            </p>
            <h1 className="text-5xl md:text-7xl font-black leading-[0.9]">
              Agentic
              <br />
              <span className="text-muted-foreground font-light">
                Bookmarks
              </span>
            </h1>
          </div>
          <div className="flex-1 max-w-sm">
            <p className="text-muted-foreground mb-6">
              Your bookmarks watch, learn, and find. The first bookmark manager
              that actually works for you.
            </p>
            <Button size="lg">
              Get Started <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </div>
        <div className="mt-16 pt-8 border-t flex flex-wrap gap-8 text-sm text-muted-foreground">
          <div>
            <p className="font-mono text-foreground">01</p>
            <p>Autonomous</p>
          </div>
          <div>
            <p className="font-mono text-foreground">02</p>
            <p>Observant</p>
          </div>
          <div>
            <p className="font-mono text-foreground">03</p>
            <p>Proactive</p>
          </div>
        </div>
      </div>
    </section>
  );
}
