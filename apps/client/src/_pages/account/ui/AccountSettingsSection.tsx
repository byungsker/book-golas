"use client";

import { AccountSettings } from "@/features/account-management";
import {
  getNicknameValidationError,
  getPasswordValidationError,
  SignOutButton,
} from "@/features/auth";
import { ConsumerCard } from "@/shared/ui";
import type { ConsumerLocale } from "@/shared/routing";

export function AccountSettingsSection({ locale }: { locale: ConsumerLocale }) {
  return (
    <AccountSettings
      locale={locale}
      validateNickname={getNicknameValidationError}
      validatePassword={(password, confirmation) =>
        getPasswordValidationError("reset-password", true, password, confirmation)
      }
      footerSlot={
        <ConsumerCard>
          <div data-testid="account-sign-out">
            <SignOutButton locale={locale} />
          </div>
        </ConsumerCard>
      }
    />
  );
}
