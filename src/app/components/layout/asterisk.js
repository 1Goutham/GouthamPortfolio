/**
 * The site's asterisk, drawn as an SVG so it looks the same everywhere.
 * (The ✳ character is an emoji on iOS and renders as a green box there.)
 * Sized by font-size: it is 1em square and takes the text colour.
 */
export default function Asterisk({ className = "", ...rest }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
      className={`inline-block align-[-0.12em] ${className}`}
      {...rest}
    >
      <path d="M12 2.5v19M2.5 12h19M5.3 5.3l13.4 13.4M18.7 5.3 5.3 18.7" />
    </svg>
  );
}
