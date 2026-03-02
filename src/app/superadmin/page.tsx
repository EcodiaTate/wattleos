// src/app/(superadmin)/page.tsx
import { redirect } from 'next/navigation';

export default function SuperAdminRoot() {
  redirect('/superadmin/tenants');
}
