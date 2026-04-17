interface Props { submitted: boolean; version?: number | null }

export default function FeedbackBadge({ submitted, version }: Props) {
  if (submitted) {
    return <span className="badge-green">✓ Submitted {version && version > 1 ? `(v${version})` : ''}</span>;
  }
  return <span className="badge-gray">● Pending</span>;
}
