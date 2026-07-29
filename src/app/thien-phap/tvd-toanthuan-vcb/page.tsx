import type { Metadata } from "next";
import { PublicCampaignView } from "@/components/public-campaign-view";
import { tvdToanThuanVcbStatement } from "@/lib/tvd-toanthuan-vcb-statement";

export const metadata: Metadata = {
  title: "Toàn Thuận Myanmar 28/7/2026 | Sao kê Vietcombank",
  description: "Danh sách thu chi công khai từ sao kê Vietcombank của thiện pháp Toàn Thuận Myanmar 28/7/2026.",
};

export default function TvdToanThuanVcbStatementPage() {
  return <PublicCampaignView data={tvdToanThuanVcbStatement} />;
}
