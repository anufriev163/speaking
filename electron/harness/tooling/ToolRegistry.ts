import { ToolDefinition } from '../types';
import { injectTextUnicode } from '../../services/win32';
import { detectActiveContext } from '../../services/contextDetector';
import { ActiveContext } from '../../../src/types';
import { clipboard } from 'electron';

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  public registerTool<P, R>(tool: ToolDefinition<P, R>): void {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public async executeTool<P, R>(name: string, params: P): Promise<R> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`[ToolRegistry] Tool '${name}' is not registered`);
    }
    return await tool.execute(params);
  }

  private registerDefaultTools(): void {
    // 1. Native Win32 SendInput tool
    this.registerTool<string, boolean>({
      name: 'win32_inject_text',
      description: 'Injects unicode text into the currently focused window via Win32 SendInput FFI',
      execute: (text: string) => injectTextUnicode(text)
    });

    // 2. Active Window Context Detection tool
    this.registerTool<void, ActiveContext>({
      name: 'get_active_context',
      description: 'Queries foreground window title and process name for contextual adaptation',
      execute: () => detectActiveContext()
    });

    // 3. Clipboard fallback tool
    this.registerTool<string, boolean>({
      name: 'clipboard_copy',
      description: 'Copies text to clipboard as a fallback or user utility',
      execute: (text: string) => {
        try {
          clipboard.writeText(text);
          return true;
        } catch {
          return false;
        }
      }
    });
  }
}
