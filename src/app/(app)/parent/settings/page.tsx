// src/app/(app)/parent/settings/page.tsx
//
// ============================================================
// WattleOS V2 - Parent Settings
// ============================================================
// Server Component. Shows consent toggles and contact info
// for each child. Parents can update their own phone number
// and toggle media/directory consent without staff help.
// ============================================================

import { getTenantContext } from '@/lib/auth/tenant-context';
import { getMySettings } from '@/lib/actions/parent';
import Link from 'next/link';
import { ConsentToggle } from '@/components/domain/parent/ConsentToggle';
import { ContactInfoForm } from '@/components/domain/parent/ContactInfoForm';

export default async function ParentSettingsPage() {
  const context = await getTenantContext();

  const settingsResult = await getMySettings();
  const settings = settingsResult.data ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/parent" className="hover:text-gray-700">
            My Children
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900">Settings</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">My Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your contact information and consent preferences for each child.
        </p>
      </div>

      {settings.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            No children linked to your account.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {settings.map((guardianSetting) => (
            <div
              key={guardianSetting.guardianId}
              className="rounded-lg border border-gray-200 bg-white"
            >
              {/* Child header */}
              <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
                {guardianSetting.studentPhotoUrl ? (
                  <img
                    src={guardianSetting.studentPhotoUrl}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                    {guardianSetting.studentName[0]}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {guardianSetting.studentName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {guardianSetting.relationship}
                    {guardianSetting.isPrimary && ' · Primary contact'}
                  </p>
                </div>
              </div>

              <div className="space-y-5 px-6 py-5">
                {/* Contact info */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    Contact Information
                  </h3>
                  <ContactInfoForm
                    guardianId={guardianSetting.guardianId}
                    initialPhone={guardianSetting.phone}
                  />
                </div>

                {/* Consent toggles */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    Consent Preferences
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    These settings control how your child&apos;s information is used.
                  </p>
                  <div className="mt-3 space-y-3">
                    <ConsentToggle
                      guardianId={guardianSetting.guardianId}
                      consentType="media"
                      label="Media Consent"
                      description="Allow the school to publish photos and videos of your child in portfolios and communications."
                      initialValue={guardianSetting.mediaConsent}
                    />
                    <ConsentToggle
                      guardianId={guardianSetting.guardianId}
                      consentType="directory"
                      label="Directory Consent"
                      description="Allow your family to be included in the school directory shared with other families."
                      initialValue={guardianSetting.directoryConsent}
                    />
                  </div>
                </div>

                {/* Pickup status (read-only) */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    Pickup Authorization
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {guardianSetting.pickupAuthorized
                      ? 'You are authorized to pick up this child.'
                      : 'You are not currently authorized for pickup. Contact the school to update.'}
                  </p>
                  <div className="mt-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        guardianSetting.pickupAuthorized
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {guardianSetting.pickupAuthorized ? 'Authorized' : 'Not Authorized'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}