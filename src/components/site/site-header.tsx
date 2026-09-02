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
    <header className="sticky top-0 z-[100] min-h-[104px] border-b border-[var(--line)] bg-[rgba(251,250,247,0.94)] [backdrop-filter:saturate(180%)_blur(14px)] max-[980px]:min-h-[72px]">
      <div className="mx-auto flex min-h-[104px] w-[min(var(--container),calc(100%_-_(var(--gutter)*2)))] items-center gap-8 py-[14px] max-[980px]:min-h-[72px] max-[980px]:py-2.5">
        <Link
          className="flex shrink-0 items-center gap-3 border-0 text-[var(--ink)] hover:text-[var(--accent)]"
          href="/"
          aria-label="Motion Intelligence Lab home"
          onClick={() => setOpen(false)}
        >
          <span
            className="h-[58px] w-[52px] shrink-0 basis-[52px] bg-[url('/Xiaodong-transparent.png')] bg-contain bg-center bg-no-repeat max-[700px]:h-[54px] max-[700px]:w-12 max-[700px]:basis-12"
            aria-hidden="true"
          />
          <span>
            <span className="block text-[1.08rem] font-extrabold leading-[1.05] tracking-[-0.04em]">
              Motion Intelligence Lab
            </span>
            <span className="mt-[3px] block font-semibold uppercase tracking-[0.1em] text-[0.62rem] leading-none text-[var(--slate)]">
              Robotics · Learning · Trust
            </span>
          </span>
        </Link>

        <button
          className="ml-auto hidden rounded-[var(--radius)] border border-[var(--line)] bg-transparent px-2.5 py-1.5 text-[var(--ink)] max-[980px]:block"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={19} /> : <Menu size={19} />}
        </button>

        <nav
          className={`ml-auto flex flex-wrap items-center gap-1 max-[980px]:absolute max-[980px]:right-4 max-[980px]:left-4 max-[980px]:top-[72px] max-[980px]:flex-col max-[980px]:items-stretch max-[980px]:gap-0.5 max-[980px]:rounded-[10px] max-[980px]:border max-[980px]:border-[var(--line)] max-[980px]:bg-[rgba(255,255,255,0.97)] max-[980px]:p-2.5 max-[980px]:shadow-[0_20px_40px_-24px_rgba(0,0,0,0.35)] ${open ? "max-[980px]:flex" : "max-[980px]:hidden"}`}
          aria-label="Main navigation"
        >
          {navItems.map((item) => (
            <Link
              key={item.key}
              className={`rounded-[var(--radius)] px-[14px] py-[9px] text-base font-medium hover:bg-[var(--bg-muted)] hover:text-[var(--ink)] max-[980px]:px-3 max-[980px]:py-2.5 ${active === item.key ? "bg-[var(--accent)] text-white" : "text-[var(--slate)]"}`}
              href={item.href}
              aria-current={active === item.key ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
