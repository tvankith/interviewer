import { PdfPreviewContent } from "./pdf-content";

type Props = {
  params: Promise<{ id: string }>;
};

export const dynamic = 'force-dynamic';

export default async function PreviewLayout({ params }: Props) {
  const resolvedParams = await params;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <PdfPreviewContent params={{ id: resolvedParams.id }} />
      </div>
    </div>
  );
}
