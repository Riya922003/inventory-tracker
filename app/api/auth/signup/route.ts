import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Signup endpoint removed. Please use /onboarding to create an account." },
    { status: 410 }
  );
}
