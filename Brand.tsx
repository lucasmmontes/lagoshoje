import Link from "next/link";

type BrandProps = {
  light?: boolean;
  compact?: boolean;
  href?: string;
};

export default function Brand({ light = false, compact = false, href = "/" }: BrandProps) {
  return (
    <Link
      href={href}
      className={`brand${light ? " brand--light" : ""}${compact ? " brand--compact" : ""}`}
      aria-label="Lagos Hoje — página inicial"
    >
      <span className="brand__monogram" aria-hidden="true">
        <svg viewBox="0 0 104 100" fill="none" role="presentation">
          <text x="4" y="80" className="brand__monogram-letters">LH</text>
          <path
            d="M7 61C22 47 36 46 51 55C67 65 80 69 98 53C84 73 67 77 49 66C34 56 22 53 7 61Z"
            fill="#00AEEF"
          />
          <path
            d="M12 56C27 47 38 52 51 61C63 69 78 69 92 59C76 65 67 64 52 55C37 46 24 45 12 56Z"
            fill="#067F9E"
            opacity="0.93"
          />
        </svg>
      </span>
      <span className="brand__divider" aria-hidden="true" />
      <span className="brand__lockup">
        <span className="brand__name">LAGOS</span>
        <span className="brand__today">HO.JE</span>
        {!compact && <span className="brand__tagline">NOTÍCIAS DA REGIÃO DOS LAGOS</span>}
      </span>
    </Link>
  );
}
