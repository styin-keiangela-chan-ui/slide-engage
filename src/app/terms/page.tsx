import Navbar from '@/components/ui/Navbar';

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-64px)] bg-[#F4F7F4] px-5 py-8">
        <section className="mx-auto max-w-3xl rounded-lg border border-[#E2EBE6] bg-white p-7">
          <h1 className="text-2xl font-extrabold">Terms of Use</h1>
          <p className="mt-4 text-sm leading-relaxed text-[#6B7B8D]">
            Slide Engage is a PowerPoint add-in for creating live classroom and presentation interactions. Lecturers are responsible for the content they create, the sessions they run, and any participant data they collect.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[#6B7B8D]">
            Do not use Slide Engage to collect sensitive personal information unless you have the required consent and organizational approval.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[#6B7B8D]">
            SlideEngage integrations for PowerPoint and Google Slides are provided to help lecturers create and present interactions from their existing presentation tools. Lecturers are responsible for ensuring they have permission to install add-ons and present participant content in their organization.
          </p>
        </section>
      </main>
    </>
  );
}
