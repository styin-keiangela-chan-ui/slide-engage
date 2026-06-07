import { redirect } from 'next/navigation';

export default function LecturerDashboardRedirect() {
  redirect('/lecturer/events');
}
