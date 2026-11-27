import type { ItemId } from '../Items/catalog.ts';
import type { QuestId } from '../Quests/quests.ts';

export type NoticeKey =
  | 'unavailableTrade' | 'needGold' | 'noStock' | 'unavailableRecipe' | 'needMaterials' | 'unfinishedQuest'
  | 'approachLandmark' | 'fullEnergy' | 'restoredEnergy' | 'waitForBite' | 'fishEscaped' | 'fishCaught'
  | 'moveCloser' | 'outOfEnergy' | 'selectTool' | 'castLine' | 'aimAtPond' | 'canRefilled'
  | 'oneMoreHit' | 'fencePickedUp' | 'chooseGrass' | 'fencePlaced' | 'soilTilled' | 'emptyPlot'
  | 'seedPlanted' | 'alreadyWatered' | 'aimCan' | 'emptyCan' | 'soilWatered' | 'tillInsideField' | 'wrongTool' | 'castCancelled';

export type Notice = NoticeKey
  | { kind: 'purchased' | 'sold' | 'harvested'; item: ItemId }
  | { kind: 'crafted' | 'gathered'; item: ItemId; count: number }
  | { kind: 'claimed'; quest: QuestId; reward: number };
