import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Feather, Play, Pause, ChevronRight } from 'lucide-react';

interface BookPageData {
  chapter: string;
  sub: string;
  pageLeft: number;
  pageRight: number;
  dropCap: string;
  title: string;
  leftLines: string[];
  rightLines: string[];
  choiceA: string;
  choiceB: string;
}

const BOOK_PAGES: BookPageData[] = [
  {
    chapter: 'Ch. I · Genesis',
    sub: 'Vol. 1',
    pageLeft: 12,
    pageRight: 13,
    dropCap: 'I',
    title: 'The Living Manuscript',
    leftLines: [
      'n the quiet chambers between thought and ink, every world begins with a single choice.',
      'The stars aligned over the citadel of Oakhaven as the chronicle began to write itself onto parchment.',
    ],
    rightLines: [
      '“Step through the obsidian gateway,” whispered the archivist.',
      'A warm breeze rustled the golden leaves of the elder tree, scattering luminous embers into the night.',
    ],
    choiceA: 'Follow the silver trail into the grove',
    choiceB: 'Ascend the spire toward the observatory',
  },
  {
    chapter: 'Ch. II · The Crossroads',
    sub: 'Vol. 1',
    pageLeft: 14,
    pageRight: 15,
    dropCap: 'T',
    title: 'Branching Fates',
    leftLines: [
      'hrough the mist, two arches stood carved from ancient basalt.',
      'Each choice carved a new branch into reality, shifting the destiny of all who wandered this realm.',
    ],
    rightLines: [
      'The guild herald bowed low, offering the sealed wax scroll.',
      '“Your decision here will echo through five kingdoms before the equinox arrives.”',
    ],
    choiceA: 'Break the seal and read the prophecy',
    choiceB: 'Hand the dispatch to the silent sentinel',
  },
  {
    chapter: 'Ch. III · The Sovereign Word',
    sub: 'Vol. 1',
    pageLeft: 16,
    pageRight: 17,
    dropCap: 'A',
    title: 'Ink & Eternity',
    leftLines: [
      's words flowed from the feather quill, characters drew breath and stepped into the light.',
      'No story here is set in stone; it breathes with every reader who turns this very page.',
    ],
    rightLines: [
      'The citadel bells struck midnight, echoing across the starlit fjord.',
      'Now the author paused, ink shimmering with unwritten chapters waiting for the dawn.',
    ],
    choiceA: 'Bind the grimoire with celestial gold',
    choiceB: 'Set sail for the uncharted archipelagos',
  },
];

export function BookReadingAnimation() {
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  // Auto page-turning effect to simulate reading
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      turnPage();
    }, 4200);

    return () => clearInterval(interval);
  }, [isPlaying, currentPage]);

  const turnPage = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    setTimeout(() => {
      setCurrentPage((prev) => (prev + 1) % BOOK_PAGES.length);
      setIsFlipping(false);
    }, 900);
  };

  const current = BOOK_PAGES[currentPage];
  const next = BOOK_PAGES[(currentPage + 1) % BOOK_PAGES.length];

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Floating Stardust & Magical Reading Sparkles */}
      <div className="pointer-events-none absolute -top-12 flex items-center justify-center gap-10">
        <motion.span
          animate={{ y: [-4, -28, -4], opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          className="text-xs text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.6)]"
        >
          ✦
        </motion.span>
        <motion.span
          animate={{ y: [-6, -34, -6], opacity: [0.2, 0.9, 0.2], scale: [0.9, 1.3, 0.9] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="text-sm text-indigo-300 drop-shadow-[0_0_8px_rgba(165,180,252,0.6)]"
        >
          ✧
        </motion.span>
        <motion.span
          animate={{ y: [-2, -26, -2], opacity: [0.4, 1, 0.4], scale: [0.7, 1.1, 0.7] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="text-xs text-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,0.6)]"
        >
          ✦
        </motion.span>
      </div>

      {/* Atmospheric Ambient Reader Glow */}
      <div className="pointer-events-none absolute -inset-8 rounded-full bg-gradient-to-r from-indigo-400/15 via-purple-400/10 to-cyan-400/10 blur-3xl" />

      {/* 3D Realistic Open Book Construction */}
      <div
        className="relative py-2"
        style={{
          perspective: '1600px',
        }}
      >
        {/* Desk Cast Shadow */}
        <div className="absolute -bottom-6 left-6 right-6 h-10 rounded-[50%] bg-black/60 blur-xl" />

        {/* Hardcover Outer Binding Frame with Depth */}
        <div className="relative flex h-[290px] w-[460px] rounded-xl border border-amber-900/40 bg-gradient-to-b from-[#1c1f2e] via-[#141724] to-[#0d101b] p-3 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_50px_rgba(99,102,241,0.2)]">
          {/* Gold Filigree Corner Ornaments */}
          <div className="absolute left-1.5 top-1.5 h-3.5 w-3.5 border-l-2 border-t-2 border-amber-400/50 rounded-tl-sm" />
          <div className="absolute right-1.5 top-1.5 h-3.5 w-3.5 border-r-2 border-t-2 border-amber-400/50 rounded-tr-sm" />
          <div className="absolute bottom-1.5 left-1.5 h-3.5 w-3.5 border-b-2 border-l-2 border-amber-400/50 rounded-bl-sm" />
          <div className="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 border-b-2 border-r-2 border-amber-400/50 rounded-br-sm" />

          {/* Book Spine Stitching at Top and Bottom */}
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-2.5 w-8 rounded-full bg-amber-600/70 border border-amber-300/40" />
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-2.5 w-8 rounded-full bg-amber-600/70 border border-amber-300/40" />

          {/* ── Left Page Stack (Left Open Page) ── */}
          <div className="relative flex-1 rounded-l-md border-r border-[#d8cfbe] bg-gradient-to-br from-[#fcf9f2] via-[#f7f2e7] to-[#ede4d4] p-4 text-[#1a1f2c] shadow-[inset_4px_0_8px_rgba(0,0,0,0.06),-3px_0_6px_rgba(0,0,0,0.3)]">
            {/* Page header */}
            <div className="flex items-center justify-between border-b border-[#e5dccb] pb-1.5 text-[0.5625rem] font-mono tracking-widest text-[#726a5c]">
              <span className="font-semibold uppercase">{current.chapter}</span>
              <span>{current.sub}</span>
            </div>

            {/* Illuminated Drop Cap & Opening Paragraph */}
            <div className="mt-3">
              <div className="float-left mr-2.5 flex h-9 w-9 items-center justify-center rounded-md bg-indigo-950 font-serif text-lg font-bold text-amber-300 shadow-md ring-1 ring-amber-400/30">
                {current.dropCap}
              </div>
              <p className="font-serif text-[0.6875rem] font-medium leading-relaxed text-[#232938]">
                {current.leftLines[0]}
              </p>
            </div>

            {/* Secondary lines with subtle reading eye highlight */}
            <div className="mt-3 relative space-y-1.5">
              <p className="font-serif text-[0.625rem] leading-relaxed text-[#3d4558]">
                {current.leftLines[1]}
              </p>
              {/* Animated soft reading line highlight */}
              <motion.div
                animate={{ width: ['0%', '100%', '0%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="h-[1.5px] rounded-full bg-indigo-500/25 blur-[0.5px]"
              />
            </div>

            {/* Bottom Footer Details */}
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between border-t border-[#e8dfcf] pt-1.5 text-[0.5625rem] font-mono text-[#8a8070]">
              <div className="flex items-center gap-1">
                <Feather className="h-3 w-3 text-indigo-700/70" />
                <span className="tracking-wider">Story Builder Atelier</span>
              </div>
              <span>p. {current.pageLeft}</span>
            </div>
          </div>

          {/* ── Center Book Gutter & Spine Binding Crease ── */}
          <div className="relative z-30 w-3.5 bg-gradient-to-r from-[#171a26] via-[#090b12] to-[#171a26] shadow-[inset_0_0_8px_rgba(0,0,0,0.85)]">
            {/* Hanging Golden Silk Bookmark Ribbon */}
            <div className="absolute left-1/2 -top-1 -translate-x-1/2 w-2 h-[296px] rounded-b-[2px] bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 shadow-[1px_2px_6px_rgba(0,0,0,0.4)] pointer-events-none">
              <div className="absolute -bottom-2 left-0 right-0 h-2 bg-amber-700 [clip-path:polygon(0_0,100%_0,50%_100%)]" />
            </div>
          </div>

          {/* ── Right Page Container with Underneath Layer & Turning Page ── */}
          <div className="relative flex-1 rounded-r-md bg-gradient-to-bl from-[#fcf9f2] via-[#f7f2e7] to-[#ede4d4] p-4 text-[#1a1f2c] shadow-[inset_-4px_0_8px_rgba(0,0,0,0.06),3px_0_6px_rgba(0,0,0,0.3)] overflow-hidden">
            {/* Underneath Content (Destination Page waiting below) */}
            <div className="flex items-center justify-between border-b border-[#e5dccb] pb-1.5 text-[0.5625rem] font-mono tracking-widest text-[#726a5c]">
              <span className="font-semibold uppercase">{next.chapter}</span>
              <span>p. {next.pageRight}</span>
            </div>

            <div className="mt-3">
              <p className="font-serif text-[0.6875rem] font-medium leading-relaxed text-indigo-950">
                {next.rightLines[0]}
              </p>
              <p className="mt-2 font-serif text-[0.625rem] leading-relaxed text-[#3d4558]">
                {next.rightLines[1]}
              </p>

              {/* Interactive Branching Choices Preview */}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-1.5 rounded-md border border-indigo-200/90 bg-indigo-50/90 px-2.5 py-1 text-[0.5625rem] font-sans font-medium text-indigo-900 shadow-sm">
                  <span className="font-bold text-indigo-600">A &rarr;</span>
                  <span className="truncate">{next.choiceA}</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-md border border-cyan-200/90 bg-cyan-50/90 px-2.5 py-1 text-[0.5625rem] font-sans font-medium text-cyan-900 shadow-sm">
                  <span className="font-bold text-cyan-600">B &rarr;</span>
                  <span className="truncate">{next.choiceB}</span>
                </div>
              </div>
            </div>

            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between border-t border-[#e8dfcf] pt-1.5 text-[0.5625rem] font-mono text-[#8a8070]">
              <span className="tracking-wider">Choice Path</span>
              <span>✦</span>
            </div>

            {/* ── Active Turning Page (Leaves right, flips over spine to left) ── */}
            <AnimatePresence mode="wait">
              {isFlipping && (
                <motion.div
                  key={`flip-${currentPage}`}
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: -180 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.85, ease: [0.45, 0.05, 0.55, 0.95] }}
                  className="absolute inset-0 rounded-r-md bg-gradient-to-l from-[#faf6ed] via-[#f3ecdc] to-[#e6dcc7] p-4 text-[#1a1f2c] shadow-[-16px_0_24px_rgba(0,0,0,0.35)] origin-left"
                  style={{
                    transformStyle: 'preserve-3d',
                    backfaceVisibility: 'hidden',
                  }}
                >
                  <div className="flex items-center justify-between border-b border-[#e5dccb] pb-1 text-[0.5625rem] font-mono tracking-widest text-[#726a5c]">
                    <span className="font-semibold uppercase">{current.chapter}</span>
                    <span>p. {current.pageRight}</span>
                  </div>

                  <div className="mt-3">
                    <p className="font-serif text-[0.6875rem] font-medium leading-relaxed text-indigo-950">
                      {current.rightLines[0]}
                    </p>
                    <p className="mt-2 font-serif text-[0.625rem] leading-relaxed text-[#3d4558]">
                      {current.rightLines[1]}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-1.5 text-indigo-600">
                    <Sparkles className="h-3.5 w-3.5 animate-spin text-indigo-500" style={{ animationDuration: '4s' }} />
                    <span className="font-serif text-[0.5625rem] italic text-[#635a4b]">Turning page...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Reading Controls & Ambient Status Bar (Clean Light Reader X Style) ── */}
      <div className="mt-6 flex w-full max-w-[460px] items-center justify-between rounded-xl border border-slate-200/90 bg-white/95 px-4 py-2.5 text-xs shadow-lg shadow-slate-200/60 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600" />
          </span>
          <div className="flex flex-col">
            <span className="font-mono text-[0.6875rem] font-semibold text-slate-800">
              {current.title}
            </span>
            <span className="font-mono text-[0.5625rem] text-slate-500">
              Page {current.pageLeft}&ndash;{current.pageRight} of 240
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.6875rem] text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
            title={isPlaying ? 'Pause reading auto-flip' : 'Resume reading auto-flip'}
            aria-label={isPlaying ? 'Pause reading' : 'Play reading'}
          >
            {isPlaying ? (
              <>
                <Pause className="h-3 w-3 text-indigo-600" />
                <span>Reading</span>
              </>
            ) : (
              <>
                <Play className="h-3 w-3 text-emerald-600" />
                <span>Paused</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={turnPage}
            disabled={isFlipping}
            className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[0.6875rem] font-medium text-indigo-700 transition-all hover:bg-indigo-100 hover:text-indigo-900 disabled:opacity-50"
            aria-label="Turn book page"
          >
            <span>Flip Page</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
