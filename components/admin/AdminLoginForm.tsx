"use client";

import { UnifiedAuthView } from "@/components/auth/UnifiedAuthView";

export function AdminLoginForm() {
  return (
    <UnifiedAuthView
      defaultAccountType="seller"
      forceSellerRedirect={true}
    />
  );
}
