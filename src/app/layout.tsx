import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '恋爱手账 | 线条小狗主题',
    template: '%s | 恋爱手账',
  },
  description: '以线条小狗为主题的恋爱记录应用，记录你们的每一个甜蜜瞬间。',
  keywords: ['恋爱记录', '线条小狗', '情侣', '纪念日', '恋爱手账'],
  authors: [{ name: '恋爱手账' }],
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const amapSecurityCode = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE;

  return (
    <html lang="zh-CN">
      <body className="antialiased min-h-screen" style={{ backgroundColor: '#FEFAF5' }}>
        {amapSecurityCode ? (
          <Script id="amap-security-config" strategy="beforeInteractive">
            {`window._AMapSecurityConfig = { securityJsCode: ${JSON.stringify(amapSecurityCode)} };`}
          </Script>
        ) : null}
        {children}
      </body>
    </html>
  );
}
