'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { Event } from '@/lib/types';
import EventBuilderPage from '../page';

type SettingsSection = 'General' | 'Collaboration' | 'Privacy' | 'Features' | 'Customization' | 'Engage Labs BETA';

const sections: SettingsSection[] = ['General', 'Collaboration', 'Privacy', 'Features', 'Customization', 'Engage Labs BETA'];
const themeOptions = [
  { id: 'sandy-beige', label: 'Sandy beige', style: 'bg-[#F6EFE6]' },
  { id: 'royal-blue', label: 'Royal blue', style: 'bg-gradient-to-br from-[#274C9F] to-[#5A75D6]' },
  { id: 'white', label: 'White', style: 'bg-white border border-[#DADADA]' },
  { id: 'green', label: 'Green', style: 'bg-gradient-to-br from-[#168A3A] to-[#4BB45F]' },
  { id: 'space', label: 'Space', style: 'bg-gradient-to-br from-[#06111F] via-[#1B4B7A] to-[#B35C7D]' },
  { id: 'mountain', label: 'Mountain', style: 'bg-gradient-to-br from-[#A9D5F2] via-[#4D7B4A] to-[#D8D0B8]' },
  { id: 'city', label: 'New York', style: 'bg-gradient-to-br from-[#D8B98A] via-[#777] to-[#1F2937]' },
];

function toDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10);
}

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative h-6 w-11 rounded-full transition ${enabled ? 'bg-[#2D8A4E]' : 'bg-[#9B9B9B]'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${enabled ? 'left-5' : 'left-0.5'}`} />
    </button>
  );
}

function ShieldAlertIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 text-[#444]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3.3 5.5 5.8v5.4c0 4.2 2.7 7.9 6.5 9.2 3.8-1.3 6.5-5 6.5-9.2V5.8L12 3.3Z" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
  );
}

export default function EventSettingsPage() {
  const params = useParams<{ eventId: string }>();
  const router = useRouter();
  const { lecturer, loading: authLoading, selectEvent } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [activeSection, setActiveSection] = useState<SettingsSection>('General');
  const [eventName, setEventName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [allowAnonymous, setAllowAnonymous] = useState(true);
  const [shareableLink, setShareableLink] = useState(false);
  const [hiddenFromSearch, setHiddenFromSearch] = useState(false);
  const [requireAuth, setRequireAuth] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [collaborationOpen, setCollaborationOpen] = useState(false);
  const [livePollsOpen, setLivePollsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [fixedPollOrder, setFixedPollOrder] = useState(false);
  const [voteCounter, setVoteCounter] = useState(true);
  const [pollResults, setPollResults] = useState(false);
  const [brandingOpen, setBrandingOpen] = useState(false);
  const [presentOpen, setPresentOpen] = useState(false);
  const [participantOpen, setParticipantOpen] = useState(false);
  const [mainLogo, setMainLogo] = useState('');
  const [partnerLogo, setPartnerLogo] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('royal-blue');
  const [customBackground, setCustomBackground] = useState('');
  const [joinViaQr, setJoinViaQr] = useState(true);
  const [displayedQuestions, setDisplayedQuestions] = useState(4);
  const [welcomeScreen, setWelcomeScreen] = useState(false);
  const [externalLinks, setExternalLinks] = useState(true);
  const [recentQuestionsDefault, setRecentQuestionsDefault] = useState(false);
  const [questionWithdrawal, setQuestionWithdrawal] = useState(true);
  const [separateDownvotes, setSeparateDownvotes] = useState(false);
  const [similarQuestionDetection, setSimilarQuestionDetection] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const eventId = params.eventId;
  const joiningLink = useMemo(() => {
    if (!event) return '';
    return `${appUrl()}/join?code=${event.event_code}`;
  }, [event]);

  useEffect(() => {
    if (!authLoading && !lecturer) router.push('/lecturer/login');
  }, [authLoading, lecturer, router]);

  useEffect(() => {
    if (!lecturer || !eventId) return;
    fetchEvent();
    loadVisualSettings();
  }, [lecturer, eventId]);

  function visualSettingsKey() {
    return `slideengage_event_visuals_${eventId}`;
  }

  function loadVisualSettings() {
    try {
      const stored = localStorage.getItem(visualSettingsKey());
      if (!stored) return;
      const parsed = JSON.parse(stored);
      setFixedPollOrder(parsed.fixedPollOrder ?? false);
      setVoteCounter(parsed.voteCounter ?? true);
      setPollResults(parsed.pollResults ?? false);
      setMainLogo(parsed.mainLogo || '');
      setPartnerLogo(parsed.partnerLogo || '');
      setSelectedTheme(parsed.selectedTheme || 'royal-blue');
      setCustomBackground(parsed.customBackground || '');
      setJoinViaQr(parsed.joinViaQr ?? true);
      setDisplayedQuestions(parsed.displayedQuestions ?? 4);
      setWelcomeScreen(parsed.welcomeScreen ?? false);
      setExternalLinks(parsed.externalLinks ?? true);
      setRecentQuestionsDefault(parsed.recentQuestionsDefault ?? false);
      setQuestionWithdrawal(parsed.questionWithdrawal ?? true);
      setSeparateDownvotes(parsed.separateDownvotes ?? false);
      setSimilarQuestionDetection(parsed.similarQuestionDetection ?? false);
    } catch {}
  }

  function saveVisualSettings() {
    localStorage.setItem(visualSettingsKey(), JSON.stringify({
      fixedPollOrder,
      voteCounter,
      pollResults,
      mainLogo,
      partnerLogo,
      selectedTheme,
      customBackground,
      joinViaQr,
      displayedQuestions,
      welcomeScreen,
      externalLinks,
      recentQuestionsDefault,
      questionWithdrawal,
      separateDownvotes,
      similarQuestionDetection,
    }));
  }

  async function fetchEvent() {
    const res = await fetch(`/api/events?id=${eventId}`, { cache: 'no-store' });
    const data = await res.json();
    if (data.event) {
      setEvent(data.event);
      setEventName(data.event.event_name || '');
      setStartDate(toDateInput(data.event.start_date || data.event.created_at));
      setEndDate(toDateInput(data.event.end_date || data.event.start_date || data.event.created_at));
      setAllowAnonymous(data.event.allow_anonymous ?? true);
      selectEvent(data.event);
    }
  }

  async function saveSettings() {
    if (!event) return;
    if (!eventName.trim()) {
      setMessage('Event name is required.');
      return;
    }
    if (endDate < startDate) {
      setMessage('End date must be after the start date.');
      return;
    }

    setSaving(true);
    setMessage('');
    const res = await fetch('/api/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: event.id,
        event_name: eventName.trim(),
        start_date: startDate,
        end_date: endDate,
        allow_anonymous: allowAnonymous,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setMessage(data.error || 'Unable to save event settings.');
      return;
    }

    setEvent(data.event);
    selectEvent(data.event);
    saveVisualSettings();
    setMessage('Saved.');
  }

  function handleImageUpload(file: File | undefined, callback: (value: string) => void) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => callback(String(reader.result || ''));
    reader.readAsDataURL(file);
  }

  async function inviteCohost() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setMessage('Enter the co-host Gmail.');
      return;
    }

    const res = await fetch('/api/events', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: event?.id, email }),
    });
    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || 'Unable to invite this Gmail.');
      return;
    }

    setMessage(`${data.lecturer.email} can be invited as a co-host.`);
    setInviteEmail('');
  }

  const searchItems = useMemo(() => [
    {
      title: 'Basic information',
      path: 'General > Basic information',
      section: 'General' as SettingsSection,
      icon: 'ⓘ',
    },
    {
      title: 'Add co-hosts',
      path: 'Collaboration > Add co-hosts',
      section: 'Collaboration' as SettingsSection,
      icon: '♙',
      action: () => setCollaborationOpen(true),
    },
    {
      title: 'Privacy settings',
      path: 'Privacy > Privacy settings',
      section: 'Privacy' as SettingsSection,
      icon: '♢',
      action: () => setPrivacyOpen(true),
    },
    {
      title: 'Live polls',
      path: 'Features > Live polls',
      section: 'Features' as SettingsSection,
      icon: '▥',
      action: () => setLivePollsOpen(true),
    },
    {
      title: 'Branding',
      path: 'Customization > Branding',
      section: 'Customization' as SettingsSection,
      icon: '◌',
      action: () => setBrandingOpen(true),
    },
    {
      title: 'Present mode',
      path: 'Customization > Present mode',
      section: 'Customization' as SettingsSection,
      icon: '▻',
      action: () => setPresentOpen(true),
    },
    {
      title: 'Participant mode',
      path: 'Customization > Participant mode',
      section: 'Customization' as SettingsSection,
      icon: '▯',
      action: () => setParticipantOpen(true),
    },
    {
      title: 'Engage Labs',
      path: 'Engage Labs BETA > Experimental features',
      section: 'Engage Labs BETA' as SettingsSection,
      icon: '♙',
    },
  ], []);

  const filteredSearchItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return searchItems;
    return searchItems.filter(item => `${item.title} ${item.path}`.toLowerCase().includes(query));
  }, [searchItems, searchQuery]);

  function jumpToSearchItem(item: (typeof searchItems)[number]) {
    setActiveSection(item.section);
    item.action?.();
    setSearchOpen(false);
    setSearchQuery('');
  }

  if (authLoading || !event) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return (
    <>
      <div className="h-screen overflow-hidden">
        <EventBuilderPage />
      </div>
      <main className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 text-[#1A1A2E]">
      <div className="flex h-[min(92vh,780px)] w-full max-w-[1240px] overflow-hidden rounded-[12px] bg-white shadow-2xl">
        <aside className="w-[230px] shrink-0 bg-[#F7F7F7]">
          <div className="px-7 py-7 text-lg font-semibold">Settings</div>
          {sections.map(section => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`flex w-full items-center justify-between px-7 py-3 text-left text-sm transition ${
                activeSection === section ? 'bg-[#ECECEC] font-bold text-[#1A1A2E]' : 'text-[#606060] hover:bg-[#F0F0F0]'
              }`}
            >
              <span>{section}</span>
              {section === 'Privacy' && <ShieldAlertIcon />}
            </button>
          ))}
        </aside>

        <section className="relative flex-1 overflow-y-auto">
          <header className="sticky top-0 z-10 flex h-16 items-start justify-end gap-4 bg-white/95 px-8 pt-4 text-[#999]">
            <div className="relative">
              {!searchOpen ? (
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="text-2xl leading-none hover:text-[#555]"
                  title="Search settings"
                >
                  ⌕
                </button>
              ) : (
                <div className="relative w-[260px]">
                  <label className="block text-xs font-medium text-[#777]">Search</label>
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full border-b-2 border-[#777] bg-transparent py-1 pr-8 text-sm text-[#1A1A2E] outline-none focus:border-[#2D8A4E]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute bottom-1 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-[#999] text-xs text-white"
                      title="Clear search"
                    >
                      ×
                    </button>
                  )}
                  <div className="absolute right-0 top-full z-20 max-h-[300px] w-[320px] overflow-y-auto rounded-b-[4px] border border-[#E5E5E5] bg-white py-1 shadow-xl">
                    {filteredSearchItems.length === 0 ? (
                      <div className="px-4 py-4 text-sm text-[#777]">No matching settings</div>
                    ) : (
                      filteredSearchItems.map(item => (
                        <button
                          key={`${item.section}-${item.title}`}
                          type="button"
                          onClick={() => jumpToSearchItem(item)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#F6F6F6]"
                        >
                          <span className="flex h-8 w-8 items-center justify-center text-xl text-[#8A8A8A]">{item.icon}</span>
                          <span>
                            <span className="block text-sm font-semibold text-[#222]">{item.title}</span>
                            <span className="block text-xs text-[#999]">{item.path}</span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => router.push(`/lecturer/events/${event.id}`)}
              className="text-3xl leading-none hover:text-[#555]"
              title="Close settings"
            >
              ×
            </button>
          </header>

          <div className="mx-auto max-w-[640px] px-8 pb-28">
          {activeSection === 'General' && (
            <>
              <SectionTitle icon="ⓘ" title="Basic information" />
              <Divider />

              <label className="mb-6 block">
                <span className="mb-1.5 block text-xs font-bold text-[#777]">SlideEngage name *</span>
                <input
                  value={eventName}
                  onChange={e => setEventName(e.target.value)}
                  className="w-full max-w-[480px] border-b-2 border-[#9A9A9A] bg-transparent py-1.5 text-base outline-none focus:border-[#2D8A4E]"
                />
              </label>

              <div className="mb-6 grid max-w-[480px] grid-cols-2 gap-10">
                <label>
                  <span className="mb-1.5 block text-xs font-bold text-[#777]">Start date *</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => {
                      setStartDate(e.target.value);
                      if (endDate < e.target.value) setEndDate(e.target.value);
                    }}
                    className="w-full border-b-2 border-[#555] bg-transparent py-1.5 text-base outline-none focus:border-[#2D8A4E]"
                  />
                </label>
                <label>
                  <span className="mb-1.5 block text-xs font-bold text-[#777]">End date *</span>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full border-b-2 border-[#9A9A9A] bg-transparent py-1.5 text-base outline-none focus:border-[#2D8A4E]"
                  />
                </label>
              </div>

              <ReadOnlyField label="SlideEngage code *" value={`# ${event.event_code}`} />
              <ReadOnlyField label="Joining link" value={joiningLink} copy />

              <button className="mb-8 text-sm font-bold text-[#555]">⌄ SHOW ADDITIONAL SETTINGS</button>
              <Divider />
            </>
          )}

          {activeSection === 'Collaboration' && (
            <>
              <SectionTitle icon="♙" title="Add co-hosts" />
              <p className="mb-8 pl-12 text-sm leading-6 text-[#606060]">
                Invite others to help you with managing this event.
              </p>
              <Divider />
              <button
                onClick={() => setCollaborationOpen(value => !value)}
                className="mb-5 flex w-full items-center justify-between text-left"
              >
                <div>
                  <div className="text-base font-bold">Shareable link</div>
                  <p className="mt-1 text-sm text-[#777]">Anyone with the link can help with this event.</p>
                </div>
                <span className="text-lg">{collaborationOpen ? '⌃' : '⌄'}</span>
              </button>

              {collaborationOpen && (
                <>
                  <div className="mb-6 flex items-start justify-between gap-8">
                    <div className="text-sm text-[#777]">Allow co-hosts to join using a shareable management link.</div>
                    <Toggle enabled={shareableLink} onChange={setShareableLink} />
                  </div>

                  <div className="mb-10 flex max-w-[560px] items-end gap-4">
                    <span className="pb-2 text-xl text-[#AAA]">♙</span>
                    <input
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="Registered Gmail"
                      className="min-w-0 flex-1 border-b-2 border-[#AAA] bg-transparent py-2 text-sm outline-none focus:border-[#2D8A4E]"
                    />
                    <button onClick={inviteCohost} className="rounded-full bg-[#6AAF7A] px-6 py-2 text-sm font-semibold text-white">
                      Invite
                    </button>
                  </div>
                  <div className="mb-8 rounded-[9px] bg-[#F4F7F4] px-4 py-3 text-xs font-semibold text-[#6B7B8D]">
                    The invite Gmail must already be registered and logged in to SlideEngage.
                  </div>
                </>
              )}
              <Divider />
            </>
          )}

          {activeSection === 'Privacy' && (
            <>
              <CollapsibleHeader
                icon={<ShieldAlertIcon />}
                title="Privacy settings"
                description="This event is set to public. If your event contains sensitive data, we recommend considering different security settings like passcode or participant SSO."
                open={privacyOpen}
                onToggle={() => setPrivacyOpen(value => !value)}
              />

              {privacyOpen && (
                <>
                  <Divider />
                  <SettingRow
                    title="Hidden from search"
                    description="Hide this event from search results. Entering full event code is required to join this event."
                    control={<Toggle enabled={hiddenFromSearch} onChange={setHiddenFromSearch} />}
                  />

                  <div className="mb-9 grid max-w-[650px] grid-cols-[1fr_260px] gap-8">
                    <div>
                      <div className="text-base font-bold">Participant privacy</div>
                      <p className="mt-4 text-base leading-7 text-[#777]">
                        Participants interact {allowAnonymous ? 'anonymously' : 'with their name'} with Polls and Q&A by default.
                      </p>
                    </div>
                    <select
                      value={allowAnonymous ? 'anonymous' : 'named'}
                      onChange={e => setAllowAnonymous(e.target.value === 'anonymous')}
                      className="h-11 border-b-2 border-[#AAA] bg-transparent text-base outline-none focus:border-[#2D8A4E]"
                    >
                      <option value="anonymous">Anonymous by default</option>
                      <option value="named">Named by default</option>
                    </select>
                  </div>

                  <SettingRow
                    title="Require authentication"
                    description="Protect your event via basic authentication options or single sign-on."
                    control={<Toggle enabled={requireAuth} onChange={setRequireAuth} />}
                  />
                </>
              )}
            </>
          )}

          {activeSection === 'Features' && (
            <>
              <CollapsibleHeader
                icon="▥"
                title="Live polls"
                description="Let your participants share their opinions and vote instantly from their devices."
                open={livePollsOpen}
                onToggle={() => setLivePollsOpen(value => !value)}
              />
              {livePollsOpen && (
                <>
                  <Divider />
                  <SettingRow
                    title="Fixed order of poll options"
                    description="Keep the same order of poll options as they were created in."
                    control={<Toggle enabled={fixedPollOrder} onChange={setFixedPollOrder} />}
                  />
                  <SettingRow
                    title="Vote counter"
                    description="Show how many participants voted in your poll."
                    control={<Toggle enabled={voteCounter} onChange={setVoteCounter} />}
                  />
                  <SettingRow
                    title="Poll results"
                    description="Show number of votes instead of percentage."
                    control={<Toggle enabled={pollResults} onChange={setPollResults} />}
                  />
                </>
              )}
            </>
          )}

          {activeSection === 'Customization' && (
            <>
              <CustomizationHeader
                icon="◌"
                title="Branding"
                description="Upload your logo and partner logos for your event."
                open={brandingOpen}
                onToggle={() => setBrandingOpen(value => !value)}
              />
              {brandingOpen && (
                <div className="mb-8 border-l border-[#E1E1E1] pl-8">
                  <UploadImageControl
                    title="Main logo"
                    description="Your main logo will be displayed in the upper left corner of Present mode. Recommended formats: JPG, PNG or GIF images at least 300 pixels wide."
                    image={mainLogo}
                    onUpload={file => handleImageUpload(file, setMainLogo)}
                    onRemove={() => setMainLogo('')}
                  />
                  <UploadImageControl
                    title="Partner logo"
                    description="Your partner logo will be displayed in rotation at the bottom of Present mode. Recommended formats: JPG, PNG or GIF images at least 200 pixels wide."
                    image={partnerLogo}
                    onUpload={file => handleImageUpload(file, setPartnerLogo)}
                    onRemove={() => setPartnerLogo('')}
                  />
                </div>
              )}
              <Divider />

              <CustomizationHeader
                icon="▻"
                title="Present mode"
                description="Choose your theme and customize it to your needs."
                open={presentOpen}
                onToggle={() => setPresentOpen(value => !value)}
              />
              {presentOpen && (
                <div className="mb-8 border-l border-[#E1E1E1] pl-8">
                  <h3 className="mb-4 text-base font-semibold text-[#555]">
                    Themes ({themeOptions.find(theme => theme.id === selectedTheme)?.label || 'Custom'} selected)
                  </h3>
                  <div className="mb-6 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
                    {themeOptions.map(theme => (
                      <button key={theme.id} type="button" onClick={() => setSelectedTheme(theme.id)} className="text-center">
                        <div className={`relative mx-auto mb-2 h-12 w-24 rounded-[7px] ${theme.style}`}>
                          {selectedTheme === theme.id && <span className="absolute inset-0 m-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#2D8A4E] text-white">✓</span>}
                        </div>
                        <div className="text-sm text-[#777]">{theme.label}</div>
                      </button>
                    ))}
                  </div>
                  <UploadImageControl
                    title="Custom background"
                    description="Upload your own Present mode background photo. This replaces the selected gallery theme for this event."
                    image={customBackground}
                    onUpload={file => {
                      setSelectedTheme('custom');
                      handleImageUpload(file, setCustomBackground);
                    }}
                    onRemove={() => {
                      setCustomBackground('');
                      setSelectedTheme('royal-blue');
                    }}
                  />
                  <SettingRow
                    title="Join SlideEngage via QR code"
                    description="Allow participants to join this event by scanning a QR code from Present mode with their phones."
                    control={<Toggle enabled={joinViaQr} onChange={setJoinViaQr} />}
                  />
                  <div className="mb-8">
                    <div className="mb-3 text-base font-bold">Audience Q&A</div>
                    <div className="mb-3 text-sm text-[#777]">Number of displayed questions</div>
                    <div className="flex gap-3">
                      {[3, 4, 5, 6].map(value => (
                        <button
                          key={value}
                          onClick={() => setDisplayedQuestions(value)}
                          className={`h-10 w-16 rounded-full border text-base font-semibold ${displayedQuestions === value ? 'border-[#2D8A4E] text-[#2D8A4E]' : 'border-[#E1E1E1] text-[#555]'}`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <Divider />

              <CustomizationHeader
                icon="▯"
                title="Participant mode"
                description="Customize view for your participants."
                open={participantOpen}
                onToggle={() => setParticipantOpen(value => !value)}
              />
              {participantOpen && (
                <div className="mb-8 border-l border-[#E1E1E1] pl-8">
                  <SettingRow title="Welcome screen" description="Show welcome screen to your participants." control={<Toggle enabled={welcomeScreen} onChange={setWelcomeScreen} />} />
                  <SettingRow title="External links" description="Add links to external resources that your participants can access from the side menu." control={<Toggle enabled={externalLinks} onChange={setExternalLinks} />} />
                  <button className="text-sm font-bold text-[#168A3A]">+ ADD A NEW LINK</button>
                </div>
              )}
            </>
          )}

          {activeSection === 'Engage Labs BETA' && (
            <>
              <div className="mb-6 flex items-center gap-4">
                <span className="text-lg">♙</span>
                <h1 className="text-xl font-extrabold">Engage Labs <span className="ml-1 align-super text-xs font-bold">BETA</span></h1>
              </div>
              <Divider />
              <p className="mb-8 text-base leading-7 text-[#555]">
                Engage Labs allows you to try and test experimental features. They may change or even disappear at any time. <span className="font-semibold text-[#168A3A] underline">Learn more</span>
              </p>

              <SettingRow
                title="Recent questions by default"
                description="All questions on participant devices will be sorted chronologically with the most recent on top."
                control={<Toggle enabled={recentQuestionsDefault} onChange={setRecentQuestionsDefault} />}
              />
              <SettingRow
                title="Question withdrawal"
                description="Allow participants to withdraw their questions anytime during the Q&A."
                control={<Toggle enabled={questionWithdrawal} onChange={setQuestionWithdrawal} />}
              />
              <SettingRow
                title="Separate score for Q&A downvotes"
                description="Show question downvotes separately in the participant view instead of a cumulative score."
                control={<Toggle enabled={separateDownvotes} onChange={setSeparateDownvotes} />}
              />
              <SettingRow
                title="Similar questions detection"
                description="Avoid duplicate questions. While typing a new question, participants can see whether a question with the same meaning has already been asked. Supports only English."
                control={<Toggle enabled={similarQuestionDetection} onChange={setSimilarQuestionDetection} />}
              />
              <Divider />
            </>
          )}

          </div>

          {message && (
            <div className={`absolute bottom-7 left-8 rounded-lg px-4 py-3 text-sm font-semibold ${message === 'Saved.' ? 'bg-[#EAF7EF] text-[#168A3A]' : 'bg-red-50 text-red-600'}`}>
              {message}
            </div>
          )}

          <button
            onClick={saveSettings}
            disabled={saving}
            className="absolute bottom-7 right-8 rounded-[10px] bg-[#168A3A] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#0f6f2d] disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </section>
      </div>
      </main>
    </>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <span className="text-lg">{icon}</span>
      <h1 className="text-xl font-extrabold">{title}</h1>
      <span className="ml-auto text-lg">⌃</span>
    </div>
  );
}

function CollapsibleHeader({
  icon,
  title,
  description,
  open,
  onToggle,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" onClick={onToggle} className="mb-7 flex w-full items-start gap-4 text-left">
      <span className="mt-1 text-lg">{icon}</span>
      <div className="flex-1">
        <div className="text-xl font-extrabold">{title}</div>
        {!open && <p className="mt-3 text-base leading-7 text-[#606060]">{description}</p>}
      </div>
      <span className="text-lg">{open ? '⌃' : '⌄'}</span>
    </button>
  );
}

function Divider() {
  return <div className="mb-7 h-px bg-[#E1E1E1]" />;
}

function ReadOnlyField({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  return (
    <label className="mb-6 block">
      <span className="mb-1.5 block text-xs font-bold text-[#777]">{label}</span>
      <div className="flex max-w-[480px] items-center gap-3 border-b-2 border-[#B5B5B5] py-1.5">
        <input value={value} readOnly className="min-w-0 flex-1 cursor-not-allowed bg-transparent text-base text-[#555] outline-none" />
        {copy && (
          <button onClick={() => navigator.clipboard.writeText(value)} className="text-base text-[#999]" title="Copy" type="button">
            ⧉
          </button>
        )}
      </div>
    </label>
  );
}

function SettingRow({ title, description, control }: { title: string; description: string; control: React.ReactNode }) {
  return (
    <div className="mb-9 flex max-w-[650px] items-start justify-between gap-8">
      <div>
        <div className="text-base font-bold">{title}</div>
        <p className="mt-1 max-w-[430px] text-base leading-7 text-[#777]">{description}</p>
      </div>
      {control}
    </div>
  );
}

function CustomizationHeader({
  icon,
  title,
  description,
  open,
  onToggle,
}: {
  icon: string;
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" onClick={onToggle} className="mb-7 flex w-full items-start gap-4 text-left">
      <span className="mt-1 text-lg">{icon}</span>
      <div className="flex-1">
        <div className="text-xl font-extrabold">{title}</div>
        {!open && <p className="mt-3 text-base leading-7 text-[#606060]">{description}</p>}
      </div>
      <span className="text-lg">{open ? '⌃' : '⌄'}</span>
    </button>
  );
}

function UploadImageControl({
  title,
  description,
  image,
  onUpload,
  onRemove,
}: {
  title: string;
  description: string;
  image: string;
  onUpload: (file: File | undefined) => void;
  onRemove: () => void;
}) {
  return (
    <div className="mb-8">
      <h3 className="mb-2 text-base font-semibold text-[#555]">{title}</h3>
      <p className="mb-4 max-w-[560px] text-sm leading-6 text-[#777]">{description}</p>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-28 items-center justify-center overflow-hidden rounded-[9px] border border-[#E1E1E1] bg-[#F7F7F7]">
          {image ? <img src={image} alt={title} className="h-full w-full object-cover" /> : <span className="text-xs font-semibold text-[#AAA]">No image</span>}
        </div>
        <label className="cursor-pointer rounded-full border border-[#D7E8DC] px-5 py-2 text-sm font-bold text-[#2D8A4E] hover:bg-[#EAF7EF]">
          Upload image
          <input type="file" accept="image/*" className="hidden" onChange={e => onUpload(e.target.files?.[0])} />
        </label>
        {image && (
          <button type="button" onClick={onRemove} className="text-sm font-semibold text-[#6B7B8D] hover:text-red-500">
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
