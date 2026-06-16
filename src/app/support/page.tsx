import Navbar from '@/components/ui/Navbar';

export default function SupportPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-64px)] bg-[#F4F7F4] px-5 py-8">
        <section className="mx-auto max-w-3xl rounded-lg border border-[#E2EBE6] bg-white p-7">
          <h1 className="text-2xl font-extrabold">Slide Engage Support</h1>
          <p className="mt-4 text-sm leading-relaxed text-[#6B7B8D]">
            Need help running a live session? Sign in to the lecturer portal, create an event, and share the event code or QR link with participants.
          </p>
        </section>
      </main>
    </>
  );
}
