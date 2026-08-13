import React from 'react';

interface Barcode128Props {
  value: string;
  height?: number;
  moduleWidth?: number;
  showText?: boolean;
  className?: string;
}

// Full 107 Code 128 pattern definitions (0 to 106)
const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
];

export const Barcode128: React.FC<Barcode128Props> = ({
  value,
  height = 55,
  moduleWidth = 2,
  showText = false,
  className = ''
}) => {
  const cleanVal = (value || 'ELG-WAYBILL').trim();

  // Code 128 B Encoding
  const charCodes: number[] = [];
  let checksum = 104; // Start Code B index

  for (let i = 0; i < cleanVal.length; i++) {
    const ascii = cleanVal.charCodeAt(i);
    let code = ascii - 32;
    if (code < 0 || code > 95) code = 31; // fallback '?'
    charCodes.push(code);
    checksum += code * (i + 1);
  }

  checksum %= 103;

  // Pattern sequence: [Start B (104), ...charCodes, Checksum, Stop (106)]
  const fullSequence = [104, ...charCodes, checksum, 106];

  // Calculate width
  const quietZoneModules = 10;
  let totalModules = quietZoneModules * 2;
  fullSequence.forEach(idx => {
    const pattern = CODE128_PATTERNS[idx];
    for (let j = 0; j < pattern.length; j++) {
      totalModules += parseInt(pattern[j], 10);
    }
  });

  const svgWidth = totalModules * moduleWidth;
  const svgHeight = height + (showText ? 20 : 0);

  // Generate SVG bars
  let currentX = quietZoneModules * moduleWidth;
  const rects: React.ReactNode[] = [];

  fullSequence.forEach((patternIdx, seqIdx) => {
    const pattern = CODE128_PATTERNS[patternIdx];
    let isBar = true;
    for (let p = 0; p < pattern.length; p++) {
      const w = parseInt(pattern[p], 10) * moduleWidth;
      if (isBar) {
        rects.push(
          <rect
            key={`${seqIdx}-${p}`}
            x={currentX}
            y={0}
            width={w}
            height={height}
            fill="#000000"
          />
        );
      }
      currentX += w;
      isBar = !isBar;
    }
  });

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        width="100%"
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        className="max-w-full h-auto overflow-visible"
        shapeRendering="crispEdges"
      >
        <rect width={svgWidth} height={svgHeight} fill="#FFFFFF" />
        {rects}
        {showText && (
          <text
            x={svgWidth / 2}
            y={height + 15}
            textAnchor="middle"
            fill="#000000"
            fontFamily="monospace"
            fontSize="14"
            fontWeight="bold"
            letterSpacing="2"
          >
            {cleanVal}
          </text>
        )}
      </svg>
    </div>
  );
};
