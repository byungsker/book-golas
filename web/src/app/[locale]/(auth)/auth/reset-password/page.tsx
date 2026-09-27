import { redirect } from "next/navigation";
import { AuthForm } from "@/components/consumer/auth-form";
import { getConsumerPath } from "@/lib/consumer/paths";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "ko" && locale !== "en") redirect("/ko/auth/reset-password");

  return (
    <AuthForm
      mode="reset-password"
      locale={locale}
      nextPath={getConsumerPath(locale, "/home")}
    />
  );
}
