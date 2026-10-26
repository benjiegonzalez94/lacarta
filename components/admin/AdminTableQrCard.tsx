"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  ExternalLink,
  Printer,
  QrCode,
  Trash2,
} from "lucide-react";
import { deleteTableAction } from "@/app/(dashboard)/admin/actions";
import type { TableRow } from "@/types/domain";

export interface AdminTableQrCardProps {
  tenantSlug: string;
  tenantName?: string;
  table: TableRow;
}

export function AdminTableQrCard({
  tenantSlug,
  tenantName = "Restaurante",
  table,
}: AdminTableQrCardProps) {
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);

  const relativePath = `/${tenantSlug}/mesa/${table.qr_token}`;
  const fullUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${relativePath}`
      : `https://lacartaec.vercel.app${relativePath}`;

  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(
    fullUrl
  )}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard permission errors
    }
  }

  function handlePrintBoard() {
    const win = window.open("", "_blank", "width=520,height=720");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Tablero QR - Mesa #${table.table_number} (${tenantName})</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              background: #ffffff;
              color: #09090b;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .board {
              width: 340px;
              border: 4px solid #09090b;
              border-radius: 28px;
              padding: 28px 24px;
              text-align: center;
            }
            .brand {
              font-size: 13px;
              font-weight: 800;
              letter-spacing: 2px;
              text-transform: uppercase;
              color: #b45309;
            }
            .title {
              font-size: 28px;
              font-weight: 900;
              text-transform: uppercase;
              margin: 6px 0 4px;
            }
            .table-badge {
              display: inline-block;
              background: #09090b;
              color: #facc15;
              font-size: 20px;
              font-weight: 900;
              padding: 6px 20px;
              border-radius: 999px;
              margin: 8px 0 16px;
            }
            .qr-box {
              border: 2px dashed #d4d4d8;
              border-radius: 20px;
              padding: 12px;
              display: inline-block;
            }
            .steps {
              margin-top: 16px;
              font-size: 13px;
              line-height: 1.5;
              color: #27272a;
              font-weight: 600;
            }
            .token {
              margin-top: 10px;
              font-family: monospace;
              font-size: 11px;
              color: #71717a;
            }
          </style>
        </head>
        <body>
          <div class="board">
            <div class="brand">LaCarta • Menú Digital</div>
            <div class="title">${tenantName}</div>
            <div class="table-badge">MESA #${table.table_number}</div>
            <div>
              <div class="qr-box">
                <img src="${qrImageSrc}" width="220" height="220" alt="QR Mesa ${table.table_number}" onload="window.print()" />
              </div>
            </div>
            <div class="steps">
              📱 Escanea con la app <strong>LaCarta</strong> o con tu cámara para pedir directo a tu mesa sin hacer filas.
            </div>
            <div class="token">Código: ${table.qr_token}</div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#202024] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-sm font-black text-zinc-100">
            Mesa #{table.table_number}
          </span>
          <p className="font-mono text-xs text-zinc-400">
            Código: {table.qr_token}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            id={`toggle-qr-view-${table.id}`}
            type="button"
            onClick={() => setShowQr((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 hover:border-[#E11D48] hover:text-[#E11D48]"
          >
            <QrCode className="h-3.5 w-3.5 text-[#E11D48]" />
            <span>{showQr ? "Ocultar Tablero" : "Ver Tablero QR"}</span>
          </button>

          <button
            id={`print-qr-board-${table.id}`}
            type="button"
            onClick={handlePrintBoard}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 hover:border-[#E11D48] hover:text-[#E11D48]"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Imprimir</span>
          </button>

          <button
            id={`copy-qr-url-${table.id}`}
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 hover:border-[#E11D48]"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Link</span>
              </>
            )}
          </button>

          <Link
            href={relativePath}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-semibold text-[#E11D48] hover:border-[#E11D48]"
          >
            <span>Probar</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          <form action={deleteTableAction}>
            <input type="hidden" name="tableId" value={table.id} />
            <button
              id={`delete-table-${table.id}`}
              type="submit"
              aria-label={`Eliminar Mesa ${table.table_number}`}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-500/15 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {showQr ? (
        <div className="mt-3 flex flex-col items-center justify-center rounded-2xl border-2 border-zinc-700 bg-white p-5 text-center text-zinc-900">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">
            LaCarta • Pide desde tu mesa sin filas
          </span>
          <p className="mt-0.5 text-lg font-black uppercase text-zinc-950">
            {tenantName} • Mesa #{table.table_number}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrImageSrc}
            alt={`Código QR Mesa ${table.table_number}`}
            width={200}
            height={200}
            className="my-2 rounded-xl border border-zinc-200"
          />
          <p className="max-w-xs text-xs font-semibold text-zinc-700">
            Escanea este código con la app <strong>LaCarta</strong> o la cámara
            de tu teléfono para enviar tu pedido directo a cocina.
          </p>
          <p className="mt-1 font-mono text-[10px] text-zinc-500">{fullUrl}</p>
        </div>
      ) : null}
    </div>
  );
}
