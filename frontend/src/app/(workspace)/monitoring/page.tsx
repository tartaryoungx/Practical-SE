import { Suspense } from "react";
import { MonitoringPage } from "@/features/operations/monitoring";
import { Loading } from "@/components/ui/shared";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <MonitoringPage />
    </Suspense>
  );
}
