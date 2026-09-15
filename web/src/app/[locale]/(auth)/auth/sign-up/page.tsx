import { redirect } from "next/navigation";
import { AuthForm } from "@/components/consumer/auth-form";
import { getConsumerPath } from "@/lib/consumer/paths";

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "ko" && locale !== "en") redirect("/ko/auth/sign-up");

  return (
    <AuthForm
      mode="sign-up"
      locale={locale}
      nextPath={getConsumerPath(locale, "/home")}
    />
  );
}
