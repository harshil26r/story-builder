import { Schema, model, models } from 'mongoose';

// StoryBuilder Character — Phase 4 (Character CRUD).
// Fields: userId (owner, indexed), name (required 1-100), description (0-2000),
// voiceStyle (0-500), role (enum, default 'neutral'), avatarUrl (String|null),
// templateSource (ObjectId|null → Character), timestamps.
const characterSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    voiceStyle: { type: String, trim: true, maxlength: 500, default: '' },
    role: {
      type: String,
      enum: ['protagonist', 'antagonist', 'supporting', 'neutral'],
      default: 'neutral',
    },
    avatarUrl: { type: String, default: null },
    templateSource: { type: Schema.Types.ObjectId, ref: 'Character', default: null },
  },
  { timestamps: true }
);

characterSchema.set('toJSON', { versionKey: false });
characterSchema.set('toObject', { versionKey: false });

// Reuse a previously-compiled model (module re-imports in tests must not
// recompile — Mongoose throws `Cannot overwrite model once compiled`).
export const Character = models.Character || model('Character', characterSchema);
export default Character;