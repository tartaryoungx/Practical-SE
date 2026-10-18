import { GarmentPage } from "@/features/returns/garment-pages";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  return <GarmentPage id={id} created={query.created === "1"} />;
}
