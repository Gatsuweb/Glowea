import PagePubliqueClient from "./PagePubliqueClient";
import { getPublicPageConfig } from "../../actions/publicPageActions";

export default async function PagePubliqueDashboardPage() {
  const data = await getPublicPageConfig();
  return <PagePubliqueClient initialData={data} />;
}
