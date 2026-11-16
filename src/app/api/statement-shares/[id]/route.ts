import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";
import { undoStatementShare } from "@/lib/statement-sharing-service";

const bankSchema=z.enum(["TECHCOMBANK","MBBANK"]);
export async function GET(request:Request,context:{params:Promise<{id:string}>}) {
  try {
    const {id}=await context.params;
    const bank=bankSchema.parse(new URL(request.url).searchParams.get("bank"));
    const batch=await getPrisma().statementShareBatch.findFirst({where:{id,bankName:bank}});
    if(!batch) return NextResponse.json({error:"Không tìm thấy đợt gửi."},{status:404});
    return NextResponse.json(batch);
  } catch(error) {return apiError(error);}
}
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}) {
  try {
    const {id}=await context.params;
    const body=z.object({bank:bankSchema,action:z.literal("undo")}).parse(await request.json());
    const result=await getPrisma().$transaction(tx=>undoStatementShare(tx,body.bank,id),{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    return NextResponse.json(result);
  } catch(error) {
    if (error instanceof Error && "code" in error && error.code === "P2034") return NextResponse.json({error:"Đợt gửi đang được cập nhật ở nơi khác. Vui lòng tải lại trang rồi thử lại."},{status:409});
    return apiError(error);
  }
}
