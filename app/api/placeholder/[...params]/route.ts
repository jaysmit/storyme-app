import { NextRequest, NextResponse } from "next/server";

// GET /api/placeholder/[width]/[height] - Generate placeholder image
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ params: string[] }> }
) {
  const { params: pathParams } = await params;
  const [widthStr, heightStr] = pathParams;

  const width = parseInt(widthStr) || 900;
  const height = parseInt(heightStr) || 506;

  // Get text from query param
  const searchParams = request.nextUrl.searchParams;
  const text = searchParams.get("text")?.replace(/\+/g, " ") || "Preview";

  // Generate SVG placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#6B5BB0"/>
          <stop offset="50%" style="stop-color:#1E1B4B"/>
          <stop offset="100%" style="stop-color:#14163A"/>
        </linearGradient>
        <linearGradient id="stars" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#F4C95D;stop-opacity:0.3"/>
          <stop offset="100%" style="stop-color:#F4C95D;stop-opacity:0"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>

      <!-- Decorative stars -->
      <circle cx="${width * 0.1}" cy="${height * 0.2}" r="3" fill="#F4C95D" opacity="0.6"/>
      <circle cx="${width * 0.85}" cy="${height * 0.15}" r="4" fill="#F4C95D" opacity="0.5"/>
      <circle cx="${width * 0.9}" cy="${height * 0.7}" r="2" fill="#F4C95D" opacity="0.7"/>
      <circle cx="${width * 0.15}" cy="${height * 0.8}" r="3" fill="#F4C95D" opacity="0.4"/>
      <circle cx="${width * 0.5}" cy="${height * 0.1}" r="2" fill="#F4C95D" opacity="0.5"/>

      <!-- Book icon -->
      <g transform="translate(${width / 2 - 30}, ${height / 2 - 60})">
        <path d="M5 11c5-2 10-2 15 2v30c-5-4-10-4-15-2z"
              fill="none" stroke="#F4C95D" stroke-width="2" opacity="0.6"/>
        <path d="M55 11c-5-2-10-2-15 2v30c5-4 10-4 15-2z"
              fill="none" stroke="#F4C95D" stroke-width="2" opacity="0.6"/>
        <path d="M40 2l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z"
              fill="#F4C95D"/>
      </g>

      <!-- Text -->
      <text x="50%" y="${height / 2 + 30}"
            text-anchor="middle"
            font-family="Georgia, serif"
            font-size="24"
            font-weight="bold"
            fill="white">
        ${text}
      </text>
      <text x="50%" y="${height / 2 + 60}"
            text-anchor="middle"
            font-family="sans-serif"
            font-size="14"
            fill="#9893B8">
        Preview illustration
      </text>
    </svg>
  `.trim();

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
