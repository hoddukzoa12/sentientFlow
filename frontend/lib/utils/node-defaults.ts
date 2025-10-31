import type { NodeType } from "@/types/workflow";

// Helper function to generate default node data based on node type
export function getDefaultNodeData(type: NodeType): any {
  switch (type) {
    case "start":
      return {
        inputVariables: [
          {
            id: "input_as_text",
            name: "input_as_text",
            type: "string",
          },
        ],
        stateVariables: [],
      };

    case "agent":
      return {
        name: "My agent",
        systemPrompt: "You are a helpful assistant.",
        userPrompt: "",  // Auto-uses input_as_text if empty
        model: "gpt-5",
        reasoningEffort: "medium",  // GPT-5 default
        provider: "openai",  // Default provider
        includeHistory: true,
        tools: [],
        outputFormat: "text",
      };

    case "end":
      return {};

    case "note":
      return {
        content: "",
      };

    case "fileSearch":
      return {
        name: "File search",
        query: "",
        files: [],
      };

    case "guardrails":
      return {
        name: "Guardrails",
        input: "",
        categories: [],
        piiCheck: false,
        moderationCheck: false,
        jailbreakCheck: false,
        hallucinationCheck: false,
        continueOnError: false,
      };

    case "mcp":
      return {
        name: "MCP",
        server: "",
        method: "",
        params: {},
      };

    case "ifElse":
      return {
        conditions: [
          {
            id: "condition-1",
            name: "Condition",
            expression: "",
          },
        ],
      };

    case "while":
      return {
        expression: "",
      };

    case "userApproval":
      return {
        message: "Please review and approve to continue",
        timeout: 300,
      };

    case "transform":
      return {
        name: "Transform",
        outputType: "expressions",
        assignments: [],
      };

    case "setState":
      return {
        assignments: [],
      };

    default:
      return {};
  }
}
