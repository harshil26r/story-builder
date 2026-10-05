// StoryBuilder CharacterGroup — a named, user-curated collection of characters.
// Many-to-many with Character: membership lives on Character.groupIds (mirrors
// Story.characters) so a character can sit in many groups and a group holds
// many characters. Group names are unique per user.
import mongoose, { Schema, model } from 'mongoose';

const { models } = mongoose;

const characterGroupSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
  },
  { timestamps: true },
);

characterGroupSchema.index({ userId: 1, name: 1 }, { unique: true });

characterGroupSchema.set('toJSON', { versionKey: false });
characterGroupSchema.set('toObject', { versionKey: false });

export const CharacterGroup =
  models.CharacterGroup || model('CharacterGroup', characterGroupSchema);
export default CharacterGroup;
