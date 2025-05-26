import { Typography } from "@workspace/ui/components/typography";
import { MaxWidthContainer } from "../page/page";

export const KeyFeatures = () => {
  return (
    <MaxWidthContainer className="py-16 flex flex-col gap-8">
      <div className="text-center">
        <Typography variant="h2">Key Features</Typography>
        <Typography variant="lead">
          Tools that help you organize and rediscover your digital knowledge
        </Typography>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="border rounded-lg p-6 flex flex-col gap-4">
          <div className="text-4xl">🧩</div>
          <Typography variant="h3">Chrome Extensions</Typography>
          <Typography variant="muted">
            Save everything instantly with just one click. No more copy-pasting
            URLs.
          </Typography>
        </div>

        <div className="border rounded-lg p-6 flex flex-col gap-4">
          <div className="text-4xl">🎯</div>
          <Typography variant="h3">No Bullshit</Typography>
          <Typography variant="muted">
            Just one button and one search bar. Clean interface without
            unnecessary features.
          </Typography>
        </div>

        <div className="border rounded-lg p-6 flex flex-col gap-4">
          <div className="text-4xl">💸</div>
          <Typography variant="h3">Free and Cheap</Typography>
          <Typography variant="muted">
            Just $5 a month without any limitations. No premium tiers or hidden
            fees.
          </Typography>
        </div>

        <div className="border rounded-lg p-6 flex flex-col gap-4">
          <div className="text-4xl">🔄</div>
          <Typography variant="h3">Sharing</Typography>
          <Typography variant="muted">
            Easy button to share and find everything. Collaborate with your team
            or friends.
          </Typography>
        </div>
      </div>
    </MaxWidthContainer>
  );
};
