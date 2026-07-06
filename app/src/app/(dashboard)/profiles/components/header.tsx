import { UseMutationResult } from "@tanstack/react-query";
import { FileText, Upload, Download, Pen, CheckCircle, XCircle } from "lucide-react"
import { Dispatch, SetStateAction, useState } from "react"
import type { ResumeData } from "@/resume-engine/types/resume-data";
import type { TemplateDocument } from "@/resume-engine/types/template";
import type { ThemeDocument } from "@/resume-engine/types/theme";

const Header = (props: {
    mode: "form" | "spec";
    setMode: Dispatch<SetStateAction<"form" | "spec">>;
    parseResume: UseMutationResult<any, Error, { file?: File | null; text?: string }, unknown>;
    importStatus?: { type: "success" | "error"; message: string } | null;
    templateDoc: TemplateDocument;
    themeDoc: ThemeDocument;
    values: ResumeData;
}) => {
    const { mode, setMode, parseResume, importStatus, templateDoc, themeDoc, values } = props
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const handleDownloadClick = async () => {
        // setIsDownloading(true);
        // setDownloadError(null);
        // try {
        //     const response = await generateResumePdf({ templateDoc, themeDoc, data: values });
        //     if (!response.success || !response.data) {
        //         setDownloadError(response.message || "Failed to generate PDF");
        //         return;
        //     }
        //     const link = document.createElement("a");
        //     link.href = `/api/pdf/download?url=${encodeURIComponent(response.data)}&filename=resume.pdf`;
        //     link.download = "resume.pdf";
        //     document.body.appendChild(link);
        //     link.click();
        //     document.body.removeChild(link);
        // } catch {
        //     setDownloadError("Failed to generate PDF");
        // } finally {
        //     setIsDownloading(false);
        // }
    };

    return (
        <div className="border-b px-5 py-3 flex items-center justify-between">
            <div className="flex gap-1 bg-muted rounded-md p-1">
                <button
                    onClick={() => setMode("form")}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded transition-colors ${mode === "form"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <FileText size={13} />
                    Edit Resume
                </button>
                <button
                    onClick={() => setMode("spec")}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded transition-colors ${mode === "spec"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <Pen size={13} />
                    Spec
                </button>
            </div>
            <div className="flex items-center gap-3">
                {importStatus && (
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${importStatus.type === "success" ? "text-green-600" : "text-red-600"}`}>
                        {importStatus.type === "success" ? <CheckCircle size={13} /> : <XCircle size={13} />}
                        {importStatus.message}
                    </span>
                )}
                <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) parseResume.mutate({ file });
                        e.target.value = "";
                    }}
                    className="hidden"
                    id="resume-import"
                />
                <button
                    onClick={() => document.getElementById("resume-import")?.click()}
                    disabled={parseResume.isPending}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Upload size={16} />
                    {parseResume.isPending ? "Importing..." : "Import Resume"}
                </button>
                <div className="relative">
                    <button
                        onClick={handleDownloadClick}
                        disabled={isDownloading}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Download size={16} />
                        {isDownloading ? "Downloading..." : "Download"}
                    </button>
                    {downloadError && (
                        <div className="absolute right-0 top-full mt-1 w-48 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1 z-10">
                            {downloadError}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Header
