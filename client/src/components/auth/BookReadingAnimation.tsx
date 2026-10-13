import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Feather, Play, Pause, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import HTMLFlipBook from 'react-pageflip';

interface BookChapter {
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

const BOOK_PAGES: BookChapter[] = [
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

const AUTO_FLIP_MS = 4200;

function leftPage(ch: BookChapter, index: number): ReactNode {
  return (
    <div
      key={`page-left-${index}`}
      className="book-page relative h-full w-full overflow-hidden border-r border-[#d8cfbe] bg-gradient-to-br from-[#fcf9f2] via-[#f7f2e7] to-[#ede4d4] px-5 py-4 text-[#1a1f2c] shadow-[inset_-22px_0_28px_-20px_rgba(0,0,0,0.45)]"
    >
      <div className="flex items-center justify-between border-b border-[#e5dccb] pb-1.5 font-mono text-[0.5625rem] tracking-widest text-[#726a5c]">
        <span className="font-semibold uppercase">{ch.chapter}</span>
        <span>{ch.sub}</span>
      </div>

      <h3 className="mt-3 font-display text-sm font-bold tracking-tight text-[#1a1f2c]">
        {ch.title}
      </h3>

      <div className="mt-3">
        <div className="float-left mr-2.5 flex h-9 w-9 items-center justify-center rounded-md bg-indigo-950 font-serif text-lg font-bold text-amber-300 shadow-md ring-1 ring-amber-400/30">
          {ch.dropCap}
        </div>
        <p className="font-serif text-[0.6875rem] font-medium leading-relaxed text-[#232938]">
          {ch.leftLines[0]}
        </p>
      </div>

      <p className="mt-3 font-serif text-[0.625rem] leading-relaxed text-[#3d4558]">
        {ch.leftLines[1]}
      </p>

      <div className="absolute bottom-3 left-5 right-5 flex items-center justify-between border-t border-[#e8dfcf] pt-1.5 font-mono text-[0.5625rem] text-[#8a8070]">
        <div className="flex items-center gap-1">
          <Feather className="h-3 w-3 text-indigo-700/70" />
          <span className="tracking-wider">Story Builder Atelier</span>
        </div>
        <span>{ch.pageLeft}</span>
      </div>
    </div>
  );
}

function rightPage(ch: BookChapter, index: number): ReactNode {
  return (
    <div
      key={`page-right-${index}`}
      className="book-page relative h-full w-full overflow-hidden border-l border-[#d8cfbe] bg-gradient-to-bl from-[#fcf9f2] via-[#f7f2e7] to-[#ede4d4] px-5 py-4 text-[#1a1f2c] shadow-[inset_22px_0_28px_-20px_rgba(0,0,0,0.45)]"
    >
      <div className="flex items-center justify-between border-b border-[#e5dccb] pb-1.5 font-mono text-[0.5625rem] tracking-widest text-[#726a5c]">
        <span className="font-semibold uppercase">{ch.chapter}</span>
        <span>{ch.pageRight}</span>
      </div>

      <p className="mt-3 font-serif text-[0.6875rem] font-medium leading-relaxed text-indigo-950">
        {ch.rightLines[0]}
      </p>
      <p className="mt-2 font-serif text-[0.625rem] leading-relaxed text-[#3d4558]">
        {ch.rightLines[1]}
      </p>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center gap-1.5 rounded-md border border-indigo-200/90 bg-indigo-50/90 px-2.5 py-1 font-sans text-[0.5625rem] font-medium text-indigo-900 shadow-sm">
          <span className="font-bold text-indigo-600">A &rarr;</span>
          <span className="truncate">{ch.choiceA}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-cyan-200/90 bg-cyan-50/90 px-2.5 py-1 font-sans text-[0.5625rem] font-medium text-cyan-900 shadow-sm">
          <span className="font-bold text-cyan-600">B &rarr;</span>
          <span className="truncate">{ch.choiceB}</span>
        </div>
      </div>

      <div className="absolute bottom-3 left-5 right-5 flex items-center justify-between border-t border-[#e8dfcf] pt-1.5 font-mono text-[0.5625rem] text-[#8a8070]">
        <span className="tracking-wider">Choice Path</span>
        <span>✦</span>
      </div>
    </div>
  );
}

interface BookFlipHandle {
  pageFlip: () =>
    | {
        flipNext: (corner?: 'top' | 'bottom') => void;
        flipPrev: (corner?: 'top' | 'bottom') => void;
        flip: (page: number, corner?: 'top' | 'bottom') => void;
        getPageCount: () => number;
        getCurrentPageIndex: () => number;
      }
    | undefined;
}

export function BookReadingAnimation() {
  const bookRef = useRef<BookFlipHandle>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [spreadIndex, setSpreadIndex] = useState(0);

  const pages = useMemo<ReactNode[]>(
    () => BOOK_PAGES.flatMap((ch, i) => [leftPage(ch, i), rightPage(ch, i)]),
    [],
  );

  const flipNext = useCallback(() => {
    const pf = bookRef.current?.pageFlip();
    if (!pf) return;
    const lastSpread = pf.getPageCount() - 2;
    if (pf.getCurrentPageIndex() >= lastSpread) {
      pf.flip(0);
    } else {
      pf.flipNext();
    }
  }, []);

  const flipPrev = useCallback(() => {
    bookRef.current?.pageFlip()?.flipPrev();
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(flipNext, AUTO_FLIP_MS);
    return () => clearInterval(id);
  }, [isPlaying, flipNext]);

  const chapter = BOOK_PAGES[Math.min(Math.floor(spreadIndex / 2), BOOK_PAGES.length - 1)];

  return (
    <div className="relative flex w-full select-none flex-col items-center justify-center">
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

      {/* 3D Hardcover Binding Frame that holds the real StPageFlip book */}
      <div className="relative mx-auto w-full max-w-[520px]">
        {/* Desk Cast Shadow */}
        <div className="absolute -bottom-6 left-8 right-8 h-10 rounded-[50%] bg-black/50 blur-xl" />

        <div className="relative rounded-2xl border border-amber-900/40 bg-gradient-to-b from-[#1c1f2e] via-[#141724] to-[#0d101b] p-3 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_50px_rgba(99,102,241,0.2)]">
          {/* Gold filigree corner ornaments */}
          <div className="pointer-events-none absolute left-1.5 top-1.5 z-20 h-3.5 w-3.5 rounded-tl-sm border-l-2 border-t-2 border-amber-400/50" />
          <div className="pointer-events-none absolute right-1.5 top-1.5 z-20 h-3.5 w-3.5 rounded-tr-sm border-r-2 border-t-2 border-amber-400/50" />
          <div className="pointer-events-none absolute bottom-1.5 left-1.5 z-20 h-3.5 w-3.5 rounded-bl-sm border-b-2 border-l-2 border-amber-400/50" />
          <div className="pointer-events-none absolute bottom-1.5 right-1.5 z-20 h-3.5 w-3.5 rounded-br-sm border-b-2 border-r-2 border-amber-400/50" />

          <HTMLFlipBook
            ref={bookRef as never}
            width={240}
            height={320}
            size="stretch"
            minWidth={190}
            maxWidth={250}
            minHeight={250}
            maxHeight={340}
            drawShadow
            flippingTime={800}
            usePortrait
            startZIndex={0}
            autoSize
            maxShadowOpacity={0.4}
            showCover={false}
            mobileScrollSupport
            clickEventForward
            useMouseEvents
            swipeDistance={30}
            showPageCorners
            disableFlipByClick={false}
            startPage={0}
            onFlip={(e: { data: number }) => setSpreadIndex(e.data)}
            className="rounded-lg"
            style={{}}
          >
            {pages}
          </HTMLFlipBook>
        </div>
      </div>

      {/* Reading Controls & Ambient Status Bar */}
      <div className="mt-6 flex w-full max-w-[520px] items-center justify-between rounded-xl border border-slate-200/90 bg-white/95 px-4 py-2.5 text-xs shadow-lg shadow-slate-200/60 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600" />
          </span>
          <div className="flex flex-col">
            <span className="font-mono text-[0.6875rem] font-semibold text-slate-800">
              {chapter.title}
            </span>
            <span className="font-mono text-[0.5625rem] text-slate-500">
              Page {chapter.pageLeft}&ndash;{chapter.pageRight} of 240
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={flipPrev}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.6875rem] text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3 w-3" />
            <span>Prev</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPlaying((v) => !v)}
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
            onClick={flipNext}
            className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[0.6875rem] font-medium text-indigo-700 transition-all hover:bg-indigo-100 hover:text-indigo-900"
            aria-label="Next page"
          >
            <Sparkles className="h-3 w-3" />
            <span>Next</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
