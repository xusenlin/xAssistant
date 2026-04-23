import { useState } from "react";
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface CollapsibleSectionProps {
  icon: React.ReactNode;
  label: string;
  preview?: string;
  colorClass: string;
  hoverClass: string;
  children: React.ReactNode;
}

export function CollapsibleSection({
  icon,
  label,
  preview,
  colorClass,
  hoverClass,
  children,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`mt-2 rounded ${colorClass}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex w-full items-center gap-1 p-2 font-medium ${hoverClass} rounded`}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {icon}
        <span>{label}</span>
        {!expanded && preview && (
          <span className="ml-auto opacity-70 truncate max-w-[200px]">
            {preview.substring(0, 50)}...
          </span>
        )}
      </button>
      {expanded && <div className="px-2 pb-2 whitespace-pre-wrap">{children}</div>}
    </div>
  );
}

interface BlockContentProps {
  blockType: string;
  content: string;
  toolName?: string;
  toolInput?: string;
  toolResult?: string;
  isError?: boolean;
  showCursor?: boolean;
}

function formatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

export function BlockContent({
  blockType,
  content,
  toolName,
  toolInput,
  toolResult,
  isError,
  showCursor,
}: BlockContentProps) {
  switch (blockType) {
    case "text":
      if (isError) {
        return (
          <div className="mt-2 rounded bg-red-100 p-2 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-200">
            <div className="flex items-center gap-1 font-medium">
              <AlertTriangle className="h-3 w-3" /> Error
            </div>
            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">{content}</pre>
          </div>
        );
      }
      return (
        <div className="mt-2 prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || " "}</ReactMarkdown>
          {showCursor && <span className="animate-pulse">|</span>}
        </div>
      );

    case "thinking":
      if (showCursor) {
        return (
          <div className="mt-2 rounded bg-yellow-100 p-2 text-xs text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
            <span className="mr-1">💭</span>
            {content}
            <span className="animate-pulse">|</span>
          </div>
        );
      }
      return (
        <CollapsibleSection
          icon={<span>💭</span>}
          label="Thinking"
          preview={content}
          colorClass="bg-yellow-100 text-xs text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
          hoverClass="hover:bg-yellow-200/50 dark:hover:bg-yellow-800/30"
        >
          {content}
        </CollapsibleSection>
      );

    case "tool_use":
      if (showCursor) {
        return (
          <div className="mt-2 rounded bg-blue-100 p-2 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
            <div className="flex items-center gap-1 font-medium">
              <span>🔧</span> {toolName || "Tool"}
            </div>
            {content && (
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
                {formatJson(content)}
              </pre>
            )}
          </div>
        );
      }
      return (
        <CollapsibleSection
          icon={<span>🔧</span>}
          label={toolName || "Tool"}
          preview={toolInput}
          colorClass="bg-blue-100 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
          hoverClass="hover:bg-blue-200/50 dark:hover:bg-blue-800/30"
        >
          {toolInput && <pre className="overflow-x-auto">{formatJson(toolInput)}</pre>}
        </CollapsibleSection>
      );

    case "tool_result":
      if (showCursor) {
        return (
          <div
            className={`mt-2 rounded p-2 text-xs ${
              isError
                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
                : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
            }`}
          >
            <div className="flex items-center gap-1 font-medium">
              {isError ? <AlertTriangle className="h-3 w-3" /> : <span>📦</span>} Result
            </div>
            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">{content}</pre>
          </div>
        );
      }
      return (
        <CollapsibleSection
          icon={isError ? <AlertTriangle className="h-3 w-3" /> : <span>📦</span>}
          label="Result"
          preview={toolResult}
          colorClass={
            isError
              ? "bg-red-100 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-200"
              : "bg-green-100 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-200"
          }
          hoverClass={
            isError
              ? "hover:bg-red-200/50 dark:hover:bg-red-800/30"
              : "hover:bg-green-200/50 dark:hover:bg-green-800/30"
          }
        >
          {toolResult}
        </CollapsibleSection>
      );

    default:
      return <span className="mt-2 text-sm">{content}</span>;
  }
}
