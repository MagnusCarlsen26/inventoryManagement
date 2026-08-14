/**
 * How loudly a category should present itself.
 *
 * The tracker shows every frequency at once, and most of them are settled most of the
 * time — monthly items get bought in the first week and then sit done for three weeks.
 * Rendering all of them at equal weight makes the screen hard to scan, so each card is
 * toned by how much attention it actually deserves. Nothing is ever hidden, collapsed,
 * removed or reordered by this: only colour, opacity and shadow change.
 */

import { CategoryConfig } from './types';
import { daysLeft } from './cycles';

export type Attention = 'due' | 'active' | 'resting';

/**
 * Done-first: a category with nothing left to restock this cycle recedes, whatever its
 * length. Anything still outstanding holds full weight, and gets an accent once its
 * cycle is about to roll over (which is every day for a daily list, by definition).
 */
export function categoryAttention(
  total: number,
  checkedCount: number,
  cycleEndISO: string,
  now: Date = new Date(),
): Attention {
  if (total === 0 || checkedCount >= total) return 'resting';
  return daysLeft(cycleEndISO, now) <= 1 ? 'due' : 'active';
}

/** Every colour/elevation the category card needs, resolved for one attention level. */
export interface AttentionTone {
  /** progress ring stroke + its centre label */
  ring: string;
  icon: string;
  title: string;
  pillBg: string;
  pillFg: string;
  /** Ionicons name shown inside the cycle pill. */
  pillIcon: string;
  cardBg: string;
  shadowOpacity: number;
  elevation: number;
  /** hairline card border — carries the card shape once the shadow is gone. */
  border: string;
  /** left edge accent; transparent unless the cycle is about to reset. */
  rail: string;
  chevron: string;
  /** applied to the header only — the expanded item list always stays fully legible. */
  headerOpacity: number;
}

const RESTING_INK = '#A8B1BB';

/**
 * Token map in the shape of `syncMeta.ts`, so the component that renders a card holds
 * no branching of its own.
 */
export function attentionTone(attention: Attention, config: CategoryConfig): AttentionTone {
  if (attention === 'resting') {
    return {
      ring: '#C3CAD2',
      icon: RESTING_INK,
      title: '#7B8794',
      pillBg: '#F1F4F6',
      pillFg: '#9AA5B1',
      pillIcon: 'checkmark-circle',
      cardBg: '#FBFCFD',
      shadowOpacity: 0,
      elevation: 0,
      border: '#EDF0F3',
      rail: 'transparent',
      chevron: '#C6CCD3',
      headerOpacity: 0.62,
    };
  }

  if (attention === 'due') {
    return {
      ring: config.color,
      icon: config.color,
      title: '#1F2933',
      // Solid rather than tinted — the one card you should look at first.
      pillBg: config.color,
      pillFg: '#FFFFFF',
      pillIcon: 'alert-circle',
      cardBg: '#FFFFFF',
      shadowOpacity: 0.1,
      elevation: 3,
      border: 'transparent',
      rail: config.color,
      chevron: '#8C949E',
      headerOpacity: 1,
    };
  }

  // 'active' — the original, untouched look.
  return {
    ring: config.color,
    icon: config.color,
    title: '#1F2933',
    pillBg: config.tint,
    pillFg: config.color,
    pillIcon: 'refresh',
    cardBg: '#FFFFFF',
    shadowOpacity: 0.06,
    elevation: 2,
    border: 'transparent',
    rail: 'transparent',
    chevron: '#B0B7C0',
    headerOpacity: 1,
  };
}

/** Header summary counts, so the screen header and the cards can never disagree. */
export interface AttentionSummary {
  needAttention: number;
  due: number;
}

export function summarizeAttention(levels: Attention[]): AttentionSummary {
  return {
    needAttention: levels.filter((a) => a !== 'resting').length,
    due: levels.filter((a) => a === 'due').length,
  };
}
