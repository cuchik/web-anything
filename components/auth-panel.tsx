import { ChefHat } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type AuthPanelProps = {
  title: string;
  lead: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthPanel({ title, lead, children, footer }: AuthPanelProps) {
  return (
    <main className="auth-shell">
      <Link className="brand" href="/" aria-label="Bếp Từ Video - trang chủ">
        <span className="brand-mark"><ChefHat size={21} strokeWidth={2.2} /></span>
        <span>Bếp Từ Video</span>
      </Link>

      <section className="auth-card">
        <h1>{title}</h1>
        <p className="auth-lead">{lead}</p>
        {children}
      </section>

      {footer && <div className="auth-footer">{footer}</div>}
    </main>
  );
}
