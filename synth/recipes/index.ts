import type { BedRecipe, OneShotRecipe } from '../types.ts';
import { homeRecipes } from './home.ts';
import { natureRecipes } from './nature.ts';
import { noiseRecipes } from './noise.ts';
import { oneShotRecipes } from './oneshots.ts';
import { toneRecipes } from './tones.ts';
import { waterRecipes } from './water.ts';
import { weatherRecipes } from './weather.ts';

export const allBeds: BedRecipe[] = [
  ...noiseRecipes,
  ...weatherRecipes,
  ...waterRecipes,
  ...natureRecipes,
  ...homeRecipes,
  ...toneRecipes,
];

export const allOneShots: OneShotRecipe[] = oneShotRecipes;
