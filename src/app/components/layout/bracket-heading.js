/**
 * "[ Section ]" heading. The brackets ease outward and tint green on hover,
 * the same language as the hero's "[ View my work ]" links, so every section
 * title on the site answers the cursor the same way.
 */
export default function BracketHeading({ as: Tag = "h2", children, className = "", dark = false, ...rest }) {
  return (
    <Tag className={`bracket-heading bracket-link ${dark ? "bracket-link-dark" : ""} ${className}`} {...rest}>
      <span className="bracket-link-l" aria-hidden="true">[</span>
      <span className="bracket-link-text !mx-0">{children}</span>
      <span className="bracket-link-r" aria-hidden="true">]</span>
    </Tag>
  );
}
