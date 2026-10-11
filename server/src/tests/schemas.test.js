import { describe, it, expect } from 'vitest';
import { signupSchema, storyCreateSchema, characterInputSchema } from '../validation/schemas.js';

describe('Joi validation schemas (TICKET-09)', () => {
  describe('signupSchema', () => {
    it('accepts a valid signup payload', () => {
      const { value, error } = signupSchema.validate({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        password: 'password1',
      });
      expect(error).toBeUndefined();
      expect(value.email).toBe('ada@example.com'); // lowercased
    });

    it('rejects a payload missing email with VALIDATION_ERROR semantics + fields', () => {
      const { error } = signupSchema.validate({
        name: 'Ada',
        password: 'password1',
      });
      expect(error).toBeDefined();
      expect(error.details.length).toBeGreaterThan(0);
      // The middleware maps Joi errors to { code:'VALIDATION_ERROR', fields:[{field,message}] }
      expect(error.details[0].path[0]).toBe('email');
    });

    it('rejects weak password (no letter or no number)', () => {
      const noLetter = signupSchema.validate({
        name: 'Ada',
        email: 'a@b.co',
        password: '12345678',
      });
      expect(noLetter.error).toBeDefined();
      const noNumber = signupSchema.validate({
        name: 'Ada',
        email: 'a@b.co',
        password: 'abcdefgh',
      });
      expect(noNumber.error).toBeDefined();
    });
  });

  describe('storyCreateSchema', () => {
    const valid = {
      title: 'The Clockwork Heart',
      premise: 'A clockmaker discovers a living brass heart that can restore the dead.',
      pov: '3rd',
      structureType: 'linear',
      generationMode: 'full-ai',
      characterIds: [],
    };
    it('accepts valid story create', () => {
      const { error } = storyCreateSchema.validate(valid);
      expect(error).toBeUndefined();
    });
    it('rejects premise shorter than 10 chars', () => {
      const { error } = storyCreateSchema.validate({ ...valid, premise: 'too short' });
      expect(error).toBeDefined();
      expect(error.details[0].path[0]).toBe('premise');
    });
    it('rejects an invalid structureType enum', () => {
      const { error } = storyCreateSchema.validate({ ...valid, structureType: 'open-world' });
      expect(error).toBeDefined();
    });
  });

  describe('characterInputSchema', () => {
    it('accepts a valid character', () => {
      const { error } = characterInputSchema.validate({
        name: 'Elias',
        gender: 'male',
        appearance: 'tall, gaunt',
        personality: ['stoic'],
        likes: ['watches'],
        dislikes: ['noise'],
        role: 'protagonist',
        relationships: [],
      });
      expect(error).toBeUndefined();
    });
    it('rejects personality with more than 12 items', () => {
      const many = Array.from({ length: 13 }, (_, i) => `trait ${i}`);
      const { error } = characterInputSchema.validate({
        name: 'Elias',
        gender: 'male',
        appearance: 'a',
        personality: many,
        likes: [],
        dislikes: [],
        role: 'side',
        relationships: [],
      });
      expect(error).toBeDefined();
    });
  });
});
