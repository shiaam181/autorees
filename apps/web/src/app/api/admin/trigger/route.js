import { runPipeline } from "@/app/api/utils/automation-worker.js";

export async function POST(request) {
  try {
    await runPipeline();
    return Response.json({ success: true, message: "Pipeline triggered" });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  return POST(request);
}
