export interface BadgeOptions {
  label: string;
  value: string;
  color?: string;
  labelColor?: string;
  style?: 'flat' | 'flat-square';
}

const COLOR_PRESETS: { [key: string]: string } = {
  brightgreen: '#4c1',
  green: '#97ca00',
  yellowgreen: '#a4a61d',
  yellow: '#dfb317',
  orange: '#fe7d37',
  red: '#e05d44',
  blue: '#007ec6',
  lightgrey: '#9f9f9f',
  gray: '#555',
};

// Estimación de ancho de caracteres para Verdana 11px
const CHAR_WIDTHS: { [key: string]: number } = {
  ' ': 4, '!': 4, '"': 5, '#': 8, '$': 7, '%': 11, '&': 9, '\'': 3, '(': 5, ')': 5, '*': 6, '+': 8, ',': 4, '-': 5, '.': 4, '/': 5,
  '0': 7, '1': 7, '2': 7, '3': 7, '4': 7, '5': 7, '6': 7, '7': 7, '8': 7, '9': 7,
  ':': 4, ';': 4, '<': 8, '=': 8, '>': 8, '?': 7, '@': 12,
  'A': 9, 'B': 8, 'C': 9, 'D': 9, 'E': 8, 'F': 8, 'G': 9, 'H': 9, 'I': 4, 'J': 6, 'K': 9, 'L': 8, 'M': 10, 'N': 9, 'O': 9, 'P': 8, 'Q': 9, 'R': 9, 'S': 8, 'T': 8, 'U': 9, 'V': 9, 'W': 11, 'X': 9, 'Y': 9, 'Z': 8,
  '[': 5, '\\': 5, ']': 5, '^': 6, '_': 7, '`': 5,
  'a': 7, 'b': 7, 'c': 7, 'd': 7, 'e': 7, 'f': 5, 'g': 7, 'h': 7, 'i': 3, 'j': 4, 'k': 7, 'l': 3, 'm': 10, 'n': 7, 'o': 7, 'p': 7, 'q': 7, 'r': 5, 's': 6, 't': 5, 'u': 7, 'v': 7, 'w': 9, 'x': 7, 'y': 7, 'z': 6,
  '{': 5, '|': 4, '}': 5, '~': 8
};

export class BadgeGenerator {
  public static generate(options: BadgeOptions): string {
    const {
      label,
      value,
      color = 'blue',
      labelColor = 'gray',
      style = 'flat',
    } = options;

    // Resolver colores
    const rightBg = COLOR_PRESETS[color] || color;
    const leftBg = COLOR_PRESETS[labelColor] || labelColor;

    // Calcular anchos
    const labelTextWidth = this.calculateTextWidth(label);
    const valueTextWidth = this.calculateTextWidth(value);

    // Padding lateral de 10px a cada lado
    const labelWidth = labelTextWidth + 20;
    const valueWidth = valueTextWidth + 20;
    const totalWidth = labelWidth + valueWidth;

    // Posiciones de los textos (centrados en sus respectivos bloques)
    const labelTextX = labelWidth / 2;
    const valueTextX = labelWidth + valueWidth / 2;

    const borderRadius = style === 'flat' ? 3 : 0;

    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="${borderRadius}" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="${leftBg}"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${rightBg}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
    <text aria-hidden="true" x="${labelTextX * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${labelTextWidth * 10}">${label}</text>
    <text x="${labelTextX * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${labelTextWidth * 10}">${label}</text>
    <text aria-hidden="true" x="${valueTextX * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${valueTextWidth * 10}">${value}</text>
    <text x="${valueTextX * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${valueTextWidth * 10}">${value}</text>
  </g>
</svg>`;
  }

  private static calculateTextWidth(text: string): number {
    let width = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      // Si el carácter está en la tabla, usa su ancho; si no, asume 7px como promedio.
      width += CHAR_WIDTHS[char] !== undefined ? CHAR_WIDTHS[char] : 7;
    }
    return width;
  }
}
