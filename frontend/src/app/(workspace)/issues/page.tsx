import { Suspense } from "react";
import { IssuesPage } from "@/features/operations/issues";
import { Loading } from "@/components/ui/shared";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <IssuesPage />
    </Suspense>
  );
}
