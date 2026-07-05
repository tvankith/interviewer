import { UseMutationResult } from "@tanstack/react-query";
import { FileText, Upload, Pen, CheckCircle, XCircle } from "lucide-react"
import { Dispatch, SetStateAction } from "react"

const Header = (props: {
    mode: "form" | "spec";
    setMode: Dispatch<SetStateAction<"form" | "spec">>;
    parseResume: UseMutationResult<any, Error, { file?: File | null; text?: string }, unknown>;
    importStatus?: { type: "success" | "error"; message: string } | null;
}) => {
    const { mode, setMode, parseResume, importStatus } = props

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
                    Edit Resume1
                </button>
                <button
                    onClick={() => setMode("spec")}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded transition-colors ${mode === "spec"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <Pen size={13} />
                    Spec1``
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
            </div>
        </div>
    )
}

export default Header
