"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") throw new Error("FORBIDDEN");
  return session;
}

type Result = { ok: true } | { ok: false; error: string };

export async function updateFareMultiplier(
  tripId: string,
  multiplier: number
): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Admins only." };
  }
  if (!Number.isFinite(multiplier) || multiplier < 0.5 || multiplier > 3) {
    return { ok: false, error: "Multiplier must be between 0.5 and 3." };
  }
  await prisma.trip.update({
    where: { id: tripId },
    data: { fareMultiplier: multiplier },
  });
  revalidatePath("/admin");
  revalidatePath("/routes");
  return { ok: true };
}

export async function toggleTripActive(tripId: string): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Admins only." };
  }
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return { ok: false, error: "Trip not found." };
  await prisma.trip.update({
    where: { id: tripId },
    data: { active: !trip.active },
  });
  revalidatePath("/admin");
  revalidatePath("/routes");
  return { ok: true };
}
