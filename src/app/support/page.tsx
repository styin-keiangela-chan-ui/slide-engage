import Link from 'next/link';
import Navbar from '@/components/ui/Navbar';

export default function SupportPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-64px)] bg-[#F4F7F4] px-5 py-8">
        <section className="mx-auto max-w-3xl rounded-lg border border-[#E2EBE6] bg-white p-7">
          <h1 className="text-2xl font-extrabold">Slide Engage Support</h1>
          <p className="mt-4 text-sm leading-relaxed text-[#6B7B8D]">
            Need help installing the PowerPoint add-in or running a live session? Start with the guided installation page.
          </p>
          <Link href="/addin-install" className="mt-5 inline-flex rounded-lg bg-[#2D8A4E] px-4 py-2 text-sm font-bold text-white">
            Open install guide
          </Link>
        </section>
      </main>
    </>
  );
}
