import { ASSET_REGISTRY } from '../../public/asset-registry.js';
import { InMemoryVectorize, indexRegistryInVectorize, vectorSearch } from '../../src/modelRetrieval.ts';
import { createWorkersAIClient } from '../../src/clientWorkersAI.ts';
import { HELD_OUT_SET } from '../../test/modelRetrievalGolden.ts';

const ai = createWorkersAIClient();
const vectorizeIndex = new InMemoryVectorize(384);

console.log('Indexing registry in Vectorize with real BGE model...');
await indexRegistryInVectorize(ASSET_REGISTRY, vectorizeIndex, ai);

const zeroOverlap = HELD_OUT_SET.filter((p) => p.type === 'semantic_zero_overlap');

// 1. Unconstrained search
let unconstrainedHits = 0;
for (const item of zeroOverlap) {
  const res = await vectorSearch(item.query, vectorizeIndex, { registry: ASSET_REGISTRY, ai, limit: 10 });
  const top1 = res[0];
  const match = top1 && item.expected.some((exp) => top1.id.includes(exp) || (top1.entry?.design && top1.entry.design.includes(exp)));
  if (match) unconstrainedHits++;
}

// 2. Category-scoped search
let scopedHits = 0;
for (const item of zeroOverlap) {
  const targetCat = item.category || 'buildings';
  const res = await vectorSearch(item.query, vectorizeIndex, { registry: ASSET_REGISTRY, ai, category: targetCat, limit: 10 });
  const top1 = res[0];
  const match = top1 && item.expected.some((exp) => top1.id.includes(exp) || (top1.entry?.design && top1.entry.design.includes(exp)));
  if (match) scopedHits++;
  console.log(`[${item.id}] "${item.query}" (Cat: ${targetCat}) -> Top 1: ${top1 ? top1.id : 'NONE'} | Match: ${match}`);
}

console.log(`\nUnconstrained Zero-Overlap P@1: ${((unconstrainedHits / zeroOverlap.length) * 100).toFixed(1)}% (${unconstrainedHits}/${zeroOverlap.length})`);
console.log(`Category-Scoped Zero-Overlap P@1: ${((scopedHits / zeroOverlap.length) * 100).toFixed(1)}% (${scopedHits}/${zeroOverlap.length})`);
