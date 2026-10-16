/** Re-mounts on every navigation, so each screen eases in as it replaces its skeleton. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="ana-page-in">{children}</div>;
}
