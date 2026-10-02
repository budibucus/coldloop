const STYLES: Record<string, string> = {
  not_sent: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  draft: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  sent: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  replied: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  bounced: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  failed: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  canceled: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
};

const LABELS: Record<string, string> = {
  not_sent: "Not sent",
  draft: "Draft",
  sent: "Sent",
  replied: "Replied",
  bounced: "Bounced",
  failed: "Failed",
  canceled: "Canceled",
};

export default function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? STYLES.not_sent;
  const label = LABELS[status] ?? status;

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
