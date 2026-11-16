import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function POST() {
  const { error } = await supabase
    .from("treenimaster_integrations")
    .delete()
    .eq("provider", "withings");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ disconnected: true });
}
