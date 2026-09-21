export function Logo({ size = 56 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="CatPy"
    >
      <defs>
        <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E7EBEF" />
          <stop offset="55%" stopColor="#9AA4AF" />
          <stop offset="100%" stopColor="#C7CDD6" />
        </linearGradient>
      </defs>
      <polygon
        points="60,4 111,32 111,88 60,116 9,88 9,32"
        fill="#0F3D3E"
        stroke="url(#metal)"
        strokeWidth="3"
      />
      <path
        d="M40 78 L46 50 L54 62 L60 46 L66 62 L74 50 L80 78 Z"
        fill="#050708"
        opacity="0.9"
      />
      <text
        x="60"
        y="72"
        textAnchor="middle"
        fontFamily="'Space Grotesk', sans-serif"
        fontWeight="700"
        fontSize="34"
      >
        <tspan fill="url(#metal)">C</tspan>
        <tspan fill="#3E6FF2">P</tspan>
      </text>
    </svg>
  );
}
