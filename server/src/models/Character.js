import mongoose, { Schema, model } from 'mongoose';

// Node ESM does not expose a named `models` export from mongoose
// (verified: `import('mongoose')` has Schema/model but no `models`).
// The compiled-model registry lives on the default export object.
const { models } = mongoose;

// StoryBuilder Character (SPEC §1 Character + §2.3 CharacterInput).
// Ownership: userId (owner, indexed). The full character sheet mirrors the
// client `Character` type: name, age, gender, appearance, personality[],
// likes[], dislikes[], habits, backstory, role, avatarUrl, relationships[],
// voiceStyle, catchphrases[], arc, secretTrait, secretRevealChapter,
// isTemplate + internal description/templateSource.
const relationshipSchema = new Schema(
  {
    characterId: { type: Schema.Types.ObjectId, ref: 'Character', required: true },
    relationType: {
      type: String,
      enum: ['friend', 'rival', 'sibling', 'mentor', 'parent', 'spouse', 'enemy', 'secret-ally'],
      required: true,
    },
  },
  { _id: false },
);

const characterSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
    age: { type: Number, default: null },
    gender: { type: String, trim: true, maxlength: 80, default: '' },
    appearance: { type: String, trim: true, maxlength: 5000, default: '' },
    personality: { type: [String], maxlength: 12, default: [] },
    likes: { type: [String], maxlength: 12, default: [] },
    dislikes: { type: [String], maxlength: 12, default: [] },
    habits: { type: String, trim: true, maxlength: 2000, default: '' },
    backstory: { type: String, trim: true, maxlength: 5000, default: '' },
    role: {
      type: String,
      enum: ['protagonist', 'antagonist', 'side', 'mentor', 'supporting', 'neutral'],
      default: 'neutral',
    },
    avatarUrl: { type: String, default: null },
    relationships: { type: [relationshipSchema], default: [] },
    voiceStyle: { type: String, trim: true, maxlength: 500, default: '' },
    catchphrases: { type: [String], maxlength: 6, default: [] },
    arc: { type: String, trim: true, maxlength: 2000, default: '' },
    secretTrait: { type: String, trim: true, maxlength: 2000, default: '' },
    secretRevealChapter: { type: Number, default: null },
    isTemplate: { type: Boolean, default: false },
    groupIds: { type: [{ type: Schema.Types.ObjectId, ref: 'CharacterGroup' }], default: [] },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    templateSource: { type: Schema.Types.ObjectId, ref: 'Character', default: null },
  },
  { timestamps: true },
);

characterSchema.set('toJSON', { versionKey: false });
characterSchema.set('toObject', { versionKey: false });

// Reuse a previously-compiled model (module re-imports in tests must not
// recompile — Mongoose throws `Cannot overwrite model once compiled`).
export const Character = models.Character || model('Character', characterSchema);
export default Character;
