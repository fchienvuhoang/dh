import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { activeBankTransactionWhere } from "@/lib/bank-ledger";
import { getPrisma } from "@/lib/prisma";
import { recordStatementShare } from "@/lib/statement-sharing-service";

const schema=z.object({bank:z.enum(["TECHCOMBANK","MBBANK"]),transactionIds:z.array(z.string().min(1)).min(1).max(10000)});
export async function POST(request:Request) {
  try {
    const body=schema.parse(await request.json());
    const where=await activeBankTransactionWhere(body.bank);
    const batch=await getPrisma().$transaction(tx=>recordStatementShare(tx,body.bank,body.transactionIds,where),{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:20000,maxWait:20000});
    return NextResponse.json({id:batch.id,sentAt:batch.sentAt,transactionCount:batch.transactionCount},{status:201});
  } catch(error) {
    if (error instanceof Error && "code" in error && error.code === "P2034") return NextResponse.json({error:"Danh sách đang được cập nhật ở nơi khác. Vui lòng tải lại trang rồi thử lại."},{status:409});
    return apiError(error);
  }
}
