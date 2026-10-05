import mongoose, { Schema, model } from 'mongoose';

const { models } = mongoose;

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

const choiceSchema = new Schema(
  {
    label: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    targetNodeId: { type: Schema.Types.ObjectId, ref: 'BranchNode', default: null },
  },
  { _id: true },
);

const branchNodeSchema = new Schema(
  {
    storyId: { type: Schema.Types.ObjectId, ref: 'Story', required: true, index: true },
    title: { type: String, trim: true, maxlength: 200, default: '' },
    content: { type: String, default: '' },
    summary: { type: String, default: '' },
    choices: { type: [choiceSchema], default: [] },
    isStart: { type: Boolean, default: false },
    isEnding: { type: Boolean, default: false },
    parentId: { type: Schema.Types.ObjectId, ref: 'BranchNode', default: null },
    isAIGenerated: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
    versions: { type: [contentSnapshotSchema], default: [] },
  },
  { timestamps: true },
);

branchNodeSchema.set('toJSON', { versionKey: false });
branchNodeSchema.set('toObject', { versionKey: false });

export const BranchNode = models.BranchNode || model('BranchNode', branchNodeSchema);
export default BranchNode;
