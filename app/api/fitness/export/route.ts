import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/fitness/export?kind=strength|running|other|all
 *
 * Phase 3J — Export do histórico fitness em CSV pra análise externa
 * (planilha, Notion, papel).
 */

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowsToCsv(headers: string[], rows: unknown[][]): string {
  const lines: string[] = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  return lines.join("\n");
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "supabase-not-configured" },
      { status: 503 },
    );
  }
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") ?? "all";

  const supabase = await createSupabaseWithJwt(accessToken);
  let csvContent = "";
  let filename = `fitness-export-${new Date().toISOString().slice(0, 10)}.csv`;

  if (kind === "strength" || kind === "all") {
    const { data } = await supabase
      .from("workout_sets")
      .select(
        `set_order, weight_kg, reps, rpe, notes, created_at,
         workout_sessions!inner(patient_id, session_date),
         exercise_catalog!inner(id, name, muscle_group)`,
      )
      .eq("workout_sessions.patient_id", userId)
      .order("created_at", { ascending: false });

    const rows = (data ?? []).map((r) => {
      const sess = (
        r as { workout_sessions?: { session_date?: string } }
      ).workout_sessions;
      const ex = (
        r as {
          exercise_catalog?: {
            id?: string;
            name?: string;
            muscle_group?: string;
          };
        }
      ).exercise_catalog;
      return [
        sess?.session_date ?? "",
        ex?.id ?? "",
        ex?.name ?? "",
        ex?.muscle_group ?? "",
        r.set_order,
        r.weight_kg ?? "",
        r.reps,
        r.rpe ?? "",
        r.notes ?? "",
        r.created_at,
      ];
    });
    const strengthCsv = rowsToCsv(
      [
        "session_date",
        "exercise_id",
        "exercise_name",
        "muscle_group",
        "set_order",
        "weight_kg",
        "reps",
        "rpe",
        "notes",
        "created_at",
      ],
      rows,
    );

    if (kind === "strength") {
      csvContent = strengthCsv;
      filename = `musculacao-${new Date().toISOString().slice(0, 10)}.csv`;
    } else {
      csvContent += "# MUSCULAÇÃO\n" + strengthCsv + "\n\n";
    }
  }

  if (kind === "running" || kind === "all") {
    const { data } = await supabase
      .from("running_sessions")
      .select(
        `distance_km, duration_seconds, avg_pace_seconds_per_km, created_at,
         workout_sessions!inner(patient_id, session_date, notes)`,
      )
      .eq("workout_sessions.patient_id", userId)
      .order("created_at", { ascending: false });

    const rows = (data ?? []).map((r) => {
      const sess = (
        r as {
          workout_sessions?: { session_date?: string; notes?: string | null };
        }
      ).workout_sessions;
      return [
        sess?.session_date ?? "",
        r.distance_km ?? "",
        r.duration_seconds ?? "",
        r.avg_pace_seconds_per_km ?? "",
        sess?.notes ?? "",
        r.created_at,
      ];
    });
    const runningCsv = rowsToCsv(
      [
        "session_date",
        "distance_km",
        "duration_seconds",
        "avg_pace_seconds_per_km",
        "notes",
        "created_at",
      ],
      rows,
    );

    if (kind === "running") {
      csvContent = runningCsv;
      filename = `corrida-${new Date().toISOString().slice(0, 10)}.csv`;
    } else {
      csvContent += "# CORRIDA\n" + runningCsv + "\n\n";
    }
  }

  if (kind === "other" || kind === "all") {
    const { data } = await supabase
      .from("other_workouts")
      .select(
        `activity_type, duration_minutes, intensity, distance_km, estimated_calories, created_at,
         workout_sessions!inner(patient_id, session_date, notes)`,
      )
      .eq("workout_sessions.patient_id", userId)
      .order("created_at", { ascending: false });

    const rows = (data ?? []).map((r) => {
      const sess = (
        r as {
          workout_sessions?: { session_date?: string; notes?: string | null };
        }
      ).workout_sessions;
      return [
        sess?.session_date ?? "",
        r.activity_type,
        r.duration_minutes,
        r.intensity,
        r.distance_km ?? "",
        r.estimated_calories ?? "",
        sess?.notes ?? "",
        r.created_at,
      ];
    });
    const otherCsv = rowsToCsv(
      [
        "session_date",
        "activity_type",
        "duration_minutes",
        "intensity",
        "distance_km",
        "estimated_calories",
        "notes",
        "created_at",
      ],
      rows,
    );

    if (kind === "other") {
      csvContent = otherCsv;
      filename = `outras-${new Date().toISOString().slice(0, 10)}.csv`;
    } else {
      csvContent += "# OUTRAS ATIVIDADES\n" + otherCsv + "\n\n";
    }
  }

  if (kind === "body" || kind === "all") {
    const { data } = await supabase
      .from("body_measurements")
      .select("*")
      .eq("patient_id", userId)
      .order("measured_at", { ascending: false });

    const rows = (data ?? []).map((r) => [
      r.measured_at,
      r.weight_kg ?? "",
      r.body_fat_pct ?? "",
      r.muscle_mass_kg ?? "",
      r.waist_cm ?? "",
      r.chest_cm ?? "",
      r.hip_cm ?? "",
      r.arm_cm ?? "",
      r.thigh_cm ?? "",
      r.notes ?? "",
      r.created_at,
    ]);
    const bodyCsv = rowsToCsv(
      [
        "measured_at",
        "weight_kg",
        "body_fat_pct",
        "muscle_mass_kg",
        "waist_cm",
        "chest_cm",
        "hip_cm",
        "arm_cm",
        "thigh_cm",
        "notes",
        "created_at",
      ],
      rows,
    );

    if (kind === "body") {
      csvContent = bodyCsv;
      filename = `medidas-${new Date().toISOString().slice(0, 10)}.csv`;
    } else {
      csvContent += "# MEDIDAS CORPORAIS\n" + bodyCsv + "\n";
    }
  }

  return new Response(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
