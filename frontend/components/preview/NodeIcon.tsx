import {
  Play,
  Bot,
  Square,
  FileSearch,
  Shield,
  Plug,
  GitBranch,
  RotateCw,
  Hand,
  Cog,
  Save,
  StickyNote,
  Box,
} from "lucide-react";

import type { NodeType } from "@/types/workflow";

interface NodeIconProps {
  type: NodeType;
  className?: string;
}

export function NodeIcon({ type, className = "w-4 h-4" }: NodeIconProps) {
  const iconProps = { className };

  switch (type) {
    case "start":
      return <Play {...iconProps} className={`${className} text-green-400`} />;
    case "agent":
      return <Bot {...iconProps} className={`${className} text-blue-400`} />;
    case "end":
      return <Square {...iconProps} className={`${className} text-green-400`} />;
    case "fileSearch":
      return <FileSearch {...iconProps} className={`${className} text-yellow-400`} />;
    case "guardrails":
      return <Shield {...iconProps} className={`${className} text-orange-400`} />;
    case "mcp":
      return <Plug {...iconProps} className={`${className} text-yellow-400`} />;
    case "ifElse":
      return <GitBranch {...iconProps} className={`${className} text-orange-400`} />;
    case "while":
      return <RotateCw {...iconProps} className={`${className} text-orange-400`} />;
    case "userApproval":
      return <Hand {...iconProps} className={`${className} text-orange-400`} />;
    case "transform":
      return <Cog {...iconProps} className={`${className} text-purple-400`} />;
    case "setState":
      return <Save {...iconProps} className={`${className} text-purple-400`} />;
    case "note":
      return <StickyNote {...iconProps} className={`${className} text-yellow-400`} />;
    default:
      return <Box {...iconProps} className={`${className} text-gray-400`} />;
  }
}
