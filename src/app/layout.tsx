import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Listify — Cadastro Automatizado para Marketplaces",
  description: "Informe o produto, as fotos, o estoque e o custo. A Listify gera título, descrição, preço e planilha pronta para upload em ML, Shopee, Amazon e mais.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
