"use client";

import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { useState } from "react";
import { CardV1Current } from "./cards/v1-current-plus";
import { CardV2Compact } from "./cards/v2-compact";
import { CardV3Horizontal } from "./cards/v3-horizontal";
import { CardV4Glass } from "./cards/v4-glass";
import { CardV5Stacked } from "./cards/v5-stacked";
import { CardV6Overlay } from "./cards/v6-overlay";
import { CardV7Pill } from "./cards/v7-pill";
import { CardV8Newspaper } from "./cards/v8-newspaper";
import { CardV9Bordered } from "./cards/v9-bordered";
import { CardV10Rich } from "./cards/v10-rich";
import type { VariationBookmark } from "./types";

const VARIATIONS = [
  { id: "v1", label: "Current+", card: CardV1Current },
  { id: "v2", label: "Compact", card: CardV2Compact },
  { id: "v3", label: "Horizontal", card: CardV3Horizontal },
  { id: "v4", label: "Glass", card: CardV4Glass },
  { id: "v5", label: "Stacked", card: CardV5Stacked },
  { id: "v6", label: "Overlay", card: CardV6Overlay },
  { id: "v7", label: "Pill", card: CardV7Pill },
  { id: "v8", label: "Newspaper", card: CardV8Newspaper },
  { id: "v9", label: "Bordered", card: CardV9Bordered },
  { id: "v10", label: "Rich", card: CardV10Rich },
] as const;

export function VariationsClient({
  bookmarks,
}: {
  bookmarks: VariationBookmark[];
}) {
  const [active, setActive] = useState("v1");
  const variation = VARIATIONS.find((v) => v.id === active);
  const CardComponent = variation?.card ?? CardV1Current;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-[3000px] px-4 lg:px-12 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold">
              Card Variations{" "}
              <span className="text-muted-foreground font-normal text-sm">
                ({bookmarks.length} bookmarks)
              </span>
            </h1>
          </div>
          <Tabs value={active} onValueChange={setActive}>
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
              {VARIATIONS.map((v) => (
                <TabsTrigger key={v.id} value={v.id} className="shrink-0">
                  {v.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div
        className="mx-auto max-w-[3000px] px-4 lg:px-12 py-6"
      >
        <div className="grid gap-4 lg:gap-6 grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] [&>*]:w-full place-items-start">
          {bookmarks.map((bookmark) => (
            <CardComponent key={bookmark.id} bookmark={bookmark} />
          ))}
        </div>
      </div>
    </div>
  );
}
