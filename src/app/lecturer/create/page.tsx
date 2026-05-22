import { redirect } from 'next/navigation';

export default function LecturerCreateRedirect() {
  redirect('/lecturer/events');
}
