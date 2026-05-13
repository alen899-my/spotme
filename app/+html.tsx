import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * This file is web-only and used to configure the root HTML for every page in the web build.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* PWA Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SpotMe" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#ef4444" />
        
        {/* Manifest link is handled by Expo automatically, but we can be explicit if needed */}
        {/* <link rel="manifest" href="/manifest.json" /> */}

        <ScrollViewStyleReset />

        {/* Using a sleek background color for the body to match the app theme */}
        <style dangerouslySetInnerHTML={{ __html: `
          body {
            background-color: #000000;
          }
        ` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
