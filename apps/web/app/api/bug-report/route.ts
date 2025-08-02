import { userRoute } from "@/lib/safe-route";
import { sendEmail } from "@/lib/mail/send-email";
import { NextResponse } from "next/server";
import { z } from "zod";

const bugReportSchema = z.object({
  description: z.string().min(10, "Bug description must be at least 10 characters"),
  deviceInfo: z.string().optional(),
  appVersion: z.string().optional(),
});

export const POST = userRoute
  .body(bugReportSchema)
  .handler(async (req, { body, ctx }) => {
    try {
      const emailContent = `
        <h2>Bug Report from Mobile App</h2>
        <p><strong>User:</strong> ${ctx.user.email}</p>
        <p><strong>User ID:</strong> ${ctx.user.id}</p>
        <p><strong>Description:</strong></p>
        <p>${body.description.replace(/\n/g, '<br>')}</p>
        ${body.deviceInfo ? `<p><strong>Device Info:</strong> ${body.deviceInfo}</p>` : ''}
        ${body.appVersion ? `<p><strong>App Version:</strong> ${body.appVersion}</p>` : ''}
        <p><strong>Reported at:</strong> ${new Date().toISOString()}</p>
      `;

      const result = await sendEmail({
        to: "help@saveit.now",
        subject: `Bug Report from ${ctx.user.email}`,
        html: emailContent,
        replyTo: ctx.user.email,
      });

      if (result.error) {
        console.error("Failed to send bug report email:", result.error);
        return NextResponse.json(
          { error: "Failed to send bug report" },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true, 
        message: "Bug report sent successfully" 
      });
    } catch (error) {
      console.error("Bug report submission error:", error);
      return NextResponse.json(
        { error: "Failed to submit bug report" },
        { status: 500 }
      );
    }
  });