export const metadata = { title: "Lens Flow App", description: "Prescription lens ordering + stock manager" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
