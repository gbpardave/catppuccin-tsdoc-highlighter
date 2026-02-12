import * as vscode from 'vscode';
import { CatppuccinPalette } from './palettes';

export interface DecorationSet {
  tag: vscode.TextEditorDecorationType;
  paramName: vscode.TextEditorDecorationType;
  type: vscode.TextEditorDecorationType;
  description: vscode.TextEditorDecorationType;
  link: vscode.TextEditorDecorationType;
  commentDelimiter: vscode.TextEditorDecorationType;
  deprecated: vscode.TextEditorDecorationType;
  example: vscode.TextEditorDecorationType;
  returns: vscode.TextEditorDecorationType;
  defaultValue: vscode.TextEditorDecorationType;
  since: vscode.TextEditorDecorationType;
  see: vscode.TextEditorDecorationType;
  throws: vscode.TextEditorDecorationType;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function createDecorations(
  palette: CatppuccinPalette,
  config: {
    enableItalicDescriptions: boolean;
    enableBoldTags: boolean;
    opacity: number;
  },
): DecorationSet {
  const { enableItalicDescriptions, enableBoldTags, opacity } = config;
  const bold = enableBoldTags ? 'bold' : 'normal';
  const italic = enableItalicDescriptions ? 'italic' : 'normal';

  return {
    tag: vscode.window.createTextEditorDecorationType({
      color: hexToRgba(palette.mauve, opacity),
      fontWeight: bold,
    }),

    paramName: vscode.window.createTextEditorDecorationType({
      color: hexToRgba(palette.peach, opacity),
      fontWeight: bold,
    }),

    type: vscode.window.createTextEditorDecorationType({
      color: hexToRgba(palette.yellow, opacity),
      fontStyle: italic,
    }),

    description: vscode.window.createTextEditorDecorationType({
      color: hexToRgba(palette.subtext1, opacity),
      fontStyle: italic,
    }),

    link: vscode.window.createTextEditorDecorationType({
      color: hexToRgba(palette.sapphire, opacity),
      textDecoration: 'underline',
    }),

    commentDelimiter: vscode.window.createTextEditorDecorationType({
      color: hexToRgba(palette.overlay1, opacity),
    }),

    deprecated: vscode.window.createTextEditorDecorationType({
      color: hexToRgba(palette.red, opacity),
      fontWeight: bold,
      textDecoration: 'line-through',
      fontStyle: italic,
    }),

    example: vscode.window.createTextEditorDecorationType({
      color: hexToRgba(palette.green, opacity),
      fontWeight: bold,
    }),

    returns: vscode.window.createTextEditorDecorationType({
      color: hexToRgba(palette.teal, opacity),
      fontWeight: bold,
    }),

    defaultValue: vscode.window.createTextEditorDecorationType({
      color: hexToRgba(palette.flamingo, opacity),
      fontStyle: italic,
    }),

    since: vscode.window.createTextEditorDecorationType({
      color: hexToRgba(palette.lavender, opacity),
      fontStyle: italic,
    }),

    see: vscode.window.createTextEditorDecorationType({
      color: hexToRgba(palette.sky, opacity),
      fontStyle: italic,
    }),

    throws: vscode.window.createTextEditorDecorationType({
      color: hexToRgba(palette.maroon, opacity),
      fontWeight: bold,
    }),
  };
}

export function disposeDecorations(decorations: DecorationSet): void {
  Object.values(decorations).forEach((d) =>
    (d as vscode.TextEditorDecorationType).dispose(),
  );
}
