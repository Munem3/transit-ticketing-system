"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import type { WalletProvider } from "@/lib/enums";

type ActionResult = { ok: true; balance: number } | { ok: false; error: string };

const PRESETS = [200, 500, 1000, 2000];

/**
 * Mock top-up from a digital wallet (bKash / Rocket / Card). No real money moves;
 * it just credits the demo balance and records a transaction.
 */
export async function topUp(
  provider: WalletProvider,
  amount: number
): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Please log in." };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter a valid amount." };
  }
  if (amount > 50000) {
    return { ok: false, error: "Max top-up is ৳50,000 per transaction." };
  }

  const balanceAfter = user.balance + amount;
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { balance: balanceAfter },
    }),
    prisma.transaction.create({
      data: {
        userId: user.id,
        type: "TOPUP",
        provider,
        amount,
        balanceAfter,
        note: `Top-up via ${provider}`,
      },
    }),
  ]);

  revalidatePath("/wallet");
  return { ok: true, balance: balanceAfter };
}

export { PRESETS as TOPUP_PRESETS };
