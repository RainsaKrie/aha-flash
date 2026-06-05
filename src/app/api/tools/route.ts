import { NextResponse } from "next/server";
import { V1_TOOLS } from "@/lib/tools";

export async function POST(req: Request) {
  const { name, arguments: args = {} } = await req.json();
  const tool = V1_TOOLS[name as keyof typeof V1_TOOLS];

  if (!tool) {
    return NextResponse.json({ success: false, error: `Unknown tool: ${name}` }, { status: 400 });
  }

  const result = await tool.execute(args);
  return NextResponse.json(result);
}
