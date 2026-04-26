/**
 * Utility to calculate the pixel coordinates of the cursor in a textarea or input.
 * Based on the "Mirror Div" technique.
 */

export interface CursorCoordinates {
  top: number;
  left: number;
  height: number;
}

export function getCursorCoordinates(
  element: HTMLTextAreaElement | HTMLInputElement,
  cursorPos: number
): CursorCoordinates {
  const isTextArea = element.nodeName === 'TEXTAREA';
  
  // Create a mirror div
  const div = document.createElement('div');
  const style = window.getComputedStyle(element);
  
  // Copy relevant styles
  const properties = [
    'direction',
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderStyle',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',
    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration',
    'letterSpacing',
    'wordSpacing',
    'tabSize',
    'MozTabSize',
  ];

  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  if (isTextArea) {
    div.style.wordWrap = 'break-word';
  }

  const divStyle = div.style as unknown as Record<string, string>;
  const sourceStyle = style as unknown as Record<string, string>;

  properties.forEach((prop) => {
    divStyle[prop] = sourceStyle[prop];
  });

  // Ensure width is exact
  const rect = element.getBoundingClientRect();
  div.style.width = `${rect.width}px`;

  // Set the text content up to the cursor
  const content = element.value.substring(0, cursorPos);
  div.textContent = content;

  // Add the marker span
  const span = document.createElement('span');
  span.textContent = element.value.substring(cursorPos) || '.';
  div.appendChild(span);

  document.body.appendChild(div);

  // Get span coordinates relative to the div
  const spanRect = span.getBoundingClientRect();
  const divRect = div.getBoundingClientRect();
  
  // Clean up
  document.body.removeChild(div);

  // Return coordinates relative to the viewport
  return {
    top: rect.top + (spanRect.top - divRect.top),
    left: rect.left + (spanRect.left - divRect.left),
    height: parseFloat(style.lineHeight) || spanRect.height,
  };
}
