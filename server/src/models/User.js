import mongoose, { Schema, model } from 'mongoose';

// Node ESM does not expose a named `models` export from mongoose
// (verified: `import('mongoose')` has Schema/model but no `models`).
// The compiled-model registry lives on the default export object.
const { models } = mongoose;
import bcrypt from 'bcrypt';

// StoryBuilder User — SPEC §1. SPEC §5 model:
// _id, name, email (unique), passwordHash (null if Google-only),
// isEmailVerified, googleId (null if password-only), avatarUrl, aiUsage, timestamps
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, default: null },
    isEmailVerified: { type: Boolean, default: false },
    googleId: { type: String, default: null, sparse: true },
    avatarUrl: { type: String, default: null },
    aiUsage: {
      calls: {
        type: [
          {
            at: { type: Date, default: Date.now },
            storyId: { type: Schema.Types.ObjectId, default: null },
            units: { type: Number, default: 1 },
          },
        ],
        default: [],
      },
      dayTokens: { type: Number, default: 0 },
      dayKey: { type: String, default: '' },
      dayBudgetExceededAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

// Hopeful/heroic hash rounds per SPEC §5.1 ("bcrypt hash(password, 12)")
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('passwordHash') || !this.passwordHash) {
    return next();
  }
  try {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
    return next();
  } catch (err) {
    return next(err);
  }
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash || '');
};

// Hide sensitive fields from JSON output (spec: no secret leaks)
userSchema.set('toJSON', {
  versionKey: false,
  transform(doc, ret) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

userSchema.set('toObject', { versionKey: false });

// Reuse a previously-compiled model (module re-imports in tests must not
// recompile — Mongoose throws `Cannot overwrite model once compiled`).
export const User = models.User || model('User', userSchema);
export default User;
