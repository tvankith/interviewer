import { useDropzone } from "react-dropzone";

type ResumeDropzoneProps = {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
};

export default function ResumeDropzone({
  onFileSelect,
  isLoading,
}: ResumeDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    multiple: false,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) onFileSelect(file);
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition
        ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"}
      `}
    >
      <input {...getInputProps()} />

      {isLoading ? (
        <p className="text-sm">Parsing resume...</p>
      ) : isDragActive ? (
        <p className="text-sm">Drop the resume here...</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Drag & drop resume here, or click to upload (PDF/DOC/DOCX)
        </p>
      )}
    </div>
  );
}