import { redirect } from 'next/navigation';

export default function LecturerSettingsRedirect() {
  redirect('/lecturer/events');
}
