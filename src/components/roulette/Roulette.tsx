import { useMemo, useRef, useState, type CSSProperties } from "react";
import "./roulette.css";
import type { RouletteItem } from "./rouletteItems";

type Props = {
  items: RouletteItem[];
  onResult?: (item: RouletteItem) => void;
};

export default function Roulette({ items, onResult }: Props) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const frameRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const fromRef = useRef(0);
  const toRef = useRef(0);
  const rotationRef = useRef(0);
  const resultIndexRef = useRef(0);

  const segmentAngle = items.length ? 360 / items.length : 0;
  const startOffset = -segmentAngle / 2;
  const gradientOffset = ((startOffset % 360) + 360) % 360;
  const colors = ["#ffe4ef", "#fff6d6", "#e7f6ff", "#e9f7e9", "#f3e9ff"];

  const segments = useMemo(() => {
    if (!items.length) return [];
    return items.map((item, index) => {
      const start = startOffset + segmentAngle * index;
      const end = start + segmentAngle;
      const center = start + segmentAngle / 2;
      return { item, start, end, center, color: colors[index % colors.length] };
    });
  }, [items, segmentAngle, startOffset]);

  const getIndexFromRotation = (value: number) => {
    if (!segmentAngle) return 0;
    const normalized = ((value % 360) + 360) % 360;
    const pointerAngle = (360 - normalized) % 360;
    const index =
      Math.floor((pointerAngle + segmentAngle / 2) / segmentAngle) % items.length;
    return index;
  };

  const getNearestIndex = (value: number) => {
    if (!segmentAngle) return 0;
    const normalized = ((value % 360) + 360) % 360;
    const pointerAngle = (360 - normalized) % 360;
    const index = Math.round(pointerAngle / segmentAngle) % items.length;
    return index;
  };

  const getSnappedRotation = (value: number, index: number) => {
    if (!segmentAngle) return value;
    const normalized = ((value % 360) + 360) % 360;
    const centerAngle = index * segmentAngle;
    const desiredNormalized = (360 - centerAngle + 360) % 360;
    let diff = desiredNormalized - normalized;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return value + diff;
  };

  const wheelStyle = useMemo(() => {
    if (!segments.length) {
      return { transform: `rotate(${rotation}deg)` };
    }
    const stops = segments
      .map((segment) => {
        const baseStart = segment.start - startOffset;
        const baseEnd = baseStart + segmentAngle;
        return `${segment.color} ${baseStart}deg ${baseEnd}deg`;
      })
      .join(", ");
    return {
      backgroundImage: `conic-gradient(from ${gradientOffset}deg, ${stops})`,
      transform: `rotate(${rotation}deg)`,
    };
  }, [segments, rotation, segmentAngle, startOffset, gradientOffset]);

  const selectResultIndex = () => {
    const rawWeights = items.map((item) => {
      const value = Number(
        item.probability.replace(/[^\d.]/g, "").trim()
      );
      return Number.isFinite(value) ? value : 0;
    });
    const total = rawWeights.reduce((sum, value) => sum + value, 0);
    if (total <= 0) {
      return Math.floor(Math.random() * items.length);
    }
    const pick = Math.random() * total;
    let cursor = 0;
    for (let index = 0; index < rawWeights.length; index += 1) {
      cursor += rawWeights[index];
      if (pick <= cursor) return index;
    }
    return rawWeights.length - 1;
  };

  const animate = (timestamp: number, duration: number) => {
    if (!startRef.current) startRef.current = timestamp;
    const elapsed = timestamp - startRef.current;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const nextRotation = fromRef.current + (toRef.current - fromRef.current) * eased;
    rotationRef.current = nextRotation;
    setRotation(nextRotation);

    if (progress < 1) {
      frameRef.current = requestAnimationFrame((time) =>
        animate(time, duration)
      );
      return;
    }

    setIsSpinning(false);
    startRef.current = 0;
    const index = getIndexFromRotation(rotationRef.current);
    resultIndexRef.current = index;
    const result = items[index];
    if (result) {
      alert(`결과: ${result.label}`);
      onResult?.(result);
    }
  };

  const startSpin = () => {
    if (isSpinning || !items.length) return;
    const resultIndex = selectResultIndex();
    resultIndexRef.current = resultIndex;
    const centerAngle = segments[resultIndex]?.center ?? 0;
    const desiredNormalized = (360 - centerAngle + 360) % 360;
    const currentNormalized = ((rotation % 360) + 360) % 360;
    const targetAngle = 360 * 4 + (desiredNormalized - currentNormalized);
    fromRef.current = rotation;
    toRef.current = rotation + targetAngle;
    setIsSpinning(true);
    startRef.current = 0;
    frameRef.current = requestAnimationFrame((time) => animate(time, 2600));
  };

  const stopSpin = () => {
    if (!isSpinning) return;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    startRef.current = 0;
    const index = getNearestIndex(rotationRef.current);
    const snappedRotation = getSnappedRotation(rotationRef.current, index);
    rotationRef.current = snappedRotation;
    setRotation(snappedRotation);
    resultIndexRef.current = index;
    setIsSpinning(false);
    const result = items[index];
    if (result) {
      alert(`결과: ${result.label}`);
      onResult?.(result);
    }
  };

  return (
    <div className="rm-roulette">
      <div className="rm-tooltip">
        <button
          className="rm-tooltip-btn"
          type="button"
          aria-label="확률표 보기"
        >
          ?
        </button>
        <div className="rm-tooltip-panel">
          <div className="rm-table">
            <div className="rm-table-header">
              <span>항목</span>
              <span>획득확률</span>
            </div>
            {items.map((item) => (
              <div className="rm-row" key={item.label}>
                <span className="rm-label">{item.label}</span>
                <span className="rm-probability">{item.probability}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="rm-stage">
        <div className="rm-wheel-wrap">
          <div className="rm-pointer" />
          <div className="rm-wheel" style={wheelStyle}>
            <div className="rm-separators">
              {items.map((_, index) => (
                <span
                  className="rm-separator"
                  key={`sep-${index}`}
                  style={
                    {
                      transform: `rotate(${
                        startOffset + index * segmentAngle - 90
                      }deg)`,
                    }
                  }
                />
              ))}
            </div>
            <ul className="rm-labels">
              {segments.map((segment) => (
                <li
                  key={segment.item.label}
                  style={
                    { "--angle": `${segment.center}deg` } as CSSProperties
                  }
                >
                  {segment.item.label}
                </li>
              ))}
            </ul>
            <div className="rm-center" />
          </div>
        </div>
      </div>

      <div className="rm-controls">
        <button
          className="primary-btn"
          type="button"
          onClick={startSpin}
          disabled={isSpinning}
        >
          룰렛 돌리기
        </button>
        <button
          className="secondary-btn"
          type="button"
          onClick={stopSpin}
          disabled={!isSpinning}
        >
          멈추기
        </button>
      </div>
    </div>
  );
}
