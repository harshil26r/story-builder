import mongoose, { Schema, model } from 'mongoose';

// Node ESM does not expose a named `models` export from mongoose
// (verified: `import('mongoose')` has Schema/model but no `models`).
// The compiled-model registry lives on the default export object.
const { models } = mongoose;

// StoryBuilder Chapter — SPEC §1 (Phase 5, TICKET-41).
// storyId (owned story, indexed), order (1-based), title, content (plain-text
// prose), summary (AI consistency context), isAIGenerated, generatedAt,
// version (optimistic-concurrency guard), draftContent (ai-enhanced original
// draft), versions[] = ContentSnapshot { version, content, summary,
// modifiedAt, mode: 'ai'|'user' }.
const contentSnapshotSchema = new Schema(
  {
    version: { type: Number, required: true },
    content: { type: String, default: '' },
    summary: { type: String, default: '' },
    modifiedAt: { type: Date, default: Date.now },
    mode: { type: String, enum: ['ai', 'user'], required: true },
  },
  { _id: false },
);

const chapterSchema = new Schema(
  {
    storyId: { type: Schema.Types.ObjectId, ref: 'Story', required: true, index: true },
    order: { type: Number, required: true, min: 1, index: true },
    title: { type: String, trim: true, maxlength: 200, default: '' },
    content: { type: String, default: '' },
    summary: { type: String, default: '' },
    isAIGenerated: { type: Boolean, default: false },
    generatedAt: { type: Date, default: null },
    version: { type: Number, default: 1 },
    draftContent: { type: String, default: null },
    versions: { type: [contentSnapshotSchema], default: [] },
  },
  { timestamps: true },
);

chapterSchema.set('toJSON', { versionKey: false });
chapterSchema.set('toObject', { versionKey: false });

// Reuse a previously-compiled model (module re-imports in tests must not
// recompile — Mongoose throws `Cannot overwrite model once compiled`).
export const Chapter = models.Chapter || model('Chapter', chapterSchema);
export default Chapter;
