import type { CSSProperties } from 'react';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';

type AssetMap = Record<string, string[]>;

type Card = {
  id: string;
  imageUrl: string;
  category: string;
  isOdd: boolean;
};

type RoundState = {
  cards: Card[];
  commonCategory: string;
  oddCategory: string;
  oddCardId: string;
};

type LayoutOption = {
  id: string;
  rows: number;
  columns: number;
};

type PreparedRound = {
  layoutId: string;
  round: RoundState;
};

const modules = import.meta.glob('../object_images/*/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const assetsByCategory = Object.entries(modules).reduce<AssetMap>((acc, [path, url]) => {
  const match = path.match(/object_images\/([^/]+)\//);

  if (!match) {
    return acc;
  }

  const category = match[1];
  acc[category] ??= [];
  acc[category].push(url);
  return acc;
}, {});

const oddCategories = Object.entries(assetsByCategory)
  .filter(([, images]) => images.length >= 1)
  .map(([category]) => category);

const layoutOptions: LayoutOption[] = [
  { id: '2x2', rows: 2, columns: 2 },
  { id: '2x3', rows: 2, columns: 3 },
  { id: '3x3', rows: 3, columns: 3 },
  { id: '3x4', rows: 3, columns: 4 },
  { id: '3x5', rows: 3, columns: 5 },
];

const commonCategoriesByLayout = Object.fromEntries(
  layoutOptions.map((layout) => {
    const requiredImageCount = layout.rows * layout.columns - 1;
    const categories = Object.entries(assetsByCategory)
      .filter(([, images]) => images.length >= requiredImageCount)
      .map(([category]) => category);

    return [layout.id, categories];
  }),
) as Record<string, string[]>;

const preloadedImageCache = new Map<string, Promise<void>>();

function sampleUnique<T>(items: T[], count: number): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function shuffle<T>(items: T[]): T[] {
  return sampleUnique(items, items.length);
}

function preloadImage(src: string): Promise<void> {
  const cached = preloadedImageCache.get(src);
  if (cached) {
    return cached;
  }

  const promise = new Promise<void>((resolve) => {
    const image = new Image();

    image.src = src;

    if (image.decode) {
      image
        .decode()
        .catch(() => undefined)
        .finally(() => resolve());
      return;
    }

    image.onload = () => resolve();
    image.onerror = () => resolve();
  });

  preloadedImageCache.set(src, promise);
  return promise;
}

async function preloadRound(round: RoundState): Promise<RoundState> {
  await Promise.all(round.cards.map((card) => preloadImage(card.imageUrl)));
  return round;
}

function createRound(layout: LayoutOption): RoundState {
  const imageCount = layout.rows * layout.columns;
  const commonImageCount = imageCount - 1;
  const commonCategories = commonCategoriesByLayout[layout.id];

  if (commonCategories.length < 1 || oddCategories.length < 2) {
    throw new Error('At least two categories are required.');
  }

  const commonCategory = sampleUnique(commonCategories, 1)[0];
  const oddCategory = sampleUnique(
    oddCategories.filter((category) => category !== commonCategory),
    1,
  )[0];
  const commonImages = sampleUnique(assetsByCategory[commonCategory], commonImageCount);
  const oddImage = sampleUnique(assetsByCategory[oddCategory], 1)[0];
  const oddCardId = `odd-${oddCategory}-${oddImage}`;

  const cards = shuffle<Card>([
    ...commonImages.map((imageUrl, index) => ({
      id: `common-${commonCategory}-${index}-${imageUrl}`,
      imageUrl,
      category: commonCategory,
      isOdd: false,
    })),
    {
      id: oddCardId,
      imageUrl: oddImage,
      category: oddCategory,
      isOdd: true,
    },
  ]);

  return {
    cards,
    commonCategory,
    oddCategory,
    oddCardId,
  };
}

function App() {
  const [layout, setLayout] = useState<LayoutOption>(layoutOptions[0]);
  const [round, setRound] = useState<RoundState>(() => createRound(layoutOptions[0]));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [isPreparing, setIsPreparing] = useState(false);
  const nextRoundRef = useRef<PreparedRound | null>(null);

  useEffect(() => {
    void preloadRound(round);
  }, [round]);

  useEffect(() => {
    let cancelled = false;
    const candidateRound = createRound(layout);

    void preloadRound(candidateRound).then((preparedRound) => {
      if (cancelled) {
        return;
      }

      nextRoundRef.current = {
        layoutId: layout.id,
        round: preparedRound,
      };
    });

    return () => {
      cancelled = true;
    };
  }, [layout, round]);

  const advanceRound = async (nextLayout: LayoutOption) => {
    setIsPreparing(true);

    const prepared =
      nextRoundRef.current?.layoutId === nextLayout.id
        ? nextRoundRef.current.round
        : await preloadRound(createRound(nextLayout));

    nextRoundRef.current = null;

    startTransition(() => {
      setRound(prepared);
      setSelectedId(null);
      setResult(null);
      setIsPreparing(false);
    });
  };

  useEffect(() => {
    if (!result) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void advanceRound(layout);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [layout, result]);

  const statusText = useMemo(() => {
    if (result === 'correct') {
      return '正解';
    }
    if (result === 'wrong') {
      return '不正解';
    }
    return '異なるものを1つ選んでください';
  }, [result]);

  const handleSelect = (card: Card) => {
    if (result) {
      return;
    }

    const isCorrect = card.isOdd;
    setSelectedId(card.id);
    setResult(isCorrect ? 'correct' : 'wrong');
    setScore((current) => ({
      correct: current.correct + (isCorrect ? 1 : 0),
      total: current.total + 1,
    }));
  };

  const handleLayoutChange = (nextLayout: LayoutOption) => {
    if (nextLayout.id === layout.id) {
      return;
    }

    setLayout(nextLayout);
    setSelectedId(null);
    setResult(null);
    void advanceRound(nextLayout);
  };

  return (
    <main className={`app ${result ?? 'idle'}`}>
      <header className="hud">
        <div className="hud-text">
          <p className="status">{statusText}</p>
          <p className="score">
            Score {score.correct} / {score.total}
          </p>
        </div>
        <div className="layout-picker" aria-label="layout selector">
          {layoutOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`layout-button${option.id === layout.id ? ' active' : ''}`}
              onClick={() => handleLayoutChange(option)}
            >
              {option.id}
            </button>
          ))}
        </div>
      </header>

      <section
        className={`board${isPreparing ? ' preparing' : ''}`}
        aria-label="odd one out board"
        style={
          {
            '--board-columns': layout.columns,
            '--board-rows': layout.rows,
          } as CSSProperties
        }
      >
        {round.cards.map((card) => {
          const isSelected = card.id === selectedId;
          const revealOdd = result === 'wrong' && card.id === round.oddCardId;

          return (
            <button
              key={card.id}
              type="button"
              className={[
                'card',
                isSelected ? `selected ${result}` : '',
                revealOdd ? 'reveal-odd' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => handleSelect(card)}
              aria-label={card.isOdd ? 'odd item' : 'common item'}
            >
              <img src={card.imageUrl} alt={card.category} loading="eager" decoding="async" />
            </button>
          );
        })}
      </section>
    </main>
  );
}

export default App;
