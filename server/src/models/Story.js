import mongoose, { Schema, model } from 'mongoose';

// Node ESM does not expose a named `models` export from mongoose
// (verified: `import('mongoose')` has Schema/model but no `models`).
// The compiled-model registry lives on the default export object.
const { models } = mongoose;

// StoryBuilder Story — SPEC §1 / §2.4 (Phase 5, TICKET-41).
// Fields: userId (owner, indexed), title (1..120), premise (10..5000),
// genre/tone/targetAudience/lengthTarget, pov, structureType
// (single|linear|branching), generationMode (full-ai|ai-enhanced),
// characters[] (copied-in character refs), coverImageUrl, disclaimerText,
// status (draft|complete), isPublic, shareToken (unique-sparse), totalChapters
// (single ⇒ 1), wordCount, version (optimistic-concurrency guard).
const storySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    premise: { type: String, required: true, trim: true, minlength: 10, maxlength: 5000 },
    genre: { type: String, trim: true, minlength: 1, maxlength: 80, default: 'general' },
    tone: { type: String, trim: true, minlength: 1, maxlength: 80, default: 'neutral' },
    targetAudience: { type: String, trim: true, minlength: 1, maxlength: 80, default: 'general' },
    lengthTarget: { type: String, trim: true, maxlength: 120, default: 'medium' },
    pov: { type: String, enum: ['1st', '2nd', '3rd'], required: true },
    structureType: {
      type: String,
      enum: ['single', 'linear', 'branching'],
      required: true,
    },
    generationMode: {
      type: String,
      enum: ['full-ai', 'ai-enhanced'],
      required: true,
    },
    characters: { type: [Schema.Types.ObjectId], ref: 'Character', default: [] },
    coverImageUrl: { type: String, default: null },
    disclaimerText: { type: String, trim: true, maxlength: 2000, default: '' },
    status: { type: String, enum: ['draft', 'complete'], default: 'draft' },
    isPublic: { type: Boolean, default: false },
    shareToken: {
      type: String,
      default: null,
      // Unique on real tokens only. Drafts all store null, so a partial filter
      // on string values is required (sparse alone — or mixed — still indexes
      // null and would reject the second draft).
      index: {
        unique: true,
        partialFilterExpression: { shareToken: { $type: 'string' } },
      },
    },
    // single ⇒ exactly one chapter from the start; linear/branching start empty.
    totalChapters: {
      type: Number,
      default: function totalChaptersDefault() {
        return this.structureType === 'single' ? 1 : 0;
      },
    },
    wordCount: { type: Number, default: 0 },
    version: { type: Number, default: 1 },
  },
  { timestamps: true },
);

storySchema.set('toJSON', { versionKey: false });
storySchema.set('toObject', { versionKey: false });

// Reuse a previously-compiled model (module re-imports in tests must not
// recompile — Mongoose throws `Cannot overwrite model once compiled`).
export const Story = models.Story || model('Story', storySchema);
export default Story;
