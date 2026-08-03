import { latestVerificationDate } from "@/lib/topics";

export function GET() {
  return Response.json(
    {
      status: "ok",
      service: "roetgesportal",
      contentLastVerifiedAt: latestVerificationDate,
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
