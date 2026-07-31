"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SubscriptionAccess } from "../../lib/subscription";
import { PRICING_PATH } from "../../lib/pricing";

type Props = {
  subscriptionAccess: Pick<SubscriptionAccess, "isTrialExpired" | "isActive">;
};

export default function TrialExpiredPricingRedirect({ subscriptionAccess }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!subscriptionAccess.isTrialExpired || subscriptionAccess.isActive) return;
    if (searchParams.get("success") === "true" || searchParams.has("session_id")) return;

    router.replace(PRICING_PATH);
  }, [router, searchParams, subscriptionAccess.isActive, subscriptionAccess.isTrialExpired]);

  return null;
}
