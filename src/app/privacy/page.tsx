import Navbar from '@/components/ui/Navbar';

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-64px)] bg-[#F4F7F4] px-5 py-8">
        <section className="mx-auto max-w-3xl rounded-lg border border-[#E2EBE6] bg-white p-7">
          <h1 className="text-2xl font-extrabold">Privacy Policy</h1>
          <p className="mt-4 text-sm leading-relaxed text-[#6B7B8D]">
            Slide Engage stores lecturer accounts, events, participants, questions, votes, and poll responses in Supabase so live classroom interactions can work. The add-in does not collect PowerPoint document contents except for the poll content a lecturer chooses to create or insert.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[#6B7B8D]">
            Student responses may be anonymous when the lecturer enables anonymous participation. Data is used only to run sessions, display live results, and provide analytics to the lecturer.
          </p>
        </section>
      </main>
    </>
  );
}
