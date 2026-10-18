import type { MetadataRoute } from "next";

// The web app manifest (Stage 19): what lets ClientFlow be installed on a
// phone's home screen or a computer like an app. Icons are rendered from
// src/app/icon.svg (see public/icons).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ClientFlow",
    short_name: "ClientFlow",
    description: "Clients, leads, projects and tasks in one calm place.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    background_color: "#eef1fb",
    theme_color: "#5257d6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today", url: "/today" },
      { name: "New task", url: "/tasks" },
      { name: "New lead", url: "/leads/new" },
    ],
  };
}
