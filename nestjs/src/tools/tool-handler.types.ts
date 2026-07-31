export interface ToolHandlerDefinition {
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
}

export interface ToolHandler {
  readonly definition: ToolHandlerDefinition;
  execute(input: Record<string, unknown>): Promise<unknown> | unknown;
}
