import mongoose, { Schema, model } from 'mongoose';

// Node ESM does not expose a named `models` export from mongoose
// (verified: `import('mongoose')` has Schema/model but no `models`).
// The compiled-model registry lives on the default export object.
const { models } = mongoose;

// StoryBuilder OtpToken — SPEC §1 / §5.
// Placeholder model (full semantics arrive in TICKET-22). Structure mirrors
// the authoritative contract: email (indexed), otpCodeHash (sha256), purpose,
// expiresAt (TTL index), attempts, timestamps.
const otpTokenSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otpCodeHash: { type: String, required: true },
    purpose: {
      type: String,
      enum: ['signup-verify', 'login', 'password-reset'],
      required: true,
    },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    // Transient registration payload for purpose 'signup-verify': { name,
    // passwordHash }. Only ever lives for the 10-min TTL — the User is created
    // only after the code is verified (SPEC §5 signup flow).
    data: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// TTL index on expiresAt — auto-deletes expired tokens (SPEC §5).
otpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Reuse a previously-compiled model (module re-imports in tests must not
// recompile — Mongoose throws `Cannot overwrite model once compiled`).
export const OtpToken = models.OtpToken || model('OtpToken', otpTokenSchema);
export default OtpToken;
