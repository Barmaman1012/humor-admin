import Link from "next/link";

const CARDS = [
  {
    title: "Stats",
    description: "Track totals and recent activity.",
    href: "/admin/stats",
  },
  {
    title: "Admins",
    description: "Manage admin access and roles.",
    href: "/admin/admins",
  },
  {
    title: "Images",
    description: "Review uploads and metadata.",
    href: "/admin/images",
  },
  {
    title: "Captions",
    description: "Browse generated captions.",
    href: "/admin/captions",
  },
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-slate-50 p-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Humor Admin Dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Everything you need to monitor the Humor experience at a glance.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
          >
            <div className="text-lg font-semibold text-slate-900">
              {card.title}
            </div>
            <div className="mt-2 text-sm text-slate-600">
              {card.description}
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
