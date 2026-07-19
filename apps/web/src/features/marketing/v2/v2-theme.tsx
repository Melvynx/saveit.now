export const V2_HEAD_LINKS = [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous" as const,
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap",
  },
];

const V2_STYLES = `
.v2-display {
  font-family: "Instrument Serif", Georgia, serif;
}
.v2-gradient-text {
  background: linear-gradient(100deg, #ffd9a0 0%, #ff8f70 40%, #f0648e 70%, #c9a3e8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.v2-page footer {
  background-color: #120a10 !important;
  border-top-color: rgba(255, 255, 255, 0.07) !important;
}
.v2-noise {
  pointer-events: none;
  opacity: 0.06;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23a)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 250px;
}
.v2-press button {
  transition-property: transform, background-color, border-color, color, opacity;
  transition-duration: 150ms;
}
.v2-press button:active {
  transform: scale(0.96);
}
.v2-dusk {
  --background: #120a10;
  --foreground: #f7ede8;
  --card: #1a0e15;
  --card-foreground: #f7ede8;
  --popover: #1a0e15;
  --popover-foreground: #f7ede8;
  --primary: #ff8f70;
  --primary-rgb: 255, 143, 112;
  --primary-foreground: #23100a;
  --secondary: #251621;
  --secondary-foreground: #f7ede8;
  --muted: #251621;
  --muted-foreground: #a89099;
  --accent: #2b1a26;
  --accent-foreground: #f7ede8;
  --border: rgba(255, 255, 255, 0.09);
  --input: rgba(255, 255, 255, 0.12);
  --ring: #ff8f70;
  --scrollbar-track: var(--background);
}
`;

export const V2Style = () => {
  return <style dangerouslySetInnerHTML={{ __html: V2_STYLES }} />;
};
