// app/layout.js
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ThemeScript from "./components/ThemeScript";
import DynamicFavicon from "./components/DynamicFavicon";
import { Providers } from "./providers";
import { getSystemSetting } from "./lib/settings";
import { QueryProvider } from "./providers/QueryProvider";
import { ThemeProvider } from "./contexts/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Generate dynamic metadata
export async function generateMetadata() {
  const [siteName, siteDescription] = await Promise.all([
    getSystemSetting("site_name", "JobSite"),
    getSystemSetting("site_description", "Find your next career opportunity"),
  ]);

  // Note: Favicon will be handled client-side by DynamicFavicon component
  // due to the need for signed URLs from MinIO storage

  return {
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description: siteDescription,
    keywords: "jobs, careers, employment, hiring, work",
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    ),
    openGraph: {
      type: "website",
      locale: "en_US",
      url: "/",
      title: siteName,
      description: siteDescription,
      siteName: siteName,
    },
    twitter: {
      card: "summary_large_image",
      title: siteName,
      description: siteDescription,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function RootLayout({ children }) {
  // Get the site theme server-side to prevent flickering
  const siteTheme = await getSystemSetting("site_color_theme", "ocean-blue");
  
  return (
    <html lang="en" suppressHydrationWarning data-site-theme={siteTheme !== 'ocean-blue' ? siteTheme : undefined}>
      <head>
        <ThemeScript />
      </head>
      <body
        suppressHydrationWarning={true}
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <DynamicFavicon />
        <QueryProvider>
          <ThemeProvider>
            <Providers session={undefined}>
              <Header />
              <main className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
                {children}
              </main>
              <Footer />
            </Providers>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
