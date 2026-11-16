import type { Prisma } from "@prisma/client";
import type { BankScope } from "@/lib/bank-scope";
import { toPrismaDecimal } from "@/lib/money";
import type { SharedStatementRow } from "@/lib/statement-sharing";

export async function recordStatementShare(tx: Prisma.TransactionClient, bank: BankScope, ids: string[], where: Prisma.BankTransactionWhereInput, sentAt = new Date()) {
  const uniqueIds=[...new Set(ids)];
  if (!uniqueIds.length) throw new Error("Vui lòng chọn ít nhất một giao dịch.");
  const rows=await tx.bankTransaction.findMany({
    where: { AND:[where,{id:{in:uniqueIds}}] },
    include: {campaign:{select:{code:true,name:true}},allocations:{include:{campaign:{select:{code:true,name:true}}}}},
    orderBy:[{transactionDate:"asc"},{statementRow:"asc"}],
  });
  if(rows.length!==uniqueIds.length) throw new Error("Có giao dịch không thuộc ngân hàng hoặc mốc theo dõi đang chọn. Vui lòng tải lại trang.");
  if(rows.some(row=>row.shareBatchId)) throw new Error("Có giao dịch đã được đánh dấu gửi. Hãy tải lại danh sách Chưa gửi để tránh gửi trùng.");
  const snapshot: SharedStatementRow[]=rows.map(row=>({id:row.id,transactionDate:row.transactionDate.toISOString(),description:row.description,creditAmount:Number(row.creditAmount),debitAmount:Number(row.debitAmount),campaigns:row.campaign?[row.campaign]:row.allocations.map(allocation=>allocation.campaign)}));
  const batch=await tx.statementShareBatch.create({data:{bankName:bank,sentAt,transactionCount:rows.length,totalCredit:toPrismaDecimal(snapshot.reduce((s,r)=>s+r.creditAmount,0)),totalDebit:toPrismaDecimal(snapshot.reduce((s,r)=>s+r.debitAmount,0)),snapshot:snapshot as unknown as Prisma.InputJsonValue}});
  const updated=await tx.bankTransaction.updateMany({where:{id:{in:uniqueIds},shareBatchId:null},data:{shareBatchId:batch.id}});
  if(updated.count!==uniqueIds.length) throw new Error("Danh sách đã thay đổi trong lúc chốt đợt gửi. Vui lòng tải lại trang.");
  return batch;
}

export async function undoStatementShare(tx: Prisma.TransactionClient, bank: BankScope, id: string) {
  const batch=await tx.statementShareBatch.findFirst({where:{id,bankName:bank}});
  if(!batch) throw new Error("Không tìm thấy đợt gửi của ngân hàng này.");
  if(batch.voidedAt) return batch;
  await tx.bankTransaction.updateMany({where:{shareBatchId:id},data:{shareBatchId:null}});
  return tx.statementShareBatch.update({where:{id},data:{voidedAt:new Date()}});
}
