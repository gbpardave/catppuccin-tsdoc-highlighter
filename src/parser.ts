import * as vscode from 'vscode';

export interface ParsedComment {
  tags: vscode.Range[];
  paramNames: vscode.Range[];
  types: vscode.Range[];
  descriptions: vscode.Range[];
  links: vscode.Range[];
  commentDelimiters: vscode.Range[];
  deprecated: vscode.Range[];
  examples: vscode.Range[];
  returns: vscode.Range[];
  defaultValues: vscode.Range[];
  since: vscode.Range[];
  see: vscode.Range[];
  throws: vscode.Range[];
}

const RETURN_TAGS = ['@returns', '@return'];
const EXAMPLE_TAGS = ['@example'];
const DEPRECATED_TAGS = ['@deprecated'];
const SINCE_TAGS = ['@since', '@version'];
const SEE_TAGS = ['@see'];
const THROWS_TAGS = ['@throws', '@throw', '@exception'];
const DEFAULT_TAGS = ['@default', '@defaultValue'];
const PARAM_TAGS = ['@param', '@argument', '@arg'];
const TYPE_TAGS = [
  '@type',
  '@typedef',
  '@callback',
  '@template',
  '@enum',
  '@member',
  '@var',
  '@property',
  '@prop',
];
const ALL_TAGS = [
  ...RETURN_TAGS,
  ...EXAMPLE_TAGS,
  ...DEPRECATED_TAGS,
  ...SINCE_TAGS,
  ...SEE_TAGS,
  ...THROWS_TAGS,
  ...DEFAULT_TAGS,
  ...PARAM_TAGS,
  ...TYPE_TAGS,
  '@readonly',
  '@override',
  '@virtual',
  '@abstract',
  '@access',
  '@public',
  '@private',
  '@protected',
  '@internal',
  '@inheritDoc',
  '@packageDocumentation',
  '@module',
  '@namespace',
  '@class',
  '@constructor',
  '@interface',
  '@implements',
  '@extends',
  '@augments',
  '@mixes',
  '@requires',
  '@fires',
  '@emits',
  '@listens',
  '@event',
  '@satisfies',
];

export function parseDocument(document: vscode.TextDocument): ParsedComment {
  const result: ParsedComment = {
    tags: [],
    paramNames: [],
    types: [],
    descriptions: [],
    links: [],
    commentDelimiters: [],
    deprecated: [],
    examples: [],
    returns: [],
    defaultValues: [],
    since: [],
    see: [],
    throws: [],
  };

  const text = document.getText();

  // Match block comments: /** ... */
  const blockCommentRegex = /\/\*\*[\s\S]*?\*\//g;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = blockCommentRegex.exec(text)) !== null) {
    const commentStart = blockMatch.index;
    const commentText = blockMatch[0];

    parseBlockComment(document, commentText, commentStart, result);
  }

  return result;
}

function parseBlockComment(
  document: vscode.TextDocument,
  commentText: string,
  offset: number,
  result: ParsedComment,
): void {
  // Highlight /** and */
  const openPos = document.positionAt(offset);
  const openEnd = document.positionAt(offset + 3); // /**
  result.commentDelimiters.push(new vscode.Range(openPos, openEnd));

  const closeStart = document.positionAt(offset + commentText.length - 2);
  const closeEnd = document.positionAt(offset + commentText.length); // */
  result.commentDelimiters.push(new vscode.Range(closeStart, closeEnd));

  // Highlight leading * on each line
  const leadingStarRegex = /^(\s*)\*/gm;
  let starMatch: RegExpExecArray | null;
  while ((starMatch = leadingStarRegex.exec(commentText)) !== null) {
    // Skip the opening /** and closing */
    if (starMatch.index === 0) continue;
    if (starMatch.index + starMatch[0].length >= commentText.length - 1) continue;

    const starPos = offset + starMatch.index + starMatch[1].length;
    const sPos = document.positionAt(starPos);
    const ePos = document.positionAt(starPos + 1);
    result.commentDelimiters.push(new vscode.Range(sPos, ePos));
  }

  // Parse @tags
  const tagRegex = /@[a-zA-Z]+/g;
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = tagRegex.exec(commentText)) !== null) {
    const tag = tagMatch[0];
    const tagStart = offset + tagMatch.index;
    const tagEnd = tagStart + tag.length;
    const startPos = document.positionAt(tagStart);
    const endPos = document.positionAt(tagEnd);
    const range = new vscode.Range(startPos, endPos);

    if (DEPRECATED_TAGS.includes(tag)) {
      result.deprecated.push(range);
    } else if (EXAMPLE_TAGS.includes(tag)) {
      result.examples.push(range);
    } else if (RETURN_TAGS.includes(tag)) {
      result.returns.push(range);
    } else if (SINCE_TAGS.includes(tag)) {
      result.since.push(range);
    } else if (SEE_TAGS.includes(tag)) {
      result.see.push(range);
    } else if (THROWS_TAGS.includes(tag)) {
      result.throws.push(range);
    } else {
      result.tags.push(range);
    }

    // Parse {type} after tag
    const afterTag = commentText.substring(tagMatch.index + tag.length);
    const typeMatch = afterTag.match(/^\s*(\{[^}]+\})/);
    if (typeMatch) {
      const typeStart = tagEnd + afterTag.indexOf(typeMatch[1]);
      const typeEnd = typeStart + typeMatch[1].length;
      result.types.push(
        new vscode.Range(
          document.positionAt(typeStart),
          document.positionAt(typeEnd),
        ),
      );

      // Parse param name after type for @param tags
      if (PARAM_TAGS.includes(tag)) {
        const afterType = afterTag.substring(
          afterTag.indexOf(typeMatch[1]) + typeMatch[1].length,
        );
        const paramNameMatch = afterType.match(/^\s+(\[?[a-zA-Z_$][\w$.]*\]?)/);
        if (paramNameMatch) {
          const nameStart =
            typeEnd + afterType.indexOf(paramNameMatch[1]);
          const nameEnd = nameStart + paramNameMatch[1].length;
          result.paramNames.push(
            new vscode.Range(
              document.positionAt(nameStart),
              document.positionAt(nameEnd),
            ),
          );

          // Description after param name
          const afterParamName = afterType.substring(
            afterType.indexOf(paramNameMatch[1]) + paramNameMatch[1].length,
          );
          const descMatch = afterParamName.match(/^\s*-?\s*(.+)/);
          if (descMatch && descMatch[1].trim()) {
            parseDescription(
              document,
              nameEnd + afterParamName.indexOf(descMatch[1]),
              descMatch[1],
              result,
            );
          }
        }
      }
    } else if (PARAM_TAGS.includes(tag)) {
      // @param without {type} — param name directly after
      const paramNameMatch = afterTag.match(/^\s+(\[?[a-zA-Z_$][\w$.]*\]?)/);
      if (paramNameMatch) {
        const nameStart = tagEnd + afterTag.indexOf(paramNameMatch[1]);
        const nameEnd = nameStart + paramNameMatch[1].length;
        result.paramNames.push(
          new vscode.Range(
            document.positionAt(nameStart),
            document.positionAt(nameEnd),
          ),
        );

        const afterParamName = afterTag.substring(
          afterTag.indexOf(paramNameMatch[1]) + paramNameMatch[1].length,
        );
        const descMatch = afterParamName.match(/^\s*-?\s*(.+)/);
        if (descMatch && descMatch[1].trim()) {
          parseDescription(
            document,
            nameEnd + afterParamName.indexOf(descMatch[1]),
            descMatch[1],
            result,
          );
        }
      }
    } else if (DEFAULT_TAGS.includes(tag)) {
      // @default value
      const valueMatch = afterTag.match(/^\s+(.+?)(?:\n|\*\/|$)/);
      if (valueMatch && valueMatch[1].trim()) {
        const valStart = tagEnd + afterTag.indexOf(valueMatch[1]);
        const valEnd = valStart + valueMatch[1].trimEnd().length;
        result.defaultValues.push(
          new vscode.Range(
            document.positionAt(valStart),
            document.positionAt(valEnd),
          ),
        );
      }
    }
  }

  // Parse {@link ...} and {@see ...} inline tags
  const inlineLinkRegex = /\{@(?:link|see)\s+([^}]+)\}/g;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = inlineLinkRegex.exec(commentText)) !== null) {
    const linkStart = offset + linkMatch.index;
    const linkEnd = linkStart + linkMatch[0].length;
    result.links.push(
      new vscode.Range(
        document.positionAt(linkStart),
        document.positionAt(linkEnd),
      ),
    );
  }

  // Parse description lines (lines without @ tags, after the first line)
  const lines = commentText.split('\n');
  let currentOffset = offset;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.replace(/^\s*\*?\s?/, '');

    // Skip lines with tags, empty lines, comment delimiters
    if (
      i > 0 &&
      !trimmed.startsWith('@') &&
      trimmed.length > 0 &&
      !trimmed.startsWith('/') &&
      trimmed !== '/'
    ) {
      // This is a description line
      const contentStart = currentOffset + line.indexOf(trimmed);
      if (contentStart >= offset && trimmed.trim().length > 0) {
        parseDescription(document, contentStart, trimmed, result);
      }
    }
    currentOffset += line.length + 1; // +1 for \n
  }
}

function parseDescription(
  document: vscode.TextDocument,
  startOffset: number,
  text: string,
  result: ParsedComment,
): void {
  // Check for inline links in the description
  const inlineLinkRegex = /\{@(?:link|see)\s+[^}]+\}/g;
  let linkMatch: RegExpExecArray | null;
  let lastEnd = 0;

  while ((linkMatch = inlineLinkRegex.exec(text)) !== null) {
    // Add text before link as description
    if (linkMatch.index > lastEnd) {
      const before = text.substring(lastEnd, linkMatch.index);
      if (before.trim().length > 0) {
        result.descriptions.push(
          new vscode.Range(
            document.positionAt(startOffset + lastEnd),
            document.positionAt(startOffset + linkMatch.index),
          ),
        );
      }
    }
    lastEnd = linkMatch.index + linkMatch[0].length;
  }

  // Remaining text after last link (or entire text if no links)
  if (lastEnd < text.length) {
    const remaining = text.substring(lastEnd);
    if (remaining.trim().length > 0) {
      result.descriptions.push(
        new vscode.Range(
          document.positionAt(startOffset + lastEnd),
          document.positionAt(startOffset + text.length),
        ),
      );
    }
  }
}
