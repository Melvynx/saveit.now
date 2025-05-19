export default async function RoutePage(props: {
  params: Promise<{ bookmarkId: string }>;
}) {
  const params = await props.params;
  return <div>RoutePage {params.bookmarkId}</div>;
}
