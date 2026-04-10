import { useEffect, useMemo, useState } from 'react';

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

const commonCategories = Object.entries(assetsByCategory)
  .filter(([, images]) => images.length >= 3)
  .map(([category]) => category);

const oddCategories = Object.entries(assetsByCategory)
  .filter(([, images]) => images.length >= 1)
  .map(([category]) => category);

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

function createRound(): RoundState {
  if (commonCategories.length < 1 || oddCategories.length < 2) {
    throw new Error('At least two categories are required.');
  }

  const commonCategory = sampleUnique(commonCategories, 1)[0];
  const oddCategory = sampleUnique(
    oddCategories.filter((category) => category !== commonCategory),
    1,
  )[0];
  const commonImages = sampleUnique(assetsByCategory[commonCategory], 3);
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
  const [round, setRound] = useState<RoundState>(() => createRound());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    if (!result) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setRound(createRound());
      setSelectedId(null);
      setResult(null);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [result]);

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

  return (
    <main className={`app ${result ?? 'idle'}`}>
      <header className="hud">
        <p className="status">{statusText}</p>
        <p className="score">
          Score {score.correct} / {score.total}
        </p>
      </header>

      <section className="board" aria-label="odd one out board">
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
              <img src={card.imageUrl} alt={card.category} />
            </button>
          );
        })}
      </section>
    </main>
  );
}

export default App;
