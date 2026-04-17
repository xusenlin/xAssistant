import { Folder, ChevronRight, ChevronDown, FileText } from "lucide-react";

interface SkillFileInfo {
  path: string;
  name: string;
  size: number;
  is_dir: boolean;
}

interface SkillFileTreeProps {
  files: SkillFileInfo[];
  selectedFile: string;
  expandedDirs: Set<string>;
  onToggleDir: (path: string) => void;
  onSelectFile: (path: string) => void;
}

type TreeNode = { children: Map<string, TreeNode>; files: SkillFileInfo[] };

function buildTree(files: SkillFileInfo[]): TreeNode {
  const root: TreeNode = { children: new Map(), files: [] };
  files.forEach((f) => {
    const parts = f.path.split("/");
    let current = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const dir = parts[i];
      if (!current.children.has(dir)) {
        current.children.set(dir, { children: new Map(), files: [] });
      }
      current = current.children.get(dir)!;
    }
    current.files.push(f);
  });
  return root;
}

function TreeNode({
  node,
  parentPath,
  depth,
  expandedDirs,
  selectedFile,
  onToggleDir,
  onSelectFile,
}: {
  node: TreeNode;
  parentPath: string;
  depth: number;
  expandedDirs: Set<string>;
  selectedFile: string;
  onToggleDir: (path: string) => void;
  onSelectFile: (path: string) => void;
}): React.ReactNode {
  const sortedDirs = Array.from(node.children.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const sortedFiles = [...node.files]
    .filter((f) => !f.is_dir)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      {sortedDirs.map(([dirName, child]) => {
        const dirPath = parentPath ? `${parentPath}/${dirName}` : dirName;
        const isOpen = expandedDirs.has(dirPath);
        return (
          <div key={dirName}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => onToggleDir(dirPath)}
              onKeyDown={(e) => e.key === "Enter" && onToggleDir(dirPath)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors cursor-pointer"
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
            >
              {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <Folder className="h-3 w-3 text-yellow-500" />
              <span className="text-muted-foreground hover:text-foreground">{dirName}</span>
            </div>
            {isOpen && (
              <TreeNode
                node={child}
                parentPath={dirPath}
                depth={depth + 1}
                expandedDirs={expandedDirs}
                selectedFile={selectedFile}
                onToggleDir={onToggleDir}
                onSelectFile={onSelectFile}
              />
            )}
          </div>
        );
      })}
      {sortedFiles.map((f) => (
        <div
          key={f.path}
          role="button"
          tabIndex={0}
          onClick={() => onSelectFile(f.path)}
          onKeyDown={(e) => e.key === "Enter" && onSelectFile(f.path)}
          className={`w-full text-left flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors cursor-pointer ${
            selectedFile === f.path
              ? "text-yellow-500 font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
          style={{ paddingLeft: `${depth * 16 + 10}px` }}
        >
          <FileText className="h-3 w-3" />
          <span>{f.name}</span>
        </div>
      ))}
    </>
  );
}

export default function SkillFileTree({
  files,
  selectedFile,
  expandedDirs,
  onToggleDir,
  onSelectFile,
}: SkillFileTreeProps) {
  const tree = buildTree(files);
  return (
    <div className="flex flex-col gap-0.5 flex-1">
      <TreeNode
        node={tree}
        parentPath=""
        depth={0}
        expandedDirs={expandedDirs}
        selectedFile={selectedFile}
        onToggleDir={onToggleDir}
        onSelectFile={onSelectFile}
      />
    </div>
  );
}
