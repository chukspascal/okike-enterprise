import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import okikeLogo from "@/assets/okike-logo.png";

export function SiteFooter() {
  return (
    <footer className="bg-[#f7f7f2] dark:bg-[#0E0E0E] text-[#0e0e0e] dark:text-white border-t border-black/10 dark:border-white/10 transition-colors">
      {/* Minimal CTA */}
      <div className="max-w-6xl mx-auto px-6 py-20 border-b border-black/10 dark:border-white/10 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0e0e0e] dark:text-[#E3EE32]">
            Next Step
          </span>
          <h2 className="font-display text-4xl md:text-5xl uppercase tracking-wide text-[#0e0e0e] dark:text-white mt-2">
            Ready to build or learn?
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://studio.okikeenterprises.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-[#0e0e0e] text-[#e3ee32] hover:bg-black dark:bg-[#E3EE32] dark:hover:bg-[#d4df28] dark:text-[#0E0E0E] px-6 py-3 rounded-lg inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            OKIKE Studio
            <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
          <Link
            to="/learn"
            className="bg-white dark:bg-[#151514] hover:bg-black/[0.04] dark:hover:bg-[#1f1f1d] px-6 py-3 rounded-lg inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0e0e0e] dark:text-white border border-black/15 dark:border-white/15 transition-colors"
          >
            OKIKE Academy
          </Link>
        </div>
      </div>

      {/* Minimal Links Row */}
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-xs font-medium text-black/60 dark:text-white/65">
        <div className="flex items-center gap-3">
          <img
            src={okikeLogo}
            alt="OKIKE"
            className="h-6 w-auto object-contain brightness-0 dark:invert"
          />
          <span className="text-black/75 dark:text-white/75">© {new Date().getFullYear()} OKIKE Enterprises</span>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <a
            href="https://studio.okikeenterprises.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-black dark:hover:text-white transition inline-flex items-center gap-1"
          >
            Studio <ArrowUpRight className="size-3.5 text-[#0e0e0e] dark:text-[#E3EE32]" />
          </a>
          <Link to="/learn" className="hover:text-black dark:hover:text-white transition">
            Academy
          </Link>
          <Link to="/bootcamp" className="hover:text-black dark:hover:text-white transition">
            Summit
          </Link>
          <Link to="/about" className="hover:text-black dark:hover:text-white transition">
            About
          </Link>
          <Link to="/blog" className="hover:text-black dark:hover:text-white transition">
            Blog
          </Link>
          <Link to="/contact" className="hover:text-black dark:hover:text-white transition">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}
