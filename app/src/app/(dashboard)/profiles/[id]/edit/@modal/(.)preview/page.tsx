import CloseButton from "@/app/(dashboard)/profiles/components/close-button";
import { PdfPreviewContent } from "@/app/(dashboard)/profiles/[id]/edit/preview/pdf-content";

type Props = {
  params: { id: string };
};

export const dynamic = 'force-dynamic';

export default function PreviewModal(props: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white w-[90%] h-[90%] rounded-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center px-6 border-b h-16">
          <h2 className="font-semibold text-lg w-full text-center">
            PDF Preview
          </h2>
          <CloseButton />
        </div>

        {/* Content */}
        <div className="h-[calc(100%-64px)]">
          <PdfPreviewContent {...props} />
        </div>
      </div>
    </div>
  );
}
