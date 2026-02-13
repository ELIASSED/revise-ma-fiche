import ReportClient from "./report-client";

export default function ReportPage({
  params,
}: {
  params: { jobId: string };
}) {
  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <ReportClient jobId={params.jobId} />
      </div>
    </main>
  );
}
