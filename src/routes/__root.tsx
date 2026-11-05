import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/use-auth";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "OKIKE — Build software. Learn to build it." },
      {
        name: "description",
        content:
          "OKIKE is a Nigerian software house and tech academy. We build high-performance web platforms, AI tools and mobile apps for startups and businesses, and train the next generation of African engineers.",
      },
      { name: "author", content: "OKIKE" },
      { name: "robots", content: "index, follow" },
      { name: "theme-color", content: "#0e0e0e" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "OKIKE" },
      { name: "geo.region", content: "NG" },
      { name: "geo.placename", content: "Nigeria" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "OKIKE" },
      { property: "og:locale", content: "en_NG" },
      { property: "og:title", content: "OKIKE — Build software. Learn to build it." },
      {
        property: "og:description",
        content: "Nigerian software studio and tech academy. We build for ambitious teams and train the engineers behind African tech.",
      },
      {
        property: "og:image",
        content: "https://okike-enterprise.com/background.png",
      },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@okikeenterprises" },
      { name: "twitter:title", content: "OKIKE — Build software. Learn to build it." },
      {
        name: "twitter:description",
        content: "Nigerian software studio and tech academy. Build with us or learn to build it yourself.",
      },
      {
        name: "twitter:image",
        content: "https://okike-enterprise.com/background.png",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://okike-enterprise.com/#organization",
              name: "OKIKE",
              url: "https://okike-enterprise.com",
              description:
                "Software house and academy building products for ambitious teams and training the next generation of African engineers.",
            },
            {
              "@type": "WebSite",
              "@id": "https://okike-enterprise.com/#website",
              url: "https://okike-enterprise.com",
              name: "OKIKE",
              publisher: { "@id": "https://okike-enterprise.com/#organization" },
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: "https://okike-enterprise.com/blog?q={search_term_string}"
                },
                "query-input": "required name=search_term_string"
              }
            },
            {
              "@type": "ItemList",
              "@id": "https://okike-enterprise.com/#navigation",
              name: "Navigation Menu",
              itemListElement: [
                {
                  "@type": "SiteNavigationElement",
                  position: 1,
                  name: "Services",
                  url: "https://okike-enterprise.com/services"
                },
                {
                  "@type": "SiteNavigationElement",
                  position: 2,
                  name: "Portfolio",
                  url: "https://okike-enterprise.com/portfolio"
                },
                {
                  "@type": "SiteNavigationElement",
                  position: 3,
                  name: "Blog",
                  url: "https://okike-enterprise.com/blog"
                },
                {
                  "@type": "SiteNavigationElement",
                  position: 4,
                  name: "Academy",
                  url: "https://okike-enterprise.com/learn"
                },
                {
                  "@type": "SiteNavigationElement",
                  position: 5,
                  name: "About",
                  url: "https://okike-enterprise.com/about"
                },
                {
                  "@type": "SiteNavigationElement",
                  position: 6,
                  name: "Contact",
                  url: "https://okike-enterprise.com/contact"
                }
              ]
            }
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Analytics tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-5ZG584XZV8" />
        <script src="https://korablobstorage.blob.core.windows.net/modal-bucket/korapay-collections.min.js" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments); }
              gtag('js', new Date());
              gtag('config', 'G-5ZG584XZV8');
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.classList.add('dark');localStorage.setItem('theme','dark');}catch(e){}})();`,
          }}
        />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Apply theme on mount
  useEffect(() => {
    function applyTheme() {
      try {
        const stored = localStorage.getItem("theme");
        let theme = stored === "light" || stored === "dark" ? stored : "dark";

        if (theme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } catch {
        // Ignore errors
      }
    }
    applyTheme();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
