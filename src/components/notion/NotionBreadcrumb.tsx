import { ChevronRight, GraduationCap, ArrowLeft } from "lucide-react";
import { TabeIconRenderer } from "./TabeIcons";

interface NotionBreadcrumbProps {
    subjectCode?: string;
    subjectName?: string;
    documentTitle?: string;
    documentEmoji?: string;
    onClickSubject?: () => void;
    onBack?: () => void;
}

export function NotionBreadcrumb({
    subjectCode,
    subjectName,
    documentTitle,
    documentEmoji,
    onClickSubject,
    onBack,
}: NotionBreadcrumbProps) {
    return (
        <nav className="notion-breadcrumb">
            <span
                 className="notion-breadcrumb-item text-muted-foreground mr-1"
                 onClick={onBack}
                 title="Volver a la Galería"
                 role="button"
            >
                <ArrowLeft className="w-3.5 h-3.5" />
            </span>
            <ChevronRight className="w-3 h-3 notion-breadcrumb-separator mr-1" />

            {subjectCode && (
                <>
                    <span
                        className="notion-breadcrumb-item"
                        onClick={onClickSubject}
                        title={subjectName}
                    >
                        <GraduationCap className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                        {subjectCode}
                    </span>
                    <ChevronRight className="w-3 h-3 notion-breadcrumb-separator" />
                </>
            )}
            <span className="notion-breadcrumb-item" style={{ cursor: "default" }}>
                <TabeIconRenderer iconId={documentEmoji || "book"} size={16} />
                {documentTitle || "Sin título"}
            </span>
        </nav>
    );
}
