import { redirect } from "next/navigation";
import { getCurrentConsumerUser } from "@/shared/auth/index.server";

export default async function RootRedirectPage() {
  const { user } = await getCurrentConsumerUser();
  redirect(user ? "/ko/home" : "/ko");
}
