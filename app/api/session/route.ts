import { NextResponse } from "next/server";
import { chatGPTSignInPath, getChatGPTUser } from "@/app/chatgpt-auth";

export async function GET() {
  const user = await getChatGPTUser();
  return NextResponse.json(
    {
      authenticated: Boolean(user),
      displayName: user?.displayName ?? null,
      signInPath: chatGPTSignInPath("/"),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
