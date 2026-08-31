"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Home", key: "home" },
  { href: "/research", label: "Research", key: "research" },
  { href: "/publications", label: "Publications", key: "publications" },
  { href: "/people", label: "People", key: "people" },
  { href: "/news", label: "News", key: "news" },
  { href: "/join", label: "Join us", key: "join" },
];

export function SiteHeader({ active = "home" }: { active?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="site-brand" href="/" aria-label="Motion Intelligence Lab home" onClick={() => setOpen(false)}>
          <span className="site-brand__mark" aria-hidden="true" />
          <span>
            <span className="site-brand__name">Motion Intelligence Lab</span>
            <span className="site-brand__sub">Robotics · Learning · Trust</span>
          </span>
        </Link>

        <button className="nav-toggle" type="button" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? <X size={19} /> : <Menu size={19} />}
        </button>

        <nav className={`site-nav ${open ? "is-open" : ""}`} aria-label="Main navigation">
          {navItems.map((item) => (
            <Link key={item.key} className={active === item.key ? "is-active" : ""} href={item.href} aria-current={active === item.key ? "page" : undefined} onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
