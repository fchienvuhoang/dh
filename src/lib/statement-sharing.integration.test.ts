import "dotenv/config";
import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma } from "@prisma/client";
import { getPrisma } from "./prisma";
import { activeBankTransactionWhere } from "./bank-ledger";
import { recordStatementShare, undoStatementShare } from "./statement-sharing-service";

test("share/duplicate guard/bank isolation/undo work atomically without changing financial data",{skip:process.env.RUN_SHARE_DB_TEST!=="1"},async()=>{
  const prisma=getPrisma();
  const where=await activeBankTransactionWhere("MBBANK");
  const available=await prisma.bankTransaction.findMany({where:{AND:[where,{shareBatchId:null}]},take:4,orderBy:{transactionDate:"asc"}});
  assert.equal(available.length,4,"Use the four existing unshared MB transactions for the rollback test");
  const before=await prisma.statementShareBatch.count();
  const tcb=await prisma.bankTransaction.findFirstOrThrow({where:{account:{bankName:"TECHCOMBANK"}}});
  const ids=available.slice(0,2).map(row=>row.id);
  const rollback=new Error("ROLLBACK_SHARE_TEST");
  try {
    await prisma.$transaction(async tx=>{
      const batch=await recordStatementShare(tx,"MBBANK",ids,where);
      assert.equal(batch.transactionCount,2);
      assert.equal(await tx.bankTransaction.count({where:{AND:[where,{shareBatchId:null}]}}),2,"The other same-day receipts remain unshared");
      await assert.rejects(recordStatementShare(tx,"MBBANK",ids,where),/đã được đánh dấu gửi/);
      await assert.rejects(recordStatementShare(tx,"MBBANK",[tcb.id],where),/không thuộc ngân hàng/);
      assert.equal((batch.snapshot as unknown[]).length,2);
      await undoStatementShare(tx,"MBBANK",batch.id);
      assert.equal(await tx.bankTransaction.count({where:{AND:[where,{shareBatchId:null}]}}),4);
      assert.ok((await tx.statementShareBatch.findUniqueOrThrow({where:{id:batch.id}})).voidedAt);
      const after=await tx.bankTransaction.findMany({where:{id:{in:available.map(row=>row.id)}}});
      assert.equal(after.reduce((sum,row)=>sum+Number(row.creditAmount)-Number(row.debitAmount),0),320000);
      throw rollback;
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:20000,maxWait:20000});
  }catch(error){assert.equal(error,rollback);}
  assert.equal(await prisma.statementShareBatch.count(),before,"No test batch is persisted");
  assert.equal(await prisma.bankTransaction.count({where:{AND:[where,{shareBatchId:null}]}}),4);
  await prisma.$disconnect();
});
