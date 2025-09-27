import { MerchantContent } from "@/components/merchant-content";
import { CreateWallet } from "@/components/create-wallet";

interface MerchantDashboardProps {
  view?: "dashboard" | "create-wallet";
}

export function MerchantDashboard({
  view = "dashboard",
}: MerchantDashboardProps) {
  if (view === "create-wallet") {
    return <CreateWallet />;
  }

  return <MerchantContent />;
}
