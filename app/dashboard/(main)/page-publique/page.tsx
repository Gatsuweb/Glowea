import { Suspense } from "react";
import PagePubliqueClient from "./PagePubliqueClient";
import { getPublicPageConfig } from "../../../actions/publicPageActions";

export default async function PagePubliqueDashboardPage() {
  const data = await getPublicPageConfig();
  return (
    <Suspense fallback={null}>
      <PagePubliqueClient initialData={data} />
    </Suspense>
  );
}
