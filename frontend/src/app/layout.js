import { ThemeProvider } from "./ThemeContext";
import "./css/base.css";
import "./css/admin.css";
import "./css/auth.css";
import "./css/dashboard.css";
import "./css/landing.css";
import "./css/meeting.css";
import "./css/support.css";

export const metadata = {
  title: "SovaMeet - AI Powered Sign Language Translation Video Conferencing",
  description: "Experience the first video conferencing with AI-powered Sign Language translator.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* FontAwesome Icons CDN */}
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" 
          crossOrigin="anonymous" 
          referrerPolicy="no-referrer"
        />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
