import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import okikeLogo from "@/assets/okike-logo.png";

export function SiteFooter() {
  return (
    <footer className="bg-[#0E0E0E] text-white border-t border-white/10">
      {/* Minimal CTA */}
      <div className="max-w-6xl mx-auto px-6 py-20 border-b border-white/10 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#E3EE32]">
            Next Step
          </span>
          <h2 className="font-display text-4xl md:text-5xl uppercase tracking-wide text-white mt-2">
            Ready to build or learn?
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://studio.okikeenterprises.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-[#E3EE32] hover:bg-[#d4df28] text-[#0E0E0E] px-6 py-3 rounded-lg inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            OKIKE Studio
            <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
          <Link
            to="/learn"
            className="bg-[#151514] hover:bg-[#1f1f1d] px-6 py-3 rounded-lg inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white border border-white/15 transition-colors"
          >
            OKIKE Academy
          </Link>
        </div>
      </div>

      {/* Minimal Links Row */}
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-xs font-medium text-white/65">
        <div className="flex items-center gap-3">
          <img
            src={okikeLogo}
            alt="OKIKE"
            className="h-6 w-auto object-contain brightness-0 invert"
          />
          <span className="text-white/75">© {new Date().getFullYear()} OKIKE Enterprises</span>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <a
            href="https://studio.okikeenterprises.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition inline-flex items-center gap-1"
          >
            Studio <ArrowUpRight className="size-3.5 text-[#E3EE32]" />
          </a>
          <Link to="/learn" className="hover:text-white transition">
            Academy
          </Link>
          <Link to="/bootcamp" className="hover:text-white transition">
            Summit
          </Link>
          <Link to="/about" className="hover:text-white transition">
            About
          </Link>
          <Link to="/blog" className="hover:text-white transition">
            Blog
          </Link>
          <Link to="/contact" className="hover:text-white transition">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}
