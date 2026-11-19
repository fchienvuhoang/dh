"use client";

import { useState } from "react";
import type { BankScope } from "@/lib/bank-scope";
import type { SharedStatementRow } from "@/lib/statement-sharing";
import { TransactionReceiptModal } from "@/components/public-campaign-view";

export type StatementImageSelection = { rows: SharedStatementRow[]; sentAt: string };

export function StatementShareImages({ bank, selection, onClose }: { bank: BankScope; selection: StatementImageSelection; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const row = selection.rows[index];
  if (!row) return null;
  const receipt = row.receipt ?? {
    campaignName: row.campaigns.map(campaign => campaign.name).join(" · ") || "Giao dịch chưa gán thiện pháp",
    campaignCode: row.campaigns.map(campaign => campaign.code).join(" · ") || (bank === "MBBANK" ? "mb" : "tcb"),
    transaction: { ...row, createdAt: row.transactionDate, statementRow: null, outflowType: "DONATION" as const, refundLinks: [] },
  };
  return <TransactionReceiptModal key={row.id} source="statement" bankName={bank} {...receipt} onClose={onClose} navigation={{index,total:selection.rows.length,previous:()=>setIndex(value=>value-1),next:()=>setIndex(value=>value+1)}}/>;
}
