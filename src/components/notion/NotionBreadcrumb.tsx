import { ChevronRight, GraduationCap, ArrowLeft } from "lucide-react";
import { TabeIconRenderer } from "./TabeIcons";

interface NotionBreadcrumbProps {
    subjectCode?: string;
    subjectName?: string;
    documentTitle?: string;
    documentEmoji?: string;
    parentTitle?: string;
    parentEmoji?: string;
    onClickParent?: () => void;
    onClickSubject?: () => void;
    onBack?: () => void;
}

export function NotionBreadcrumb({
    subjectCode,
    subjectName,
    documentTitle,
    documentEmoji,
    parentTitle,
    parentEmoji,
    onClickParent,
    onClickSubject,
    onBack,
}: NotionBreadcrumbProps) {
    return (
        <nav className="notion-breadcrumb flex items-center gap-1 text-sm overflow-hidden">
            <span
                 className="notion-breadcrumb-item text-muted-foreground mr-1 cursor-pointer hover:text-foreground transition-colors"
                 onClick={onBack}
                 title={parentTitle ? `Volver a ${parentTitle}` : "Volver a la Galería"}
                 role="button"
            >
                <ArrowLeft className="w-3.5 h-3.5" />
            </span>
            <ChevronRight className="w-3 h-3 notion-breadcrumb-separator mr-1 text-muted-foreground/50 shrink-0" />

            {subjectCode && (
                <>
                    <span
                        className="notion-breadcrumb-item cursor-pointer hover:text-foreground transition-colors flex items-center gap-1.5"
                        onClick={onClickSubject}
                        title={subjectName}
                    >
                        <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                        {subjectCode}
                    </span>
                    <ChevronRight className="w-3 h-3 notion-breadcrumb-separator text-muted-foreground/50 shrink-0" />
                </>
            )}

            {parentTitle && (
                <>
                    <span
                        className="notion-breadcrumb-item cursor-pointer hover:text-foreground transition-colors flex items-center gap-1.5 truncate max-w-[150px]"
                        onClick={onClickParent}
                        title={`Apunte principal: ${parentTitle}`}
                    >
                        <TabeIconRenderer iconId={parentEmoji || "book"} size={14} />
                        <span className="truncate">{parentTitle}</span>
                    </span>
                    <ChevronRight className="w-3 h-3 notion-breadcrumb-separator text-muted-foreground/50 shrink-0" />
                </>
            )}

            <span className="notion-breadcrumb-item font-semibold flex items-center gap-1.5 truncate max-w-[200px]" style={{ cursor: "default" }}>
                <TabeIconRenderer iconId={documentEmoji || "book"} size={16} />
                <span className="truncate">{documentTitle || "Sin título"}</span>
            </span>
        </nav>
    );
}
