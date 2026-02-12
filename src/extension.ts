import * as vscode from 'vscode';
import { palettes, FlavorName } from './palettes';
import { createDecorations, DecorationSet, disposeDecorations } from './decorator';
import { parseDocument } from './parser';

let decorations: DecorationSet | null = null;
let timeout: ReturnType<typeof setTimeout> | undefined;

function getConfig() {
  const config = vscode.workspace.getConfiguration('catppuccinTsdoc');
  return {
    flavor: config.get<FlavorName>('flavor', 'mocha'),
    enableItalicDescriptions: config.get<boolean>('enableItalicDescriptions', true),
    enableBoldTags: config.get<boolean>('enableBoldTags', true),
    opacity: config.get<number>('opacity', 1),
  };
}

function initDecorations(): DecorationSet {
  if (decorations) {
    disposeDecorations(decorations);
  }
  const config = getConfig();
  const palette = palettes[config.flavor];
  decorations = createDecorations(palette, config);
  return decorations;
}

function updateDecorations(editor: vscode.TextEditor): void {
  if (!decorations) {
    decorations = initDecorations();
  }

  const parsed = parseDocument(editor.document);

  editor.setDecorations(decorations.tag, parsed.tags);
  editor.setDecorations(decorations.paramName, parsed.paramNames);
  editor.setDecorations(decorations.type, parsed.types);
  editor.setDecorations(decorations.description, parsed.descriptions);
  editor.setDecorations(decorations.link, parsed.links);
  editor.setDecorations(decorations.commentDelimiter, parsed.commentDelimiters);
  editor.setDecorations(decorations.deprecated, parsed.deprecated);
  editor.setDecorations(decorations.example, parsed.examples);
  editor.setDecorations(decorations.returns, parsed.returns);
  editor.setDecorations(decorations.defaultValue, parsed.defaultValues);
  editor.setDecorations(decorations.since, parsed.since);
  editor.setDecorations(decorations.see, parsed.see);
  editor.setDecorations(decorations.throws, parsed.throws);
}

function triggerUpdateDecorations(editor: vscode.TextEditor): void {
  if (timeout) {
    clearTimeout(timeout);
  }
  timeout = setTimeout(() => updateDecorations(editor), 150);
}

export function activate(context: vscode.ExtensionContext): void {
  decorations = initDecorations();

  // Apply to the active editor on activation
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    triggerUpdateDecorations(activeEditor);
  }

  // Update when the active editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        triggerUpdateDecorations(editor);
      }
    }),
  );

  // Update when a document changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const editor = vscode.window.activeTextEditor;
      if (editor && event.document === editor.document) {
        triggerUpdateDecorations(editor);
      }
    }),
  );

  // Re-initialize when configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('catppuccinTsdoc')) {
        decorations = initDecorations();
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          updateDecorations(editor);
        }
      }
    }),
  );

  // Command: Switch flavor
  context.subscriptions.push(
    vscode.commands.registerCommand('catppuccinTsdoc.switchFlavor', async () => {
      const items: vscode.QuickPickItem[] = [
        { label: '🌿 Mocha', description: 'The Original — Darkest variant' },
        { label: '🌺 Macchiato', description: 'Medium contrast dark theme' },
        { label: '🪴 Frappé', description: 'Muted dark theme' },
        { label: '🌻 Latte', description: 'Light theme' },
      ];

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: '🐱 Choose your Catppuccin flavor',
      });

      if (selected) {
        const flavorMap: Record<string, FlavorName> = {
          '🌿 Mocha': 'mocha',
          '🌺 Macchiato': 'macchiato',
          '🪴 Frappé': 'frappe',
          '🌻 Latte': 'latte',
        };

        const flavor = flavorMap[selected.label];
        if (flavor) {
          await vscode.workspace
            .getConfiguration('catppuccinTsdoc')
            .update('flavor', flavor, vscode.ConfigurationTarget.Global);

          vscode.window.showInformationMessage(
            `🐱 Catppuccin TSDoc: Switched to ${selected.label}`,
          );
        }
      }
    }),
  );

  // Command: Refresh
  context.subscriptions.push(
    vscode.commands.registerCommand('catppuccinTsdoc.refresh', () => {
      decorations = initDecorations();
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        updateDecorations(editor);
      }
      vscode.window.showInformationMessage('🐱 Catppuccin TSDoc: Highlights refreshed!');
    }),
  );
}

export function deactivate(): void {
  if (decorations) {
    disposeDecorations(decorations);
    decorations = null;
  }
  if (timeout) {
    clearTimeout(timeout);
  }
}
