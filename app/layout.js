import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PushNotifications from "@/components/shared/PushNotifications";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata = {
    title: "KwiQue Delivery",
    description: "Fast and reliable delivery in Zimbabwe",

    manifest: "/manifest.webmanifest",

    icons: {
        icon: [
            {
                url: "/icons/icon-192.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                url: "/icons/icon-512.png",
                sizes: "512x512",
                type: "image/png",
            },
        ],
        apple: [
            {
                url: "/icons/icon-192.png",
                sizes: "192x192",
                type: "image/png",
            },
        ],
    },

    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "KwiQue Delivery",
    },
};

export const viewport = {
    width: "device-width",
    initialScale: 1,
    themeColor: "#ed1c24",
};

export default function RootLayout({ children }) {
    return (
        <html
            lang="en"
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        >
        <body className="min-h-full flex flex-col">
        <PushNotifications />
        {children}
        </body>
        </html>
    );
}